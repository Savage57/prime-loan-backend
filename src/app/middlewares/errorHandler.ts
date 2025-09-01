/**
 * Enhanced Error Handler - Structured error responses with logging
 * Provides consistent error format and proper logging without PII
 */
import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.body.password', 'req.body.pin']
});

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.requestId || 'unknown';
  const traceId = req.traceId || 'unknown';
  
  // Log error without PII
  logger.error({
    requestId,
    traceId,
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode
    },
    path: req.path,
    method: req.method
  }, 'Request error');

  // Handle different error types
  let statusCode = 500;
  let message = 'Internal server error';

  if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    requestId,
    traceId,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};