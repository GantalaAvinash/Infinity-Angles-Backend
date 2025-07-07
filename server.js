const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

// Import database connection
const Database = require('./config/database');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Import routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const feedsRoutes = require('./routes/feeds'); // Keep for backward compatibility
const imageRoutes = require('./routes/images');

// Import services
const PostCleanupService = require('./services/postCleanupService');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
Database.connect();

// Middleware
app.use(helmet());
app.use(cors());

// JSON body parser - with size limit and error handling
app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('application/json')) {
    console.log('📦 JSON request detected:', req.method, req.path);
    console.log('📏 Content-Length:', req.headers['content-length']);
  }
  next();
});

// Add custom JSON error handling
app.use('/api', (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ JSON Syntax Error:', err.message);
    console.error('� URL:', req.method, req.originalUrl);
    console.error('📋 Headers:', req.headers);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format',
      error: 'The request body contains malformed JSON'
    });
  }
  next(err);
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use(logger);

// Additional debug logging for image uploads
app.use('/api/images', (req, res, next) => {
  console.log(`📸 Image API request: ${req.method} ${req.path}`);
  console.log('🌍 Request origin:', req.ip);
  console.log('📋 Content-Type:', req.headers['content-type']);
  console.log('🔑 Authorization:', req.headers['authorization'] ? 'Present' : 'Missing');
  next();
});

// Serve static files (images)
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await Database.healthCheck();
    
    res.json({ 
      status: 'OK', 
      message: 'Backend is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/feeds', feedsRoutes); // Keep for backward compatibility
app.use('/api/images', imageRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`📱 For mobile devices: http://192.168.1.5:${PORT}/api`);
  console.log(`🤖 For Android emulator: http://10.0.2.2:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📂 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start post cleanup service
  PostCleanupService.start();
});

module.exports = app;
