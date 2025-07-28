#!/usr/bin/env node

/**
 * Index Cleanup Script
 * This script drops duplicate indexes that are causing warnings
 * and allows Mongoose to recreate them properly from schema definitions
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinity_angles_new';

async function cleanupIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get collections
    const userCollection = db.collection('users');
    const postCollection = db.collection('posts');

    console.log('\n📋 Current User Collection Indexes:');
    const userIndexes = await userCollection.indexes();
    userIndexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)} (${index.name})`);
    });

    console.log('\n📋 Current Post Collection Indexes:');
    const postIndexes = await postCollection.indexes();
    postIndexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)} (${index.name})`);
    });

    // Drop problematic indexes (keep _id_ as it's required)
    console.log('\n🧹 Cleaning up duplicate indexes...');

    try {
      // Drop all non-essential indexes for users collection
      const userIndexesToDrop = userIndexes.filter(idx => 
        idx.name !== '_id_' && 
        !idx.name.includes('email') && 
        !idx.name.includes('username')
      );
      
      for (const index of userIndexesToDrop) {
        try {
          await userCollection.dropIndex(index.name);
          console.log(`  ✅ Dropped user index: ${index.name}`);
        } catch (err) {
          console.log(`  ⚠️  Could not drop user index ${index.name}: ${err.message}`);
        }
      }

      // Drop all non-essential indexes for posts collection
      const postIndexesToDrop = postIndexes.filter(idx => idx.name !== '_id_');
      
      for (const index of postIndexesToDrop) {
        try {
          await postCollection.dropIndex(index.name);
          console.log(`  ✅ Dropped post index: ${index.name}`);
        } catch (err) {
          console.log(`  ⚠️  Could not drop post index ${index.name}: ${err.message}`);
        }
      }

    } catch (error) {
      console.error('Error dropping indexes:', error.message);
    }

    console.log('\n🔄 Indexes have been cleaned. Mongoose will recreate them from schema definitions on next startup.');
    console.log('✨ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔗 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupIndexes().catch(console.error);
}

module.exports = cleanupIndexes;
