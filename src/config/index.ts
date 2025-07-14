import dotenv from 'dotenv';
import path from 'path';
import { Environment } from '@/types';

// Load environment variables
dotenv.config();

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue || '';
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return parseInt(value || String(defaultValue), 10);
};

const getEnvBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value?.toLowerCase() === 'true' || defaultValue || false;
};

export const config: Environment = {
  // Server Configuration
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 3000),

  // Database Configuration
  MONGODB_URI: getEnvVar('MONGODB_URI'),
  MONGODB_TEST_URI: getEnvVar('MONGODB_TEST_URI', ''),
  REDIS_URL: getEnvVar('REDIS_URL', ''),

  // JWT Configuration
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_SECRET: getEnvVar('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: getEnvVar('JWT_REFRESH_EXPIRES_IN', '30d'),

  // Email Configuration
  EMAIL_HOST: getEnvVar('EMAIL_HOST', ''),
  EMAIL_PORT: getEnvNumber('EMAIL_PORT', 587),
  EMAIL_USER: getEnvVar('EMAIL_USER', ''),
  EMAIL_PASS: getEnvVar('EMAIL_PASS', ''),
  EMAIL_FROM: getEnvVar('EMAIL_FROM', ''),

  // File Upload Configuration
  MAX_FILE_SIZE: getEnvVar('MAX_FILE_SIZE', '50MB'),
  UPLOAD_PATH: getEnvVar('UPLOAD_PATH', './uploads'),
  ALLOWED_IMAGE_TYPES: getEnvVar(
    'ALLOWED_IMAGE_TYPES',
    'image/jpeg,image/png,image/gif,image/webp'
  ),

  // Security Configuration
  BCRYPT_ROUNDS: getEnvNumber('BCRYPT_ROUNDS', 12),
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),

  // CORS Configuration
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
  TRUST_PROXY: getEnvBoolean('TRUST_PROXY', false),
};

// Derived configurations
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTesting = config.NODE_ENV === 'test';

// Path configurations
export const paths = {
  uploads: path.resolve(config.UPLOAD_PATH),
  logs: path.resolve('./logs'),
  temp: path.resolve('./temp'),
};

// Database configuration with options
export const dbConfig = {
  uri: isTesting ? config.MONGODB_TEST_URI : config.MONGODB_URI,
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  },
};

// Redis configuration
export const redisConfig = {
  url: config.REDIS_URL,
  options: {
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  },
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// CORS configuration
export const corsConfig = {
  origin: config.NODE_ENV === 'development' 
    ? true // Allow all origins in development
    : config.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
  credentials: true,
};

// File upload configuration
export const uploadConfig = {
  maxFileSize: parseFileSize(config.MAX_FILE_SIZE),
  allowedImageTypes: config.ALLOWED_IMAGE_TYPES.split(',').map(type =>
    type.trim()
  ),
  uploadPath: paths.uploads,
};

// Helper function to parse file size
function parseFileSize(size: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  const match = size.match(/^(\d+(?:\.\d+)?)(B|KB|MB|GB)$/i);
  if (!match) {
    throw new Error(`Invalid file size format: ${size}`);
  }

  const [, value, unit] = match;
  return parseFloat(value) * units[unit.toUpperCase()];
}

// JWT configuration
export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN as string,
  refreshSecret: config.JWT_REFRESH_SECRET,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN as string,
  algorithm: 'HS256' as const,
  issuer: 'infinity-angles',
  audience: 'infinity-angles-users',
};

// Email configuration
export const emailConfig = {
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: config.EMAIL_PORT === 465,
  auth: config.EMAIL_USER
    ? {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      }
    : undefined,
  from: config.EMAIL_FROM,
};

// Validate configuration
export const validateConfig = (): void => {
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate JWT secrets are different
  if (config.JWT_SECRET === config.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  // Validate file size
  try {
    parseFileSize(config.MAX_FILE_SIZE);
  } catch (error) {
    throw new Error(`Invalid MAX_FILE_SIZE: ${error}`);
  }
};

export default config;
