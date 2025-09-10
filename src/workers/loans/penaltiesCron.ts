/**
 * Loan Penalties Cron Worker
 * Applies daily penalties to overdue loans
 */
import { QueueService } from '../../shared/queue';
import Loan from '../../modules/loans/loan.model';
import { LedgerService } from '../../modules/ledger/LedgerService';
import { DatabaseService } from '../../shared/db';
import { UuidService } from '../../shared/utils/uuid';
import pino from 'pino';

const logger = pino({ name: 'loan-penalties-cron' });

export class LoanPenaltiesCron {
  static async start() {
    await DatabaseService.connect();

    // Run daily at midnight
    const worker = QueueService.createWorker(
      'loan-penalties',
      async (job) => {
        await this.applyDailyPenalties();
      },
      {
        repeat: { pattern: '0 0 * * *' }, // Daily at midnight
        removeOnComplete: 5,
        removeOnFail: 10
      }
    );

    logger.info('Loan penalties cron started');

    process.on('SIGTERM', async () => {
      await worker.close();
      await QueueService.closeAll();
    });
  }

  private static async applyDailyPenalties() {
    const penaltyRate = parseFloat(process.env.LOAN_PENALTY_PCT_PER_DAY || '1') / 100;

    try {
      // Find overdue loans
      const overdueLoans = await Loan.find({
        status: 'accepted',
        outstanding: { $gt: 0 },
        repayment_date: { $lt: new Date() }
      });

      logger.info(`Processing penalties for ${overdueLoans.length} overdue loans`);

      for (const loan of overdueLoans) {
        try {
          await this.applyPenaltyToLoan(loan, penaltyRate);
        } catch (error: any) {
          logger.error({ 
            loanId: loan._id, 
            error: error.message 
          }, 'Error applying penalty to loan');
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in loan penalties cron');
    }
  }

  private static async applyPenaltyToLoan(loan: any, penaltyRate: number) {
    const session = await DatabaseService.startSession();

    try {
      await DatabaseService.withTransaction(session, async () => {
        const today = new Date().toISOString().split('T')[0];
        const lastPenaltyDate = loan.lastInterestAdded?.split('T')[0];

        // Skip if penalty already applied today
        if (lastPenaltyDate === today) {
          return;
        }

        const penaltyAmount = Math.floor(loan.amount * penaltyRate * 100); // Convert to kobo
        const traceId = UuidService.generateTraceId();

        // Create penalty ledger entries
        await LedgerService.createDoubleEntry(
          traceId,
          `user_wallet:${loan.userId}`,
          'platform_revenue',
          penaltyAmount,
          'loan',
          {
            userId: loan.userId,
            subtype: 'penalty',
            session,
            meta: {
              loanId: loan._id,
              penaltyRate,
              originalAmount: loan.amount
            }
          }
        );

        // Update loan with penalty
        loan.outstanding = Number(loan.outstanding) + penaltyAmount;
        loan.lastInterestAdded = new Date().toISOString();
        loan.repayment_history = [
          ...(loan.repayment_history || []),
          {
            amount: penaltyAmount,
            outstanding: loan.outstanding,
            action: 'penalty',
            date: new Date().toISOString()
          }
        ];

        await loan.save({ session });

        logger.info({ 
          loanId: loan._id,
          userId: loan.userId,
          penaltyAmount,
          newOutstanding: loan.outstanding
        }, 'Penalty applied to overdue loan');
      });
    } finally {
      await session.endSession();
    }
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  LoanPenaltiesCron.start().catch(console.error);
}