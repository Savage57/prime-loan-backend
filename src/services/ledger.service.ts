/**
 * Ledger Service - Core financial ledger operations
 * Manages all ledger entries and ensures double-entry bookkeeping principles
 */
import LedgerModel from '../model/ledger.model';
import { UuidService } from '../utils/uuid';
import mongoose from 'mongoose';
import { LedgerEntry } from '../interfaces';

export interface CreateLedgerEntryParams {
  traceId: string;
  userId?: string;
  account: string;
  entryType: 'DEBIT' | 'CREDIT';
  category: 'bill-payment' | 'transfer' | 'loan' | 'savings' | 'fee' | 'refund' | 'settlement';
  subtype?: string;
  amount: number; // in kobo
  currency?: string;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED';
  meta?: Record<string, any>;
  idempotencyKey?: string;
}

export class LedgerService {
  /**
   * Create a ledger entry within a session
   */
  static async createEntry(
    params: CreateLedgerEntryParams,
    session?: mongoose.ClientSession
  ): Promise<LedgerEntry> {
    const entry = {
      ...params,
      currency: params.currency || 'NGN',
      status: params.status || 'PENDING'
    };

    const [ledgerEntry] = await LedgerModel.create([entry], { session });
    return ledgerEntry;
  }

  /**
   * Create double-entry ledger entries (debit + credit)
   */
  static async createDoubleEntry(
    traceId: string,
    debitAccount: string,
    creditAccount: string,
    amount: number,
    category: CreateLedgerEntryParams['category'],
    options: {
      userId?: string;
      subtype?: string;
      meta?: Record<string, any>;
      idempotencyKey?: string;
      session?: mongoose.ClientSession;
    } = {}
  ): Promise<{ debit: LedgerEntry; credit: LedgerEntry }> {
    const { session, ...commonParams } = options;

    const debit = await this.createEntry({
      traceId,
      account: debitAccount,
      entryType: 'DEBIT',
      category,
      amount,
      ...commonParams
    }, session);

    const credit = await this.createEntry({
      traceId,
      account: creditAccount,
      entryType: 'CREDIT',
      category,
      amount,
      ...commonParams
    }, session);

    return { debit, credit };
  }

  /**
   * Get ledger entries by trace ID
   */
  static async getByTraceId(traceId: string): Promise<LedgerEntry[]> {
    return LedgerModel.find({ traceId }).sort({ createdAt: 1 });
  }

  /**
   * Update ledger entry status
   */
  static async updateStatus(
    entryId: string,
    status: 'PENDING' | 'COMPLETED' | 'FAILED',
    session?: mongoose.ClientSession
  ): Promise<void> {
    await LedgerModel.findByIdAndUpdate(
      entryId,
      { 
        status,
        processedAt: status !== 'PENDING' ? new Date() : undefined
      },
      { session }
    );
  }

  /**
   * Get user wallet balance from ledger
   */
  static async getUserWalletBalance(userId: string): Promise<number> {
    const result = await LedgerModel.aggregate([
      {
        $match: {
          account: `user_wallet:${userId}`,
          status: 'COMPLETED'
        }
      },
      {
        $group: {
          _id: null,
          balance: {
            $sum: {
              $cond: [
                { $eq: ['$entryType', 'CREDIT'] },
                '$amount',
                { $multiply: ['$amount', -1] }
              ]
            }
          }
        }
      }
    ]);

    return result[0]?.balance || 0;
  }

  /**
   * Find reconciliation inconsistencies
   */
  static async findInconsistencies(): Promise<any[]> {
    return LedgerModel.aggregate([
      {
        $match: { status: 'COMPLETED' }
      },
      {
        $group: {
          _id: '$traceId',
          totalDebits: {
            $sum: {
              $cond: [{ $eq: ['$entryType', 'DEBIT'] }, '$amount', 0]
            }
          },
          totalCredits: {
            $sum: {
              $cond: [{ $eq: ['$entryType', 'CREDIT'] }, '$amount', 0]
            }
          },
          entries: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$totalDebits', '$totalCredits'] }
        }
      }
    ]);
  }
}