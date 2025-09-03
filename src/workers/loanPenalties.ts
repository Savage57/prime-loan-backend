/**
 * Loan Penalties Worker - Applies daily penalties to overdue loans
 * Runs as a separate process to handle penalty calculations
 */
import { LoanService, UserService } from '../services';
import { LedgerService } from '../services/ledger.service';
import { UuidService } from '../utils/uuid';
import { Money } from '../utils/money';
import { FEATURE_LEDGER, LOAN_PENALTY_PCT_PER_DAY } from '../config';
import { connectToDB } from '../utils';
import { RepaymentHistoryEntry } from '../interfaces';
import mongoose from 'mongoose';
import cron from 'node-cron';

const { getOverdueLoans, update: updateLoan, addRepaymentHistory } = new LoanService();

async function applyDailyPenalties() {
  try {
    const overdueLoans = await getOverdueLoans();
    console.log(`Processing penalties for ${overdueLoans.length} overdue loans`);

    for (const loan of overdueLoans) {
      try {
        await applyPenaltyToLoan(loan);
      } catch (error) {
        console.error(`Error applying penalty to loan ${loan._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in loan penalties worker:', error);
  }
}

async function applyPenaltyToLoan(loan: any) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastPenaltyDate = loan.lastInterestAdded?.split('T')[0];

      // Skip if penalty already applied today
      if (lastPenaltyDate === today) {
        return;
      }

      const penaltyRate = LOAN_PENALTY_PCT_PER_DAY / 100;
      const penaltyAmount = Math.floor(loan.amount * penaltyRate);
      const traceId = UuidService.generateTraceId();

      // Create penalty ledger entries if feature enabled
      if (FEATURE_LEDGER) {
        await LedgerService.createDoubleEntry(
          traceId,
          `user_wallet:${loan.userId}`,
          'platform_revenue',
          Money.toKobo(penaltyAmount),
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
      }

      // Update loan with penalty
      const newOutstanding = Number(loan.outstanding) + penaltyAmount;
      const penaltyEntry: RepaymentHistoryEntry = {
        amount: penaltyAmount,
        outstanding: newOutstanding,
        action: 'penalty',
        date: new Date().toISOString()
      };

      await updateLoan(loan._id, {
        outstanding: newOutstanding,
        lastInterestAdded: new Date().toISOString(),
        traceId
      });

      await addRepaymentHistory(loan._id, penaltyEntry);

      console.log(`Penalty applied to loan ${loan._id}: ₦${penaltyAmount}`);
    });
  } finally {
    await session.endSession();
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  connectToDB();
  
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily loan penalties...');
    await applyDailyPenalties();
  });

  console.log('Loan penalties worker started');
}

export { applyDailyPenalties };