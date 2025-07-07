require('dotenv').config();

// Configuration settings for the application
const config = {
  // Server settings
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },

  // Database settings
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infinity_angles',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/infinity_angles_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
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

  // Feed/Post settings
  posts: {
    maxContentLength: 1000,
    maxTagsPerPost: 10,
    maxImagesPerPost: 5,
    autoDeleteInterval: parseInt(process.env.POST_DELETE_INTERVAL) || 24 * 60 * 60 * 1000 // 24 hours
  },

  // User settings
  user: {
    maxUsernameLength: 50,
    minPasswordLength: 6,
    maxBioLength: 200
  },

  // Image upload settings
  images: {
    uploadPath: process.env.UPLOAD_PATH || './uploads/images',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
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
