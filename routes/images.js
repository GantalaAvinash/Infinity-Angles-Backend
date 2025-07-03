const express = require('express');
const ImageController = require('../controllers/imageController');
const { uploadMultiple, processImage, handleUploadError } = require('../middleware/imageUpload');

const router = express.Router();

// POST /api/images/upload - Upload multiple images
router.post('/upload', 
  uploadMultiple,
  handleUploadError,
  processImage,
  ImageController.uploadImages
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
