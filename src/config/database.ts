import mongoose from 'mongoose';
import { config, dbConfig } from '@/config';
import { logger } from '@/utils/logger';

class Database {
  private static instance: Database;
  private connection: mongoose.Connection | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (this.connection?.readyState === 1) {
        logger.info('Database already connected');
        return;
      }

      logger.info('Connecting to MongoDB...', {
        uri: this.sanitizeUri(dbConfig.uri || ''),
      });

      if (!dbConfig.uri) {
        throw new Error('MongoDB URI is required');
      }

      await mongoose.connect(dbConfig.uri, dbConfig.options);
      this.connection = mongoose.connection;

      this.setupEventListeners();

      logger.info('MongoDB connected successfully', {
        readyState: this.connection.readyState,
        host: this.connection.host,
        port: this.connection.port,
        name: this.connection.name,
      });
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.connection?.readyState === 0) {
        logger.info('Database already disconnected');
        return;
      }

      await mongoose.disconnect();
      this.connection = null;
      logger.info('MongoDB disconnected successfully');
    } catch (error) {
      logger.error('MongoDB disconnection error:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<{
    status: 'connected' | 'disconnected';
    readyState: number;
    host?: string;
    port?: number;
    name?: string;
  }> {
    if (!this.connection) {
      return { status: 'disconnected', readyState: 0 };
    }

    return {
      status: this.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: this.connection.readyState,
      host: this.connection.host,
      port: this.connection.port,
      name: this.connection.name,
    };
  }

  public getConnection(): mongoose.Connection | null {
    return this.connection;
  }

  public isConnected(): boolean {
    return this.connection?.readyState === 1;
  }

  private setupEventListeners(): void {
    if (!this.connection) return;

    this.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });

    this.connection.on('error', error => {
      logger.error('MongoDB connection error:', error);
    });

    this.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    this.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    this.connection.on('close', () => {
      logger.info('MongoDB connection closed');
    });

    // Handle process termination
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGUSR2', this.gracefulShutdown.bind(this)); // nodemon restart
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      logger.info('Received shutdown signal, closing database connection...');
      await this.disconnect();
      process.exit(0);
    } catch (error) {
      logger.error('Error during database shutdown:', error);
      process.exit(1);
    }
  }

  private sanitizeUri(uri: string): string {
    // Remove password from URI for logging
    return uri.replace(/:([^:@]*?)@/, ':****@');
  }

  // Development utilities
  public async dropDatabase(): Promise<void> {
    if (config.NODE_ENV !== 'development' && config.NODE_ENV !== 'test') {
      throw new Error('Database drop is only allowed in development or test environment');
    }

    if (!this.connection) {
      throw new Error('Database not connected');
    }

    await this.connection.dropDatabase();
    logger.warn('Database dropped');
  }

  public async clearCollections(): Promise<void> {
    if (config.NODE_ENV !== 'development' && config.NODE_ENV !== 'test') {
      throw new Error('Collection clearing is only allowed in development or test environment');
    }

    if (!this.connection?.db) {
      throw new Error('Database not connected');
    }

    const collections = await this.connection.db.collections();
    
    for (const collection of collections) {
      await collection.deleteMany({});
    }

    logger.warn('All collections cleared');
  }

  // Database statistics
  public async getStats(): Promise<any> {
    if (!this.connection?.db) {
      throw new Error('Database not connected');
    }

    return await this.connection.db.admin().serverStatus();
  }

  // Index management
  public async createIndexes(): Promise<void> {
    try {
      logger.info('Creating database indexes...');

      // User indexes
      await mongoose.model('User').collection.createIndex({ email: 1 }, { unique: true });
      await mongoose.model('User').collection.createIndex({ username: 1 }, { unique: true });
      await mongoose.model('User').collection.createIndex({ 'metadata.lastLogin': -1 });

      // Post indexes
      await mongoose.model('Post').collection.createIndex({ author: 1, createdAt: -1 });
      await mongoose.model('Post').collection.createIndex({ createdAt: -1 });
      await mongoose.model('Post').collection.createIndex({ tags: 1 });
      await mongoose.model('Post').collection.createIndex({ 'location.coordinates': '2dsphere' });

      // Comment indexes
      await mongoose.model('Comment').collection.createIndex({ post: 1, createdAt: -1 });
      await mongoose.model('Comment').collection.createIndex({ author: 1 });

      // Follow indexes
      await mongoose.model('Follow').collection.createIndex({ follower: 1, following: 1 }, { unique: true });
      await mongoose.model('Follow').collection.createIndex({ following: 1 });

      // Like indexes
      await mongoose.model('Like').collection.createIndex({ user: 1, target: 1, targetType: 1 }, { unique: true });

      // Notification indexes
      await mongoose.model('Notification').collection.createIndex({ recipient: 1, createdAt: -1 });
      await mongoose.model('Notification').collection.createIndex({ recipient: 1, isRead: 1 });

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating indexes:', error);
      // Don't throw error for index creation failures in production
      if (config.NODE_ENV === 'development') {
        throw error;
      }
    }
  }
}

export const database = Database.getInstance();
export default database;
