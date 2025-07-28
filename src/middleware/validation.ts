import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { ResponseUtils } from '@/utils/response';
import { logger } from '@/utils/logger';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => {
      // Handle different error types safely
      let field = 'unknown';
      let value: any = undefined;
      
      if ('path' in error && typeof error.path === 'string') {
        field = error.path;
      }
      
      if ('value' in error) {
        value = error.value;
      }
      
      return {
        field,
        message: error.msg,
        value,
      };
    });

    logger.warn('Validation failed', {
      url: req.originalUrl,
      method: req.method,
      errors: formattedErrors,
      body: req.body,
      ip: req.ip,
    });

    ResponseUtils.validationError(res, formattedErrors);
    return;
  }

  next();
};

/**
 * Common validation rules
 */
export const commonValidations = {
  objectId: (field: string) => 
    param(field)
      .isMongoId()
      .withMessage(`Invalid ${field} format`)
      .customSanitizer(value => new mongoose.Types.ObjectId(value)),

  email: () =>
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address')
      .isLength({ max: 255 })
      .withMessage('Email must be less than 255 characters'),

  password: () =>
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  username: () =>
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .custom(async (value, { req }) => {
        const existingUser = await User.findOne({
          username: { $regex: new RegExp(`^${value}$`, 'i') },
          _id: { $ne: req.params?.id || req.user?.userId }
        });
        
        if (existingUser) {
          throw new Error('Username already exists');
        }
        return true;
      }),

  fullName: () =>
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Full name can only contain letters and spaces'),

  bio: () =>
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),

  url: (field: string) =>
    body(field)
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage(`Please provide a valid ${field} URL`),

  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sort')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'name', 'likes', 'comments'])
      .withMessage('Invalid sort field'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc'),
  ],

  search: () =>
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .escape(),
};

/**
 * Authentication validation rules
 */
export const authValidations = {
  register: [
    commonValidations.username(),
    commonValidations.email(),
    commonValidations.password(),
    commonValidations.fullName(),
    commonValidations.bio(),
    body('email').custom(async (value) => {
      const existingUser = await User.findOne({ email: value.toLowerCase() });
      if (existingUser) {
        throw new Error('Email already registered');
      }
      return true;
    }),
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    commonValidations.password().custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  ],

  forgotPassword: [
    commonValidations.email(),
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    commonValidations.password(),
  ],

  updateProfile: [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    commonValidations.bio(),
    commonValidations.url('website'),
    body('socialLinks.twitter')
      .optional()
      .matches(/^@?[a-zA-Z0-9_]+$/)
      .withMessage('Invalid Twitter username'),
    body('socialLinks.instagram')
      .optional()
      .matches(/^@?[a-zA-Z0-9_.]+$/)
      .withMessage('Invalid Instagram username'),
  ],
};

/**
 * Post validation rules
 */
export const postValidations = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Content must be between 1 and 10000 characters'),
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 tags allowed'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Tags can only contain letters, numbers, hyphens, and underscores'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    body('isDraft')
      .optional()
      .isBoolean()
      .withMessage('isDraft must be a boolean'),
    body('location.name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location name must be less than 100 characters'),
    body('location.coordinates')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be an array of [longitude, latitude]'),
    body('location.coordinates.*')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid coordinate values'),
  ],

  update: [
    commonValidations.objectId('id'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('content')
      .optional()
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Content must be between 1 and 10000 characters'),
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 tags allowed'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    body('isDraft')
      .optional()
      .isBoolean()
      .withMessage('isDraft must be a boolean'),
  ],

  getById: [
    commonValidations.objectId('id'),
  ],

  delete: [
    commonValidations.objectId('id'),
  ],

  list: [
    ...commonValidations.pagination(),
    query('author')
      .optional()
      .isMongoId()
      .withMessage('Invalid author ID'),
    query('tags')
      .optional()
      .customSanitizer(value => {
        if (typeof value === 'string') {
          return value.split(',').map((tag: string) => tag.trim());
        }
        return value;
      }),
    commonValidations.search(),
  ],

  nearby: [
    query('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude')
      .toFloat(),
    query('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude')
      .toFloat(),
    query('maxDistance')
      .optional()
      .isInt({ min: 1, max: 100000 })
      .withMessage('Max distance must be between 1 and 100000 meters')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
      .toInt(),
  ],
};

/**
 * Comment validation rules
 */
export const commentValidations = {
  create: [
    commonValidations.objectId('id'), // Post ID from URL parameter
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters'),
    body('parent')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent comment ID'),
  ],

  update: [
    commonValidations.objectId('id'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters'),
  ],

  delete: [
    commonValidations.objectId('id'),
  ],

  list: [
    commonValidations.objectId('postId'),
    ...commonValidations.pagination(),
  ],
};

/**
 * File upload validation
 */
export const fileValidations = {
  image: [
    body('purpose')
      .optional()
      .isIn(['avatar', 'cover', 'post'])
      .withMessage('Invalid upload purpose'),
  ],
};

/**
 * Custom validation for conditional fields
 */
export const conditionalValidation = (
  condition: (req: Request) => boolean,
  validations: ValidationChain[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return Promise.all(validations.map(validation => validation.run(req)))
        .then(() => next());
    }
    next();
  };
};

/**
 * Sanitize input middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize strings in request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
};

/**
 * User validation rules
 */
export const userValidations = {
  updateProfile: [
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar must be a valid URL'),
    body('coverImage')
      .optional()
      .isURL()
      .withMessage('Cover image must be a valid URL'),
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      }),
  ],
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Skip sanitization for URLs (especially for image URLs)
        if (isUrl(obj[key])) {
          continue;
        }
        
        // Basic XSS protection for non-URL strings
        obj[key] = obj[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

/**
 * Simple URL detection
 */
function isUrl(string: string): boolean {
  try {
    return string.startsWith('http://') || string.startsWith('https://') || string.startsWith('/uploads/');
  } catch {
    return false;
  }
}

export default {
  handleValidationErrors,
  commonValidations,
  authValidations,
  userValidations,
  postValidations,
  commentValidations,
  fileValidations,
  conditionalValidation,
  sanitizeInput,
};
