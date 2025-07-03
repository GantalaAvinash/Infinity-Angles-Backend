const express = require('express');
const FeedsController = require('../controllers/feedsController');
const { uploadMultiple, processImage, handleUploadError } = require('../middleware/imageUpload');
const {
  validateCreateFeed,
  validateUpdateFeed,
  validateFeedQuery,
  validateUUID,
  handleValidationErrors
} = require('../middleware/validation');

const router = express.Router();

// GET /api/feeds - Get all feeds with optional filtering and pagination
router.get('/', 
  validateFeedQuery,
  handleValidationErrors,
  FeedsController.getAllFeeds
);

// GET /api/feeds/stats - Get feed statistics
router.get('/stats', FeedsController.getFeedStats);

// GET /api/feeds/categories - Get all categories
router.get('/categories', FeedsController.getCategories);

// GET /api/feeds/:id - Get a specific feed by ID
router.get('/:id', 
  validateUUID,
  handleValidationErrors,
  FeedsController.getFeedById
);

// POST /api/feeds - Create a new feed
router.post('/', 
  uploadMultiple,
  handleUploadError,
  processImage,
  validateCreateFeed,
  handleValidationErrors,
  FeedsController.createFeed
);

// PUT /api/feeds/:id - Update a feed
router.put('/:id', 
  validateUUID,
  validateUpdateFeed,
  handleValidationErrors,
  FeedsController.updateFeed
);

// PATCH /api/feeds/:id/like - Like a feed
router.patch('/:id/like', 
  validateUUID,
  handleValidationErrors,
  FeedsController.likeFeed
);

// PATCH /api/feeds/:id/unlike - Unlike a feed
router.patch('/:id/unlike', 
  validateUUID,
  handleValidationErrors,
  FeedsController.unlikeFeed
);

// DELETE /api/feeds/:id - Delete a feed
router.delete('/:id', 
  validateUUID,
  handleValidationErrors,
  FeedsController.deleteFeed
);

module.exports = router;
