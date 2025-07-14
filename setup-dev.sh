#!/bin/bash

# Infinity Angles Backend Development Setup Script

set -e

echo "🛠️  Setting up Infinity Angles Backend Development Environment..."

# Check Node.js version
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"

if [[ ! "$NODE_VERSION" =~ ^v1[8-9] ]] && [[ ! "$NODE_VERSION" =~ ^v[2-9][0-9] ]]; then
    echo "⚠️  Warning: Node.js 18+ is recommended. Current version: $NODE_VERSION"
fi

# Install dependencies
echo "📥 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies!"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please update .env with your actual configuration values"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads/avatars uploads/posts uploads/temp logs

# Set up pre-commit hooks
echo "🪝 Setting up pre-commit hooks..."
npm run prepare

# Run initial build
echo "🔨 Running initial build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Initial build failed!"
    exit 1
fi

echo "✅ Initial build completed"

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -ne 0 ]; then
    echo "⚠️  Some tests failed. Please check the output above."
else
    echo "✅ All tests passed"
fi

# Check if MongoDB is running
echo "🗄️  Checking MongoDB connection..."
if command -v mongosh >/dev/null 2>&1; then
    if mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1; then
        echo "✅ MongoDB is running and accessible"
    else
        echo "⚠️  MongoDB is not running. Please start MongoDB or update MONGODB_URI in .env"
    fi
else
    echo "⚠️  MongoDB shell (mongosh) not found. Please install MongoDB or use Docker"
fi

# Check if Redis is running (optional)
if command -v redis-cli >/dev/null 2>&1; then
    if redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis is running and accessible"
    else
        echo "ℹ️  Redis is not running (optional). You can start it with: redis-server"
    fi
else
    echo "ℹ️  Redis not found (optional). Install Redis for caching support"
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📋 Available commands:"
echo "  npm run dev          - Start development server with hot reload"
echo "  npm run build        - Build for production"
echo "  npm run start        - Start production server"
echo "  npm test             - Run tests"
echo "  npm run test:watch   - Run tests in watch mode"
echo "  npm run lint         - Lint code"
echo "  npm run lint:fix     - Fix linting issues"
echo ""
echo "🚀 To start development:"
echo "  1. Update .env with your configuration"
echo "  2. Start MongoDB (if not using Docker)"
echo "  3. Run: npm run dev"
echo ""
echo "📚 API Documentation will be available at: http://localhost:3000/api/docs"
