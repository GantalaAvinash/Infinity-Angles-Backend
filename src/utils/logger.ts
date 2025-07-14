import winston from 'winston';
import path from 'path';
import { config, paths } from '@/config';

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define production log format (without colors)
const productionLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [];

// Console transport
if (config.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: logFormat,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: productionLogFormat,
    })
  );
}

// File transports for production
if (config.NODE_ENV === 'production') {
  // Error logs
  transports.push(
    new winston.transports.File({
      filename: path.join(paths.logs, 'error.log'),
      level: 'error',
      format: productionLogFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined logs
  transports.push(
    new winston.transports.File({
      filename: path.join(paths.logs, 'combined.log'),
      format: productionLogFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  levels: logLevels,
  format: config.NODE_ENV === 'production' ? productionLogFormat : logFormat,
  transports,
  exitOnError: false,
});

// Create stream for Morgan HTTP logger
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logWithContext = (level: string, message: string, context?: any) => {
  if (context) {
    logger.log(level, message, { context });
  } else {
    logger.log(level, message);
  }
};

// Database operation logging
export const logDbOperation = (operation: string, collection: string, duration?: number, error?: any) => {
  if (error) {
    logger.error(`DB ${operation} failed on ${collection}`, {
      operation,
      collection,
      duration,
      error: error.message,
      stack: error.stack,
    });
  } else {
    logger.debug(`DB ${operation} on ${collection}`, {
      operation,
      collection,
      duration,
    });
  }
};

// API request logging
export const logApiRequest = (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
  logger.http(`${method} ${url} ${statusCode}`, {
    method,
    url,
    statusCode,
    duration,
    userId,
  });
};

// Authentication logging
export const logAuthEvent = (event: string, userId?: string, email?: string, ip?: string, userAgent?: string) => {
  logger.info(`Auth: ${event}`, {
    event,
    userId,
    email,
    ip,
    userAgent,
  });
};

// Error logging with context
export const logError = (error: Error, context?: any) => {
  logger.error(error.message, {
    stack: error.stack,
    context,
  });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info(`Performance: ${operation} took ${duration}ms`, {
    operation,
    duration,
    metadata,
  });
};

// Security event logging
export const logSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
  logger.warn(`Security: ${event}`, {
    event,
    severity,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Business logic logging
export const logBusinessEvent = (event: string, userId?: string, details?: any) => {
  logger.info(`Business: ${event}`, {
    event,
    userId,
    details,
  });
};

export default logger;
