import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export interface AppError {
  status: number;
  message: string;
  code?: string;
}

export function createError(status: number, message: string, code?: string): AppError {
  return { status, message, code };
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error]', err);

  if (err.name === 'ZodError') {
    res.status(422).json({
      error: 'Validation failed',
      details: err.errors,
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  if (err.status) {
    res.status(err.status).json({
      error: err.message,
      code: err.code || 'APP_ERROR',
    });
    return;
  }

  // AI provider specific errors
  const msg = err.message || String(err);
  if (msg.includes('API key') || msg.includes('not configured')) {
    res.status(503).json({
      error: msg,
      code: 'PROVIDER_NOT_CONFIGURED',
    });
    return;
  }

  if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('429')) {
    res.status(429).json({
      error: 'AI provider quota or rate limit exceeded. Please wait before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

// Async wrapper to catch errors in async route handlers
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
