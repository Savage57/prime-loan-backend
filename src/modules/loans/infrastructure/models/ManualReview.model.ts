/**
 * Manual Review Model - Tracks items requiring admin review
 * Used for loan applications, ladder verification, and other manual processes
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface IManualReview extends Document {
  _id: string;
  type: 'loan' | 'ladder' | 'transfer' | 'savings' | 'general';
  entityId?: string;
  userId?: string;
  reason: string;
  status: 'open' | 'assigned' | 'closed';
  assignedTo?: string;
  createdAt: Date;
  payload?: any;
  resolution?: {
    action: string;
    note?: string;
    resolvedBy: string;
    resolvedAt: Date;
  };
}

const ManualReviewSchema = new Schema<IManualReview>({
  type: { 
    type: String, 
    enum: ['loan', 'ladder', 'transfer', 'savings', 'general'], 
    required: true,
    index: true
  },
  entityId: { type: String, index: true },
  userId: { type: String, index: true },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['open', 'assigned', 'closed'], 
    default: 'open',
    index: true
  },
  assignedTo: { type: String },
  payload: { type: Schema.Types.Mixed },
  resolution: {
    action: { type: String },
    note: { type: String },
    resolvedBy: { type: String },
    resolvedAt: { type: Date }
  }
}, { 
  timestamps: true,
  collection: 'manual_reviews'
});

ManualReviewSchema.index({ status: 1, type: 1, createdAt: -1 });

export const ManualReview = mongoose.model<IManualReview>('ManualReview', ManualReviewSchema);