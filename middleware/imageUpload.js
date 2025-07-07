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
    files: config.posts.maxImagesPerPost
  },
  fileFilter: fileFilter
});

// Middleware for single image upload
const uploadSingle = (req, res, next) => {
  console.log('📁 Upload middleware called');
  console.log('📋 Content-Type:', req.headers['content-type']);
  console.log('📏 Content-Length:', req.headers['content-length']);
  
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Unexpected file field'
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    
    console.log('✅ Multer processing completed');
    console.log('📁 File uploaded:', !!req.file);
    if (req.file) {
      console.log('📄 File details:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    }
    next();
  });
};

// Middleware for multiple image upload
const uploadMultiple = upload.array('images', config.posts.maxImagesPerPost);

// Image processing middleware
const processImage = async (req, res, next) => {
  try {
    // Initialize processedImages array
    req.processedImages = [];
    
    if (!req.file && !req.files) {
      console.log('📂 No files to process, continuing...');
      return next();
    }

    const files = req.files || [req.file];
    console.log('🖼️ Processing', files.length, 'image(s)');
    
    const processedImages = [];

    // Construct base URL once for all images - use request host
    const protocol = req.protocol;
    const host = req.get('host');
    
    // Keep the original host for the URL so mobile devices can access images
    // Don't change localhost to network IP - let adb reverse handle it
    const baseUrl = `${protocol}://${host}`;
    console.log('🌐 Image URL base:', baseUrl);

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
          url: `${baseUrl}/uploads/images/${filename}_${size}${extension}`,
          width: dimensions.width,
          height: dimensions.height
        };
      }

      // Get image metadata
      const metadata = await sharp(imagePath).metadata();

      // Construct full URL for the image
      const imageUrl = `${baseUrl}/uploads/images/${file.filename}`;

      processedImages.push({
        id: uuidv4(),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: imageUrl,
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
  console.error('Image upload error:', error);
  
  if (error instanceof multer.MulterError) {
    console.error('Multer error details:', {
      code: error.code,
      field: error.field,
      message: error.message
    });
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${config.images.maxFileSize / (1024 * 1024)}MB`
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum: ${config.posts.maxImagesPerPost} images`
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload. Expected field name: "images"'
      });
    }
  }

  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  console.error('Unknown upload error:', error);
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
