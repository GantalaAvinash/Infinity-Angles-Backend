const mongoose = require('mongoose');

class Database {
  static async connect() {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinity_angles';
      
      // Use minimal, guaranteed-to-work options
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000
      };

      await mongoose.connect(uri, options);
      
      console.log('✅ Successfully connected to MongoDB');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);
      
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
      // Don't exit process, let PM2 handle restarts
      setTimeout(() => {
        console.log('🔄 Retrying MongoDB connection...');
        Database.connect();
      }, 5000);
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
