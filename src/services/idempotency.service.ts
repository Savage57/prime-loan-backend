/**
 * Idempotency Service - Prevents duplicate operations
 * Manages idempotency keys and cached responses
 */
import IdempotencyModel from '../model/idempotency.model';
import { IdempotencyKey } from '../interfaces';

export class IdempotencyService {
  static async checkKey(key: string, userId?: string): Promise<IdempotencyKey | null> {
    return await IdempotencyModel.findOne({ key, userId });
  }

  static async saveResponse(
    key: string,
    userId: string | undefined,
    response: any,
    expiresInHours: number = 24
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    await IdempotencyModel.create({
      key,
      userId,
      response,
      expiresAt
    });
  }

  static async cleanExpired(): Promise<void> {
    await IdempotencyModel.deleteMany({
      expiresAt: { $lt: new Date() }
    });
  }
}