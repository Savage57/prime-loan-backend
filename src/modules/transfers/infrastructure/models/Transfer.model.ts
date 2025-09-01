/**
 * Transfer Model - Enhanced transfer tracking with v2 features
 * Supports both intra-bank and inter-bank transfers with reconciliation
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface ITransfer extends Document {
  _id: string;
  userId: string;
  traceId: string; // v2 addition
  fromAccount: string;
  toAccount: string;
  amount: number; // in kobo
  transferType: 'intra' | 'inter';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  providerRef?: string;
  beneficiaryName?: string;
  bankCode?: string;
  reference: string;
  remark?: string;
  createdAt: Date;
  processedAt?: Date;
  meta?: Record<string, any>;
}

const TransferSchema = new Schema<ITransfer>({
  userId: { type: String, required: true, index: true },
  traceId: { type: String, required: true, index: true }, // v2 addition
  fromAccount: { type: String, required: true },
  toAccount: { type: String, required: true },
  amount: { type: Number, required: true },
  transferType: { type: String, enum: ['intra', 'inter'], required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'COMPLETED', 'FAILED'], 
    required: true,
    index: true
  },
  providerRef: { type: String },
  beneficiaryName: { type: String },
  bankCode: { type: String },
  reference: { type: String, required: true, unique: true },
  remark: { type: String },
  processedAt: { type: Date },
  meta: { type: Schema.Types.Mixed }
}, { 
  timestamps: true,
  collection: 'transfers_v2'
});

TransferSchema.index({ status: 1, createdAt: 1 });
TransferSchema.index({ providerRef: 1 });
TransferSchema.index({ reference: 1 });

export const Transfer = mongoose.model<ITransfer>('Transfer', TransferSchema);