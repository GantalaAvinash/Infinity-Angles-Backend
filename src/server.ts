// Setup module aliases before any imports
import moduleAlias from 'module-alias';
import path from 'path';

// Register module aliases
moduleAlias.addAliases({
  '@': path.join(__dirname),
  '@/config': path.join(__dirname, 'config'),
  '@/controllers': path.join(__dirname, 'controllers'),
  '@/middleware': path.join(__dirname, 'middleware'),
  '@/models': path.join(__dirname, 'models'),
  '@/routes': path.join(__dirname, 'routes'),
  '@/services': path.join(__dirname, 'services'),
  '@/utils': path.join(__dirname, 'utils'),
  '@/types': path.join(__dirname, 'types'),
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { Server } from 'http';

// Import configurations
import { config, corsConfig, rateLimitConfig, validateConfig } from '@/config';
import { database } from '@/config/database';

// Import middleware
import { globalErrorHandler, notFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler, gracefulShutdownHandler, requestTimeout, rateLimitHandler } from '@/middleware/errorHandler';
import { sanitizeInput } from '@/middleware/validation';
import { logger, loggerStream } from '@/utils/logger';

// Import routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import postRoutes from '@/routes/posts';
import uploadRoutes from '@/routes/upload-simple';
import healthRoutes from '@/routes/health';

// Import async error handling
import 'express-async-errors';

/**
 * Application class
 */
class Application {
  public app: express.Application;
  private server: Server | null = null;

  constructor() {
    this.app = express();
    this.initializeGlobalHandlers();
    this.validateEnvironment();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize global error handlers
   */
  private initializeGlobalHandlers(): void {
    uncaughtExceptionHandler();
    unhandledRejectionHandler();
  }

  /**
   * Validate environment configuration
   */
  private validateEnvironment(): void {
    try {
      validateConfig();
      logger.info('Environment configuration validated successfully');
    } catch (error) {
      logger.error('Environment configuration validation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // Trust proxy if behind reverse proxy
    if (config.TRUST_PROXY) {
      this.app.set('trust proxy', 1);
    }

    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }));

    // CORS
    this.app.use(cors(corsConfig));

    // Rate limiting
    const limiter = rateLimit({
      ...rateLimitConfig,
      handler: rateLimitHandler,
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Security sanitization
    this.app.use(mongoSanitize());
    this.app.use(hpp());
    this.app.use(sanitizeInput);

    // Request timeout
    this.app.use(requestTimeout(30000));

    // Logging middleware
    if (config.NODE_ENV !== 'test') {
      const morgan = require('morgan');
      this.app.use(morgan('combined', { stream: loggerStream }));
    }

    
    logger.info('Middleware initialized successfully');
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Serve uploaded files statically
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Health check (before rate limiting for monitoring)
    this.app.use('/api/health', healthRoutes);

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/posts', postRoutes);
    this.app.use('/api/upload', uploadRoutes);

    // API documentation
    if (config.NODE_ENV !== 'production') {
      this.setupSwagger();
    }

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Infinity Angles API v2.0',
        version: '2.0.0',
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
        documentation: config.NODE_ENV !== 'production' ? '/api/docs' : undefined,
      });
    });

    logger.info('Routes initialized successfully');
  }

  /**
   * Setup Swagger documentation
   */
  private setupSwagger(): void {
    try {
      const swaggerUi = require('swagger-ui-express');
      const swaggerJsdoc = require('swagger-jsdoc');

      const options = {
        definition: {
          openapi: '3.0.0',
          info: {
            title: 'Infinity Angles API',
            version: '2.0.0',
            description: 'Production-ready social media platform API',
            contact: {
              name: 'Infinity Angles Team',
              email: 'support@infinityangles.com',
            },
          },
          servers: [
            {
              url: `http://localhost:${config.PORT}/api`,
              description: 'Development server',
            },
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
            },
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
        apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
      };

      const specs = swaggerJsdoc(options);
      this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

      logger.info('Swagger documentation available at /api/docs');
    } catch (error) {
      logger.warn('Failed to setup Swagger documentation:', error);
    }
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(globalErrorHandler);

    logger.info('Error handling initialized successfully');
  }

  /**
   * Connect to database
   */
  private async connectDatabase(): Promise<void> {
    try {
      await database.connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.connectDatabase();

      // Start HTTP server
      this.server = this.app.listen(config.PORT, () => {
        logger.info(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
        logger.info(`📚 Health check available at http://localhost:${config.PORT}/api/health`);
        
        if (config.NODE_ENV !== 'production') {
          logger.info(`📖 API documentation available at http://localhost:${config.PORT}/api/docs`);
        }
      });

      // Setup graceful shutdown
      gracefulShutdownHandler(this.server);

      // Log startup completion
      logger.info('🎉 Application started successfully');

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    try {
      if (this.server) {
        this.server.close();
        logger.info('Server stopped');
      }

      await database.disconnect();
      logger.info('Application stopped successfully');
    } catch (error) {
      logger.error('Error stopping application:', error);
      throw error;
    }
  }

  /**
   * Get Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Create and start application
const application = new Application();

// Start server if not in test environment
if (config.NODE_ENV !== 'test') {
  application.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default application;
export { Application };
