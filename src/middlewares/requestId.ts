/**
 * Request ID Middleware - Adds unique request ID for tracing
 * Ensures every request has a unique identifier for logging and debugging
 */
import { Request, Response, NextFunction } from 'express';
import { UuidService } from '../utils/uuid';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      traceId?: string;
      idempotencyKey?: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = UuidService.generate();
  req.traceId = UuidService.generateTraceId();
  
  // Add to response headers for client debugging
  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Trace-ID', req.traceId);
  
  next();
};