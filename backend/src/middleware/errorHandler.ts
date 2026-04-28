import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal server error';
  
  if (statusCode === 500) {
    console.error(`[CRITICAL] ${req.method} ${req.path}:`, err);
  } else {
    console.error(`[ERROR] ${req.method} ${req.path}: ${message}`);
  }

  if (res.headersSent) return next(err);

  // Handle specific library errors
  if (err.message === 'Only CSV files are allowed') {
    return res.status(400).json({ success: false, error: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'File too large (max 10MB)' });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

// backend/src/middleware/requestLogger.ts  

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`${color}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
}
