// Request validation middleware
const { body, query, param, validationResult } = require('express-validator');

// Validation rules for creating a feed
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

// Validation rules for updating a feed
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

// Validation rules for query parameters
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

// Validation rules for UUID parameters
const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Invalid feed ID format')
];

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

module.exports = {
  validateCreateFeed,
  validateUpdateFeed,
  validateFeedQuery,
  validateUUID,
  handleValidationErrors
};
