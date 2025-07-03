const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Ensure upload directory exists
      await fs.mkdir(config.images.uploadPath, { recursive: true });
      cb(null, config.images.uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = uuidv4();
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueName}${extension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  if (config.images.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${config.images.allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.images.maxFileSize,
    files: config.feeds.maxImagesPerFeed
  },
  fileFilter: fileFilter
});

// Middleware for single image upload
const uploadSingle = upload.single('image');

// Middleware for multiple image upload
const uploadMultiple = upload.array('images', config.feeds.maxImagesPerFeed);

// Image processing middleware
const processImage = async (req, res, next) => {
  try {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];
    const processedImages = [];

    for (const file of files) {
      const imagePath = file.path;
      const filename = path.parse(file.filename).name;
      const extension = path.extname(file.filename);

      // Create thumbnails
      const thumbnails = {};
      
      for (const [size, dimensions] of Object.entries(config.images.thumbnailSizes)) {
        const thumbnailPath = path.join(
          config.images.uploadPath,
          `${filename}_${size}${extension}`
        );

        await sharp(imagePath)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toFile(thumbnailPath);

        thumbnails[size] = {
          url: `/uploads/images/${filename}_${size}${extension}`,
          width: dimensions.width,
          height: dimensions.height
        };
      }

      // Get image metadata
      const metadata = await sharp(imagePath).metadata();

      processedImages.push({
        id: uuidv4(),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/images/${file.filename}`,
        thumbnails: thumbnails,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        },
        uploadedAt: new Date()
      });
    }

    req.processedImages = processedImages;
    next();
  } catch (error) {
    next(error);
  }
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${config.images.maxFileSize / (1024 * 1024)}MB`
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum: ${config.feeds.maxImagesPerFeed} images`
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload'
      });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

// Clean up uploaded files on error
const cleanupFiles = async (files) => {
  if (!files) return;
  
  const filesToDelete = Array.isArray(files) ? files : [files];
  
  for (const file of filesToDelete) {
    try {
      await fs.unlink(file.path);
      
      // Also clean up thumbnails if they exist
      const filename = path.parse(file.filename).name;
      const extension = path.extname(file.filename);
      
      for (const size of Object.keys(config.images.thumbnailSizes)) {
        const thumbnailPath = path.join(
          config.images.uploadPath,
          `${filename}_${size}${extension}`
        );
        
        try {
          await fs.unlink(thumbnailPath);
        } catch (err) {
          // Thumbnail might not exist, ignore error
        }
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  processImage,
  handleUploadError,
  cleanupFiles
};
