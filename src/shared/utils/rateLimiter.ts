/**
 * Rate Limiter Utility
 * Implements rate limiting for API endpoints
 */
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (req) => req.ip,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = `rate_limit:${this.options.keyGenerator!(req)}`;
        const window = Math.floor(Date.now() / this.options.windowMs);
        const redisKey = `${key}:${window}`;

        const current = await redis.incr(redisKey);
        
        if (current === 1) {
          await redis.expire(redisKey, Math.ceil(this.options.windowMs / 1000));
        }

        // Set headers
        res.setHeader('X-RateLimit-Limit', this.options.maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, this.options.maxRequests - current));
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + this.options.windowMs));

        if (current > this.options.maxRequests) {
          return res.status(429).json({
            status: 'error',
            message: 'Too many requests, please try again later.',
            retryAfter: Math.ceil(this.options.windowMs / 1000)
          });
        }

        next();
      } catch (error) {
        // If Redis is down, allow the request to proceed
        console.error('Rate limiter error:', error);
        next();
      }
    };
  }

  /**
   * Create rate limiter for authentication endpoints
   */
  static authLimiter() {
    return new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
      keyGenerator: (req) => `auth:${req.ip}:${req.body.email || 'unknown'}`
    });
  }

  /**
   * Create rate limiter for general API endpoints
   */
  static apiLimiter() {
    return new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 requests per 15 minutes
      keyGenerator: (req) => `api:${req.ip}`
    });
  }

  /**
   * Create rate limiter for financial operations
   */
  static financialLimiter() {
    return new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 financial operations per minute
      keyGenerator: (req) => `financial:${(req as any).user?._id || req.ip}`
    });
  }
}