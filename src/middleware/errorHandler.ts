import { Request, Response, NextFunction } from 'express';
import { ResponseUtils } from '@/utils/response';
import { logger, logError, logSecurityEvent } from '@/utils/logger';
import { config } from '@/config';
import mongoose from 'mongoose';

/**
 * Custom application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'AppError';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (error: mongoose.Error.ValidationError): AppError => {
  const errors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message,
  }));

  const message = 'Validation failed';
  return new AppError(message, 400);
};

/**
 * Handle Mongoose duplicate key errors
 */
const handleDuplicateKeyError = (error: any): AppError => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  return new AppError(message, 409);
};

/**
 * Handle Mongoose cast errors
 */
const handleCastError = (error: mongoose.Error.CastError): AppError => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT errors
 */
const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT expired errors
 */
const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Handle file upload errors
 */
const handleMulterError = (error: any): AppError => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large', 413);
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files', 413);
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field', 400);
  }
  return new AppError('File upload error', 400);
};

/**
 * Send error response in development
 */
const sendErrorDev = (err: AppError, res: Response): void => {
  const errorResponse = {
    success: false,
    message: err.message,
    error: {
      status: err.statusCode,
      stack: err.stack,
      name: err.name,
      isOperational: err.isOperational,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(err.statusCode).json(errorResponse);
};

/**
 * Send error response in production
 */
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    ResponseUtils.error(res, err.message, err.statusCode);
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('UNKNOWN ERROR:', err);
    ResponseUtils.internalError(res, 'Something went wrong!');
  }
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error with context
  logError(err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.userId,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  } else if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  } else if (err.name === 'CastError') {
    error = handleCastError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (err.name === 'MulterError') {
    error = handleMulterError(err);
  } else if (err.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON format', 400);
  } else if (err.type === 'entity.too.large') {
    error = new AppError('Request entity too large', 413);
  }

  // Security logging for certain errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    logSecurityEvent('Authentication/Authorization error', 'medium', {
      error: error.message,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  // Critical error logging
  if (error.statusCode >= 500) {
    logSecurityEvent('Server error', 'high', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  }

  // Send appropriate error response
  if (config.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Handle 404 errors for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

/**
 * Uncaught exception handler
 */
export const uncaughtExceptionHandler = (): void => {
  process.on('uncaughtException', (err: Error) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
    process.exit(1);
  });
};

/**
 * Unhandled rejection handler
 */
export const unhandledRejectionHandler = (): void => {
  process.on('unhandledRejection', (err: Error) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
    process.exit(1);
  });
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdownHandler = (server: any): void => {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    server.close(() => {
      logger.info('HTTP server closed.');
      
      // Close database connection
      mongoose.connection.close()
        .then(() => {
          logger.info('MongoDB connection closed.');
          process.exit(0);
        })
        .catch((error) => {
          logger.error('Error closing MongoDB connection:', error);
          process.exit(1);
        });
    });

    // Force close server after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logSecurityEvent('Request timeout', 'medium', {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          timeout,
        });
        ResponseUtils.error(res, 'Request timeout', 408);
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    res.on('close', () => {
      clearTimeout(timer);
    });

    next();
  };
};

/**
 * Rate limit error handler
 */
export const rateLimitHandler = (req: Request, res: Response): void => {
  logSecurityEvent('Rate limit exceeded', 'medium', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
  });

  ResponseUtils.tooManyRequests(res, 'Too many requests, please try again later');
};

export default {
  AppError,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  uncaughtExceptionHandler,
  unhandledRejectionHandler,
  gracefulShutdownHandler,
  requestTimeout,
  rateLimitHandler,
};
