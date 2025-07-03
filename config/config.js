// Configuration settings for the application
const config = {
  // Server settings
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },

  // API settings
  api: {
    version: '1.0.0',
    prefix: '/api',
    defaultPageSize: 10,
    maxPageSize: 100
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // Rate limiting (if implemented)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },

  // Feed settings
  feeds: {
    maxContentLength: 1000,
    maxTagsPerFeed: 10,
    maxAuthorNameLength: 100,
    maxCategoryLength: 30,
    maxImagesPerFeed: 5
  },

  // Image upload settings
  images: {
    uploadPath: './uploads/images',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    thumbnailSizes: {
      small: { width: 150, height: 150 },
      medium: { width: 400, height: 400 },
      large: { width: 800, height: 600 }
    }
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

module.exports = config;
