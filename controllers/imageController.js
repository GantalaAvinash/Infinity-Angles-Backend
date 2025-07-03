const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

class ImageController {
  // Upload images for a feed
  static uploadImages(req, res) {
    try {
      if (!req.processedImages || req.processedImages.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images uploaded'
        });
      }

      res.status(201).json({
        success: true,
        data: {
          images: req.processedImages,
          count: req.processedImages.length
        },
        message: 'Images uploaded successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading images',
        error: error.message
      });
    }
  }

  // Get image by filename
  static async getImage(req, res) {
    try {
      const { filename } = req.params;
      const imagePath = path.join(config.images.uploadPath, filename);

      // Check if file exists
      try {
        await fs.access(imagePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }

      // Set appropriate headers
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };

      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

      // Send file
      res.sendFile(path.resolve(imagePath));
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving image',
        error: error.message
      });
    }
  }

  // Delete image
  static async deleteImage(req, res) {
    try {
      const { filename } = req.params;
      const imagePath = path.join(config.images.uploadPath, filename);

      // Check if file exists
      try {
        await fs.access(imagePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }

      // Delete main image
      await fs.unlink(imagePath);

      // Delete thumbnails
      const name = path.parse(filename).name;
      const ext = path.extname(filename);

      for (const size of Object.keys(config.images.thumbnailSizes)) {
        const thumbnailPath = path.join(
          config.images.uploadPath,
          `${name}_${size}${ext}`
        );

        try {
          await fs.unlink(thumbnailPath);
        } catch (error) {
          // Thumbnail might not exist, ignore error
          console.warn(`Thumbnail not found: ${thumbnailPath}`);
        }
      }

      res.json({
        success: true,
        message: 'Image deleted successfully',
        data: { filename }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting image',
        error: error.message
      });
    }
  }

  // Get image metadata
  static async getImageMetadata(req, res) {
    try {
      const { filename } = req.params;
      const imagePath = path.join(config.images.uploadPath, filename);

      // Check if file exists
      try {
        await fs.access(imagePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }

      const stats = await fs.stat(imagePath);
      const sharp = require('sharp');
      const metadata = await sharp(imagePath).metadata();

      res.json({
        success: true,
        data: {
          filename,
          size: stats.size,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          hasProfile: !!metadata.icc,
          orientation: metadata.orientation,
          density: metadata.density,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving image metadata',
        error: error.message
      });
    }
  }

  // Resize image on demand
  static async resizeImage(req, res) {
    try {
      const { filename } = req.params;
      const { width, height, quality = 85 } = req.query;

      if (!width && !height) {
        return res.status(400).json({
          success: false,
          message: 'Width or height parameter required'
        });
      }

      const imagePath = path.join(config.images.uploadPath, filename);

      // Check if file exists
      try {
        await fs.access(imagePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }

      const sharp = require('sharp');
      let transform = sharp(imagePath);

      // Apply resize
      if (width || height) {
        transform = transform.resize(
          width ? parseInt(width) : null,
          height ? parseInt(height) : null,
          { 
            fit: 'inside',
            withoutEnlargement: true
          }
        );
      }

      // Apply quality if JPEG
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        transform = transform.jpeg({ quality: parseInt(quality) });
      }

      // Set headers
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };

      const mimeType = mimeTypes[ext] || 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      // Stream resized image
      transform.pipe(res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error resizing image',
        error: error.message
      });
    }
  }
}

module.exports = ImageController;
