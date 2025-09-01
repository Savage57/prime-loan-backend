/**
 * Savings Plan Model - User savings accounts
 * Supports both locked and flexible savings with interest calculations
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface ISavingsPlan extends Document {
  _id: string;
  userId: string;
  planType: 'LOCKED' | 'FLEXIBLE';
  principal: number; // in kobo
  interestEarned: number; // in kobo
  targetAmount?: number; // in kobo
  durationDays?: number;
  interestRate: number; // annual percentage
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  maturityDate?: Date;
  locked: boolean;
  createdAt: Date;
  completedAt?: Date;
  meta?: {
    autoRenew?: boolean;
    penaltyRate?: number;
    compoundingFrequency?: 'daily' | 'monthly' | 'maturity';
  };
}

const SavingsPlanSchema = new Schema<ISavingsPlan>({
  userId: { type: String, required: true, index: true },
  planType: { type: String, enum: ['LOCKED', 'FLEXIBLE'], required: true },
  principal: { type: Number, required: true, default: 0 },
  interestEarned: { type: Number, default: 0 },
  targetAmount: { type: Number },
  durationDays: { type: Number },
  interestRate: { type: Number, required: true }, // annual percentage
  status: { 
    type: String, 
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'], 
    default: 'ACTIVE',
    index: true
  },
  maturityDate: { type: Date },
  locked: { type: Boolean, required: true },
  completedAt: { type: Date },
  meta: {
    autoRenew: { type: Boolean, default: false },
    penaltyRate: { type: Number },
    compoundingFrequency: { type: String, enum: ['daily', 'monthly', 'maturity'], default: 'maturity' }
  }
}, { 
  timestamps: true,
  collection: 'savings_plans'
});

SavingsPlanSchema.index({ userId: 1, status: 1 });
SavingsPlanSchema.index({ maturityDate: 1, status: 1 });

export const SavingsPlan = mongoose.model<ISavingsPlan>('SavingsPlan', SavingsPlanSchema);