#!/usr/bin/env node

/**
 * Targeted Index Cleanup Script
 * This script only drops the specific duplicate indexes that are causing warnings
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinity_angles_new';

async function targetedCleanup() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const userCollection = db.collection('users');
    const postCollection = db.collection('posts');

    console.log('\n🎯 Targeting specific problematic indexes...');

    // List of problematic index names to drop
    const problematicIndexes = [
      // User collection
      { collection: userCollection, name: 'email_1' },
      { collection: userCollection, name: 'username_1' },
      { collection: userCollection, name: 'metadata.lastLogin_-1' },
      
      // Post collection  
      { collection: postCollection, name: 'author_1_createdAt_-1' },
      { collection: postCollection, name: 'createdAt_-1' },
      { collection: postCollection, name: 'tags_1' },
      { collection: postCollection, name: 'metadata.likesCount_-1' },
      { collection: postCollection, name: 'metadata.createdAt_-1' },
      { collection: postCollection, name: 'location.coordinates_2dsphere' },
    ];

    for (const { collection, name } of problematicIndexes) {
      try {
        await collection.dropIndex(name);
        console.log(`  ✅ Dropped index: ${name}`);
      } catch (err) {
        if (err.code === 27 || err.message.includes('index not found')) {
          console.log(`  ℹ️  Index ${name} not found (already dropped or never existed)`);
        } else {
          console.log(`  ⚠️  Error dropping ${name}: ${err.message}`);
        }
      }
    }

    console.log('\n✨ Targeted cleanup completed!');
    console.log('🚀 Restart your application to let Mongoose recreate indexes properly.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔗 Disconnected from MongoDB');
    process.exit(0);
  }
}

if (require.main === module) {
  targetedCleanup().catch(console.error);
}

module.exports = targetedCleanup;
