#!/bin/bash

# Infinity Angles Backend Deployment Script
# This script builds and deploys the backend application

set -e

echo "🚀 Starting Infinity Angles Backend Deployment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
    echo "✅ Environment variables loaded"
else
    echo "⚠️  No .env file found. Using default values."
fi

# Build the application
echo "📦 Building TypeScript application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully"

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed!"
    exit 1
fi

echo "✅ All tests passed"

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t infinity-angles-backend:latest .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker image built successfully"

# Tag for production
echo "🏷️  Tagging for production..."
docker tag infinity-angles-backend:latest infinity-angles-backend:$(date +%Y%m%d%H%M%S)

# Check if running in production mode
if [ "$NODE_ENV" = "production" ]; then
    echo "🌐 Deploying to production..."
    
    # Stop existing containers
    docker-compose down
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to start..."
    sleep 30
    
    # Health check
    echo "🏥 Performing health check..."
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ Health check passed - Deployment successful!"
    else
        echo "❌ Health check failed - Deployment may have issues"
        docker-compose logs api
        exit 1
    fi
    
else
    echo "🛠️  Development mode - starting services..."
    docker-compose -f docker-compose.dev.yml up -d
fi

echo "🎉 Deployment completed successfully!"
echo "📊 API is running at: http://localhost:3000"
echo "📚 API Documentation: http://localhost:3000/api/docs"
echo "🗄️  Database: MongoDB on port 27017"
echo "🔴 Cache: Redis on port 6379"

# Show running containers
echo "📋 Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
