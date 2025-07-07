const express = require('express');
const PostsController = require('../controllers/postsController');
const Post = require('../models/Post');
const { authenticate, optionalAuth, checkOwnership } = require('../middleware/auth');
const { uploadMultiple, processImage, handleUploadError } = require('../middleware/imageUpload');
const {
  validateCreatePost,
  validateUpdatePost,
  validatePostQuery,
  validateObjectId,
  handleValidationErrors
} = require('../middleware/authValidation');

const router = express.Router();

// Public routes with optional authentication
router.get('/', 
  optionalAuth,
  validatePostQuery,
  handleValidationErrors,
  PostsController.getAllPosts
);

router.get('/categories', PostsController.getCategories);

router.get('/stats', PostsController.getPostStats);

router.get('/:id', 
  optionalAuth,
  validateObjectId('id'),
  handleValidationErrors,
  PostsController.getPostById
);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

// Middleware to preprocess FormData fields
const preprocessFormData = (req, res, next) => {
  console.log('🔄 Preprocessing FormData fields');
  console.log('📦 Raw body:', req.body);
  
  // Convert tags from FormData format to array
  if (req.body) {
    const tags = [];
    
    // Look for tags in various formats
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('tags[') && key.endsWith(']')) {
        const value = req.body[key];
        if (value && value.trim()) {
          tags.push(value.trim());
        }
      }
    });
    
    // If we found indexed tags, replace the tags field
    if (tags.length > 0) {
      req.body.tags = tags;
      console.log('🏷️ Converted tags:', tags);
    }
    
    // Handle case where tags is sent as a comma-separated string
    if (req.body.tags && typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      console.log('🏷️ Split tags string:', req.body.tags);
    }
    
    // Ensure category has a default value
    if (!req.body.category || req.body.category === 'null' || req.body.category === 'undefined') {
      req.body.category = 'General';
    }
    
    console.log('✅ Preprocessed body:', req.body);
  }
  
  next();
};

// Conditional middleware for image uploads
const conditionalUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  console.log('📋 Conditional upload middleware - Content-Type:', contentType);
  console.log('📏 Content-Length:', req.headers['content-length']);
  
  // Only apply multer middleware if it's multipart/form-data
  if (contentType.includes('multipart/form-data')) {
    console.log('🖼️ Processing as multipart/form-data');
    uploadMultiple(req, res, (err) => {
      if (err) {
        console.error('❌ Upload middleware error:', err);
        return handleUploadError(err, req, res, next);
      }
      
      // Log what files were received
      console.log('📂 Files received:', req.files ? req.files.length : 0);
      if (req.files && req.files.length > 0) {
        console.log('📄 File details:', req.files.map(f => ({ 
          fieldname: f.fieldname, 
          originalname: f.originalname, 
          size: f.size 
        })));
      }
      
      processImage(req, res, next);
    });
  } else {
    console.log('📝 Processing as JSON request');
    // For JSON requests, set empty processedImages array
    req.processedImages = [];
    next();
  }
};

router.post('/', 
  conditionalUpload,
  preprocessFormData,
  validateCreatePost,
  handleValidationErrors,
  PostsController.createPost
);

router.get('/user/my-posts', 
  authenticate,
  PostsController.getMyPosts
);

router.put('/:id', 
  validateObjectId('id'),
  validateUpdatePost,
  handleValidationErrors,
  checkOwnership(Post),
  PostsController.updatePost
);

router.delete('/:id', 
  validateObjectId('id'),
  handleValidationErrors,
  checkOwnership(Post),
  PostsController.deletePost
);

router.patch('/:id/like', 
  validateObjectId('id'),
  handleValidationErrors,
  PostsController.toggleLike
);

module.exports = router;
