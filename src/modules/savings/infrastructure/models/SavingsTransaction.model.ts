/**
 * Savings Transaction Model - Tracks deposits and withdrawals
 * Links to ledger entries for complete audit trail
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface ISavingsTransaction extends Document {
  _id: string;
  userId: string;
  planId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'PENALTY';
  amount: number; // in kobo
  traceId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  processedAt?: Date;
  meta?: {
    penaltyReason?: string;
    interestPeriod?: string;
    earlyWithdrawal?: boolean;
  };
}

const SavingsTransactionSchema = new Schema<ISavingsTransaction>({
  userId: { type: String, required: true, index: true },
  planId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'PENALTY'], 
    required: true 
  },
  amount: { type: Number, required: true },
  traceId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'COMPLETED', 'FAILED'], 
    required: true,
    index: true
  },
  processedAt: { type: Date },
  meta: {
    penaltyReason: { type: String },
    interestPeriod: { type: String },
    earlyWithdrawal: { type: Boolean }
  }
}, { 
  timestamps: true,
  collection: 'savings_transactions'
});

SavingsTransactionSchema.index({ planId: 1, type: 1, createdAt: -1 });

export const SavingsTransaction = mongoose.model<ISavingsTransaction>('SavingsTransaction', SavingsTransactionSchema);