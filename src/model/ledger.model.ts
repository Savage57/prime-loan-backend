/**
 * Ledger Entry Model - Single source of truth for all financial transactions
 * Every money movement in the system must create corresponding ledger entries
 */
import mongoose, { Document, Schema } from 'mongoose';
import { LedgerEntry } from '../interfaces';

const LedgerEntrySchema = new Schema<LedgerEntry>({
  traceId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  account: { type: String, required: true, index: true },
  entryType: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
  category: { 
    type: String, 
    enum: ['bill-payment', 'transfer', 'loan', 'savings', 'fee', 'refund', 'settlement'], 
    required: true,
    index: true
  },
  subtype: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], required: true, index: true },
  meta: { type: Schema.Types.Mixed },
  idempotencyKey: { type: String, index: true },
  processedAt: { type: Date }
}, { 
  timestamps: true,
  collection: 'ledger_entries'
});

// Compound indexes for efficient queries
LedgerEntrySchema.index({ traceId: 1, createdAt: -1 });
LedgerEntrySchema.index({ userId: 1, category: 1, createdAt: -1 });
LedgerEntrySchema.index({ status: 1, category: 1, createdAt: 1 });

export default mongoose.model<LedgerEntry & Document>('LedgerEntry', LedgerEntrySchema);