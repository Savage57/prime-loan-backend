/**
 * Idempotency Key Model - Prevents duplicate operations
 * Stores responses for idempotent endpoints to return cached results
 */
import mongoose, { Document, Schema } from 'mongoose';
import { IdempotencyKey } from '../interfaces';

const IdempotencyKeySchema = new Schema<IdempotencyKey>({
  key: { type: String, required: true, unique: true },
  userId: { type: String, index: true },
  response: { type: Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
}, { 
  timestamps: true,
  collection: 'idempotency_keys'
});

export default mongoose.model<IdempotencyKey & Document>('IdempotencyKey', IdempotencyKeySchema);