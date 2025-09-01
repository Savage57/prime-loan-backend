/**
 * Savings Application Service
 * Manages savings plans with interest calculations and penalties
 */
import { SavingsPlan } from '../infrastructure/models/SavingsPlan.model';
import { SavingsTransaction } from '../infrastructure/models/SavingsTransaction.model';
import { LedgerService } from '../../ledger/service';
import { DatabaseService } from '../../../shared/db';
import { UuidService } from '../../../shared/utils/uuid';
import { Money } from '../../../shared/utils/money';
import { saveIdempotentResponse } from '../../../shared/idempotency/middleware';

export interface CreatePlanParams {
  userId: string;
  planType: 'LOCKED' | 'FLEXIBLE';
  targetAmount?: number;
  durationDays?: number;
  interestRate: number;
  idempotencyKey: string;
}

export interface DepositParams {
  planId: string;
  userId: string;
  amount: number; // in naira
  idempotencyKey: string;
}

export interface WithdrawParams {
  planId: string;
  userId: string;
  amount: number; // in naira
  idempotencyKey: string;
}

export class SavingsService {
  static async createPlan(params: CreatePlanParams) {
    const session = await DatabaseService.startSession();

    try {
      return await DatabaseService.withTransaction(session, async () => {
        const maturityDate = params.durationDays 
          ? new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000)
          : undefined;

        const [plan] = await SavingsPlan.create([{
          userId: params.userId,
          planType: params.planType,
          targetAmount: params.targetAmount ? Money.toKobo(params.targetAmount) : undefined,
          durationDays: params.durationDays,
          interestRate: params.interestRate,
          locked: params.planType === 'LOCKED',
          maturityDate,
          status: 'ACTIVE'
        }], { session });

        const result = {
          planId: plan._id,
          planType: plan.planType,
          interestRate: plan.interestRate,
          maturityDate: plan.maturityDate
        };

        await saveIdempotentResponse(
          params.idempotencyKey,
          params.userId,
          result
        );

        return result;
      });
    } finally {
      await session.endSession();
    }
  }

  static async deposit(params: DepositParams) {
    const traceId = UuidService.generateTraceId();
    const amountKobo = Money.toKobo(params.amount);

    const session = await DatabaseService.startSession();

    try {
      return await DatabaseService.withTransaction(session, async () => {
        const plan = await SavingsPlan.findById(params.planId).session(session);
        if (!plan) throw new Error('Savings plan not found');
        if (plan.userId !== params.userId) throw new Error('Unauthorized');

        // Create savings transaction
        const [transaction] = await SavingsTransaction.create([{
          userId: params.userId,
          planId: params.planId,
          type: 'DEPOSIT',
          amount: amountKobo,
          traceId,
          status: 'COMPLETED'
        }], { session });

        // Create ledger entries
        await LedgerService.createDoubleEntry(
          traceId,
          `user_wallet:${params.userId}`,
          'savings_pool',
          amountKobo,
          'savings',
          {
            userId: params.userId,
            subtype: 'deposit',
            idempotencyKey: params.idempotencyKey,
            session,
            meta: {
              planId: params.planId,
              transactionId: transaction._id
            }
          }
        );

        // Update plan principal
        plan.principal += amountKobo;
        await plan.save({ session });

        const result = {
          traceId,
          transactionId: transaction._id,
          newPrincipal: plan.principal
        };

        await saveIdempotentResponse(
          params.idempotencyKey,
          params.userId,
          result
        );

        return result;
      });
    } finally {
      await session.endSession();
    }
  }

  static async withdraw(params: WithdrawParams) {
    const traceId = UuidService.generateTraceId();
    const amountKobo = Money.toKobo(params.amount);

    const session = await DatabaseService.startSession();

    try {
      return await DatabaseService.withTransaction(session, async () => {
        const plan = await SavingsPlan.findById(params.planId).session(session);
        if (!plan) throw new Error('Savings plan not found');
        if (plan.userId !== params.userId) throw new Error('Unauthorized');

        let penalty = 0;
        let netAmount = amountKobo;

        // Calculate penalty for early withdrawal
        if (plan.locked && plan.maturityDate && new Date() < plan.maturityDate) {
          const penaltyRate = plan.meta?.penaltyRate || 0.05; // 5% default
          penalty = Math.floor(amountKobo * penaltyRate);
          netAmount = amountKobo - penalty;
        }

        // Create savings transaction
        const [transaction] = await SavingsTransaction.create([{
          userId: params.userId,
          planId: params.planId,
          type: 'WITHDRAWAL',
          amount: amountKobo,
          traceId,
          status: 'COMPLETED',
          meta: {
            earlyWithdrawal: plan.locked && plan.maturityDate && new Date() < plan.maturityDate,
            penalty
          }
        }], { session });

        // Create ledger entries for withdrawal
        await LedgerService.createDoubleEntry(
          traceId,
          'savings_pool',
          `user_wallet:${params.userId}`,
          netAmount,
          'savings',
          {
            userId: params.userId,
            subtype: 'withdrawal',
            idempotencyKey: params.idempotencyKey,
            session
          }
        );

        // Create penalty ledger entry if applicable
        if (penalty > 0) {
          await LedgerService.createEntry({
            traceId,
            userId: params.userId,
            account: 'platform_revenue',
            entryType: 'CREDIT',
            category: 'savings',
            subtype: 'penalty',
            amount: penalty,
            status: 'COMPLETED'
          }, session);
        }

        // Update plan principal
        plan.principal -= amountKobo;
        if (plan.principal <= 0) {
          plan.status = 'COMPLETED';
          plan.completedAt = new Date();
        }
        await plan.save({ session });

        const result = {
          traceId,
          transactionId: transaction._id,
          withdrawnAmount: amountKobo,
          penalty,
          netAmount,
          newPrincipal: plan.principal
        };

        await saveIdempotentResponse(
          params.idempotencyKey,
          params.userId,
          result
        );

        return result;
      });
    } finally {
      await session.endSession();
    }
  }

  static async getUserPlans(userId: string) {
    return SavingsPlan.find({ userId, status: { $ne: 'CANCELLED' } })
      .sort({ createdAt: -1 });
  }
}