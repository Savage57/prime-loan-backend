/**
 * Savings Application Service
 * Manages savings plans with interest calculations and penalties
 */
import { SavingsPlan } from './savings.plan.model';
import { LedgerService } from '../ledger/LedgerService';
import { DatabaseService } from '../../shared/db';
import { UuidService } from '../../shared/utils/uuid';
import User from '../users/user.model';
import { VfdProvider } from '../../shared/providers/vfd.provider';
import { saveIdempotentResponse } from '../../shared/idempotency/middleware';
import { TransferService } from '../transfers/transfer.service';
import { TransferRequest } from '../../shared/providers/vfd.provider';
import { sha512 } from 'js-sha512';
import { SettingsService } from '../admin/settings.service';

export interface CreatePlanParams {
  userId: string;
  planType: 'LOCKED' | 'FLEXIBLE';
  targetAmount?: number;
  planName: string;
  durationDays?: number;
  amount: number; // in naira
  interestRate: number;
  idempotencyKey: string;
  renew: boolean;
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
        const vfdProvider = new VfdProvider();

        const maturityDate = params.durationDays 
          ? new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000)
          : undefined;
    
        const userId = params.userId;

        const user = await User.findById(userId);
        const from = (await vfdProvider.getAccountInfo(user? user.user_metadata.accountNo : "trx-user")).data;
        const to = (await vfdProvider.getPrimeAccountInfo()).data;

        // 1. Create transfer record + ledger entry (PENDING)
        const trxn = await TransferService.initiateTransfer({
          fromAccount: from.accountNo,
          userId,
          toAccount: to.accountNo,
          amount: params.amount,
          transferType: "intra",
          bankCode: "999999",
          remark: `Initiated ${params.planType} plan intiated for ${params.planName}`,
          naration: `
            Initiated ${params.planType} plan for ${params.planName}, with 
            ${params.amount} to get ${params.targetAmount} at ${params.interestRate} 
            for a duration of ${params.durationDays} days successfully.
          `,
          idempotencyKey: params.idempotencyKey,
        }, "savings-deposit");

        // 2. Send transfer to VFD
        const transferReq: TransferRequest = {
          uniqueSenderAccountId: from.accountId,
          fromAccount: from.accountNo,
          fromClientId: from.clientId,
          fromClient: from.client,
          fromSavingsId: from.accountId,
          toAccount: to.accountNo,
          toClient: to.client,
          toSession: to.accountId,
          toClientId: to.clientId,
          toSavingsId: to.accountId,
          toBank: "999999",
          signature: sha512.hex(`${from.accountNo}${to.accountNo}`),
          amount: params.amount,
          remark: `Initiated ${params.planType} plan intiated for ${params.planName}`,
          transferType: "intra",
          reference: trxn.reference,
        };

        const providerRes = await vfdProvider.transfer(transferReq);

        if(providerRes.status == "00") {
          const trxnRes = await TransferService.completeTransfer(trxn.reference, "savings-deposit");

         const penalty = await SettingsService.getSettings()

          const [plan] = await SavingsPlan.create([{
            userId: params.userId,
            planType: params.planType,
            planName: params.planName,
            targetAmount: params.targetAmount ? params.targetAmount : undefined,
            durationDays: params.durationDays,
            principal: params.amount,
            interestRate: params.interestRate,
            locked: params.planType === 'LOCKED',
            maturityDate,
            status: 'ACTIVE',
            meta: {
              penaltyRate: penalty.savingsPenalty,
              autoRenew: params.renew,
              compoundingFrequency: 'maturity'
            }
          }], { session });

          const result = {
            planId: plan._id,
            planType: plan.planType,
            interestRate: plan.interestRate,
            maturityDate: plan.maturityDate
          };

          await LedgerService.createDoubleEntry(
            trxnRes?.traceId || "",
            `user_wallet:${params.userId}`,
            'savings_pool',
            params.amount,
            'savings',
            {
              userId: params.userId,
              subtype: 'deposit',
              idempotencyKey: params.idempotencyKey,
              session,
              meta: {
                planId: plan._id,
                transactionId: trxnRes?.transferId || ""
              }
            }
          );

          await saveIdempotentResponse(
            params.idempotencyKey,
            params.userId,
            result
          );

          return result;
        }

        await TransferService.failTransfer(trxn.reference);
        return null;
      });
    } finally {
      await session.endSession();
    }
  }

  static async completePlan(params: WithdrawParams) {
    const traceId = UuidService.generateTraceId();
    const amount = params.amount;

    const session = await DatabaseService.startSession();

    try {
      return await DatabaseService.withTransaction(session, async () => {
        const vfdProvider = new VfdProvider();

        const plan = await SavingsPlan.findById(params.planId).session(session);
        if (!plan) throw new Error('Savings plan not found');
        if (plan.userId !== params.userId) throw new Error('Unauthorized');

        let penalty = 0;
        let netAmount = amount;

        // Calculate penalty for early withdrawal
        if (plan.locked && plan.maturityDate && new Date() < plan.maturityDate) {
          const penaltyRate = plan.meta?.penaltyRate || 0.05; // 5% default
          penalty = Math.floor(amount * penaltyRate);
          netAmount = amount - penalty;
        }
    
        const userId = params.userId;

        const user = await User.findById(userId);
        const to = (await vfdProvider.getAccountInfo(user? user.user_metadata.accountNo : "trx-user")).data;
        const from = (await vfdProvider.getPrimeAccountInfo()).data;

        // 1. Create transfer record + ledger entry (PENDING)
        const trxn = await TransferService.initiateTransfer({
          fromAccount: from.accountNo,
          userId,
          toAccount: to.accountNo,
          amount: params.amount,
          transferType: "intra",
          bankCode: "999999",
          remark: `${plan.planType} plan intiated for ${plan.planName} withrawal`,
          idempotencyKey: params.idempotencyKey,
          meta: {
            earlyWithdrawal: plan.locked && plan.maturityDate && new Date() < plan.maturityDate,
            penalty
          }
        }, "savings-withdrawal");

        // 2. Send transfer to VFD
        const transferReq: TransferRequest = {
          uniqueSenderAccountId: from.accountId,
          fromAccount: from.accountNo,
          fromClientId: from.clientId,
          fromClient: from.client,
          fromSavingsId: from.accountId,
          toAccount: to.accountNo,
          toClient: to.client,
          toSession: to.accountId,
          toClientId: to.clientId,
          toSavingsId: to.accountId,
          toBank: "999999",
          signature: sha512.hex(`${from.accountNo}${to.accountNo}`),
          amount: params.amount,
          remark: `${plan.planType} plan intiated for ${plan.planName} withrawal`,
          transferType: "intra",
          reference: trxn.reference,
        };

        const providerRes = await vfdProvider.transfer(transferReq);

        if(providerRes.status == "00") {
          const trxnRes = await TransferService.completeTransfer(trxn.reference, "savings-withdrawal");

           // Create ledger entries for withdrawal
          await LedgerService.createDoubleEntry(
            trxnRes?.traceId || "",
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
          plan.principal -= amount;
          if (plan.principal <= 0) {
            plan.status = 'COMPLETED';
            plan.completedAt = new Date();
          }
          await plan.save({ session });

          const result = {
            traceId,
            transactionId: trxn?.transferId || "",
            withdrawnAmount: amount,
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
        }

        await TransferService.failTransfer(trxn.reference);
        return null;
      });
    } finally {
      await session.endSession();
    }
  }

  static async getUserPlans(userId: string, page = 1, limit = 20,) {
    const skip = (page - 1) * limit;
    return SavingsPlan.find({ userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  static async getAllPlans(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return SavingsPlan.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }
}