import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { Document } from 'mongoose';

// Auth Types
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
    role?: string;
  };
}

export interface JwtUser extends JwtPayload {
  userId: string;
  username: string;
  email: string;
  role?: string;
}

// User Types
export interface IUser extends Document {
  _id: string;
  username: string;
  email: string;
  password: string;
  fullName: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  isVerified: boolean;
  isActive: boolean;
  role: 'user' | 'admin' | 'moderator';
  posts: string[];
  followers: string[];
  following: string[];
  bookmarks: string[];
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  settings: {
    isPrivate: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
    likesCount: number;
  };
  metadata: {
    lastLogin: Date;
    loginCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<void>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

// Post Types
export interface IPost extends Document {
  _id: string;
  title: string;
  content: string;
  author: string | IUser;
  images?: string[];
  tags?: string[];
  category?: string;
  location?: {
    name: string;
    coordinates: [number, number];
  };
  status: {
    isPublished: boolean;
    isDraft: boolean;
  };
  likes: string[];
  comments: {
    _id: string;
    author: string | IUser;
    content: string;
    createdAt: Date;
    likes: string[];
    likesCount: number;
  }[];
  metadata: {
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Comment Types
export interface IComment extends Document {
  _id: string;
  content: string;
  author: string | IUser;
  post: string | IPost;
  parent?: string | IComment;
  likes: string[];
  metadata: {
    likesCount: number;
    repliesCount: number;
  };
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Follow Types
export interface IFollow extends Document {
  follower: string | IUser;
  following: string | IUser;
  createdAt: Date;
}

// Like Types
export interface ILike extends Document {
  user: string | IUser;
  target: string;
  targetType: 'post' | 'comment';
  createdAt: Date;
}

// Notification Types
export interface INotification extends Document {
  recipient: string | IUser;
  sender: string | IUser;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system';
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

// Pagination Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// File Upload Types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Service Response Types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

// Environment Types
export interface Environment {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  MONGODB_TEST_URI?: string;
  REDIS_URL?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  EMAIL_HOST?: string;
  EMAIL_PORT?: number;
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
  EMAIL_FROM?: string;
  MAX_FILE_SIZE: string;
  UPLOAD_PATH: string;
  ALLOWED_IMAGE_TYPES: string;
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  CORS_ORIGIN: string;
  TRUST_PROXY: boolean;
}

// Database Query Types
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  populate?: string | string[];
  select?: string;
  lean?: boolean;
}

// Cache Types
export interface CacheOptions {
  ttl?: number;
  key?: string;
}

// Socket Types
export interface SocketUser {
  userId: string;
  socketId: string;
  username: string;
}

// Health Check Types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    redis?: 'connected' | 'disconnected';
    storage: 'available' | 'unavailable';
  };
  performance: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu?: number;
  };
}
