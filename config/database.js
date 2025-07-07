const mongoose = require('mongoose');
const config = require('../config/config');

class Database {
  static async connect() {
    try {
      const uri = config.database.uri;
      const options = config.database.options;

      await mongoose.connect(uri, options);
      
      console.log('✅ Successfully connected to MongoDB');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('🔌 MongoDB disconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed due to app termination');
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  static async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  static getConnectionState() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }

  static async healthCheck() {
    try {
      const state = this.getConnectionState();
      if (state === 'connected') {
        // Perform a simple operation to verify connection
        await mongoose.connection.db.admin().ping();
        return {
          status: 'healthy',
          state: state,
          database: mongoose.connection.name,
          host: mongoose.connection.host,
          port: mongoose.connection.port
        };
      } else {
        return {
          status: 'unhealthy',
          state: state,
          message: 'Database not connected'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        state: this.getConnectionState(),
        error: error.message
      };
    }
  }
}

module.exports = Database;
