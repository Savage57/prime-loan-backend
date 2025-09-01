/**
 * Loan Ladder Model - OCR extracted income ladder for loan eligibility
 * Stores extracted amounts from calculator images for loan approval decisions
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface ILoanLadder extends Document {
  _id: string;
  userId?: string;
  steps: number[]; // amounts in kobo, sorted ascending
  source: 'image' | 'admin' | 'system';
  trusted: boolean;
  verifiedBy?: string;
  createdAt: Date;
  meta?: {
    s3Url?: string;
    ocrConfidence?: number;
    imageQuality?: string;
    extractedText?: string;
    adminNotes?: string;
  };
}

const LoanLadderSchema = new Schema<ILoanLadder>({
  userId: { type: String, index: true },
  steps: [{ type: Number, required: true }], // amounts in kobo
  source: { type: String, enum: ['image', 'admin', 'system'], required: true },
  trusted: { type: Boolean, default: false },
  verifiedBy: { type: String },
  meta: {
    s3Url: { type: String },
    ocrConfidence: { type: Number },
    imageQuality: { type: String },
    extractedText: { type: String },
    adminNotes: { type: String }
  }
}, { 
  timestamps: true,
  collection: 'loan_ladders'
});

LoanLadderSchema.index({ userId: 1, createdAt: -1 });
LoanLadderSchema.index({ trusted: 1, source: 1 });

export const LoanLadder = mongoose.model<ILoanLadder>('LoanLadder', LoanLadderSchema);