#!/bin/bash

# Deployment Script for Infinity Angles Backend
# This script handles the complete deployment process including index cleanup

echo "🚀 Starting deployment process..."

# Step 1: Stop PM2 processes
echo "🛑 Stopping PM2 processes..."
pm2 kill

# Step 2: Pull latest changes
echo "📥 Pulling latest changes from repository..."
git stash push --include-untracked
git pull origin main

# Step 3: Install dependencies (if package.json changed)
echo "📦 Installing dependencies..."
npm ci --production

# Step 4: Build the application
echo "🔨 Building application..."
npm run build

# Step 5: Clean up problematic indexes
echo "🧹 Cleaning up duplicate indexes..."
node cleanup-indexes-targeted.js

# Step 6: Start the application
echo "▶️  Starting application with PM2..."
pm2 start ecosystem.config.js

# Step 7: Check status
echo "📊 Application status:"
pm2 status

echo "✅ Deployment completed successfully!"
echo "📝 Check logs with: pm2 logs"
