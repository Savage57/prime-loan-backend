/**
 * Idempotency Middleware - Prevents duplicate operations
 * Checks for existing operations and returns cached responses
 */
import { Request, Response, NextFunction } from 'express';
import { IdempotencyService } from '../services/idempotency.service';
import { ProtectedRequest } from '../interfaces';

export const idempotencyMiddleware = () => {
  return async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    if (!idempotencyKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Idempotency-Key header is required for this operation'
      });
    }

    try {
      // Check if we've seen this key before
      const existingKey = await IdempotencyService.checkKey(
        idempotencyKey,
        req.user?._id
      );

      if (existingKey) {
        // Return cached response
        return res.status(200).json(existingKey.response);
      }

      // Store the key for later use
      req.idempotencyKey = idempotencyKey;
      next();
    } catch (error) {
      next(error);
    }
  };
};