const { body, query, param, validationResult } = require('express-validator');
const config = require('../config/config');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Auth validations
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('fullName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name is required and must be less than 100 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Bio must be less than 200 characters')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateUpdateProfile = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be less than 100 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  
  body('avatar')
    .optional()
    .custom((value) => {
      // Allow relative paths starting with /uploads/ or valid URLs
      if (value.startsWith('/uploads/') || value.match(/^https?:\/\/.+/)) {
        return true;
      }
      throw new Error('Avatar must be a valid URL or relative path');
    }),
  
  body('coverImage')
    .optional()
    .custom((value) => {
      // Allow relative paths starting with /uploads/ or valid URLs
      if (value.startsWith('/uploads/') || value.match(/^https?:\/\/.+/)) {
        return true;
      }
      throw new Error('Cover image must be a valid URL or relative path');
    }),
  
  body('location.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  
  body('location.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must be less than 100 characters'),
  
  body('location.country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must be less than 100 characters'),
  
  body('profession')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Profession must be less than 100 characters'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company must be less than 100 characters'),
  
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  
  body('socialLinks.twitter')
    .optional()
    .isURL()
    .withMessage('Twitter link must be a valid URL'),
  
  body('socialLinks.linkedin')
    .optional()
    .isURL()
    .withMessage('LinkedIn link must be a valid URL'),
  
  body('socialLinks.github')
    .optional()
    .isURL()
    .withMessage('GitHub link must be a valid URL'),
  
  body('socialLinks.instagram')
    .optional()
    .isURL()
    .withMessage('Instagram link must be a valid URL')
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Post validations
const validateCreatePost = [
  body('content')
    .trim()
    .isLength({ min: 1, max: config.posts.maxContentLength })
    .withMessage(`Content is required and must be less than ${config.posts.maxContentLength} characters`),
  
  body('category')
    .optional()
    .isIn(['General', 'Identification', 'Thought', 'Research', 'Structure', 'Ideologies', 'Ideas', 'Inventions', 'Innovations', 'Businesses', 'Ventures', 'Startups', 'Companies', 'Branches', 'Investments', 'Partnerships', 'Networth'])
    .withMessage('Invalid category'),
  
  body('tags')
    .optional()
    .isArray({ max: config.posts.maxTagsPerPost })
    .withMessage(`Maximum ${config.posts.maxTagsPerPost} tags allowed`),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
];

const validateUpdatePost = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: config.posts.maxContentLength })
    .withMessage(`Content must be less than ${config.posts.maxContentLength} characters`),
  
  body('category')
    .optional()
    .isIn(['General', 'Identification', 'Thought', 'Research', 'Structure', 'Ideologies', 'Ideas', 'Inventions', 'Innovations', 'Businesses', 'Ventures', 'Startups', 'Companies', 'Branches', 'Investments', 'Partnerships', 'Networth'])
    .withMessage('Invalid category'),
  
  body('tags')
    .optional()
    .isArray({ max: config.posts.maxTagsPerPost })
    .withMessage(`Maximum ${config.posts.maxTagsPerPost} tags allowed`),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
];

const validatePostQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: config.api.maxPageSize })
    .withMessage(`Limit must be between 1 and ${config.api.maxPageSize}`),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('category')
    .optional()
    .isIn(['all', 'Ideologies', 'Ideas', 'Inventions', 'Innovations', 'Businesses', 'Ventures', 'Startups', 'Companies', 'Branches', 'Investments', 'Partnerships', 'Networth', 'General'])
    .withMessage('Invalid category'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

// MongoDB ObjectId validation
const validateObjectId = (field = 'id') => [
  param(field)
    .isMongoId()
    .withMessage('Invalid ID format')
];

// Legacy UUID validation (for backward compatibility)
const validateUUID = [
  param('id')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    .withMessage('Invalid UUID format')
];

// Comment validations
const validateCreateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment content is required and must be less than 500 characters'),
  
  body('parentComment')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID')
];

// Legacy feed validations (for backward compatibility)
const validateCreateFeed = [
  body('author')
    .trim()
    .notEmpty()
    .withMessage('Author is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Author must be between 2 and 100 characters'),
  
  body('authorRole')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Author role must be less than 50 characters'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Content must be between 10 and 1000 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Category must be less than 30 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      return true;
    })
];

const validateUpdateFeed = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Content must be between 10 and 1000 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Category must be less than 30 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      return true;
    })
];

const validateFeedQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  
  query('category')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Category must be less than 30 characters'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

module.exports = {
  handleValidationErrors,
  
  // Auth validations
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  
  // Post validations
  validateCreatePost,
  validateUpdatePost,
  validatePostQuery,
  validateObjectId,
  validateCreateComment,
  
  // Legacy feed validations (backward compatibility)
  validateCreateFeed,
  validateUpdateFeed,
  validateFeedQuery,
  validateUUID
};
