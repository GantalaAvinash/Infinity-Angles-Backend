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

  // Index management - Indexes are automatically created by Mongoose schemas
  public async createIndexes(): Promise<void> {
    try {
      logger.info('Database indexes are automatically managed by Mongoose schemas');
      
      // Only create indexes for models that don't have schema definitions
      // All other indexes are automatically created by Mongoose from schema definitions
      
      logger.info('Database index management completed');
    } catch (error) {
      logger.error('Error with index management:', error);
      // Don't throw error for index creation failures in production
      if (config.NODE_ENV === 'development') {
        throw error;
      }
    }
  }
}

export const database = Database.getInstance();
export default database;
