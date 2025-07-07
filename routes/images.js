const express = require('express');
const ImageController = require('../controllers/imageController');
const { uploadSingle, uploadMultiple, processImage, handleUploadError } = require('../middleware/imageUpload');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/images/upload - Upload single profile image (avatar or cover)
router.post('/upload', 
  authenticate,
  uploadSingle,
  handleUploadError,
  processImage,
  ImageController.uploadProfileImage
);

// POST /api/images/multiple-upload - Upload multiple images
router.post('/multiple-upload', 
  authenticate,
  uploadMultiple,
  handleUploadError,
  processImage,
  ImageController.uploadImages
);

// POST /api/images/profile-upload - Upload single profile image (avatar or cover)
router.post('/profile-upload', 
  authenticate,
  uploadSingle,
  handleUploadError,
  processImage,
  ImageController.uploadProfileImage
);

// GET /api/images/:filename - Get image by filename
router.get('/:filename', ImageController.getImage);

// GET /api/images/:filename/metadata - Get image metadata
router.get('/:filename/metadata', ImageController.getImageMetadata);

// GET /api/images/:filename/resize - Resize image on demand
router.get('/:filename/resize', ImageController.resizeImage);

// DELETE /api/images/:filename - Delete image
router.delete('/:filename', ImageController.deleteImage);

module.exports = router;
