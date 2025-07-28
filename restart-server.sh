#!/bin/bash

echo "🔍 Checking for processes on port 3000..."
PORT_PROCESS=$(lsof -ti:3000)

if [ ! -z "$PORT_PROCESS" ]; then
    echo "🛑 Killing processes on port 3000: $PORT_PROCESS"
    kill -9 $PORT_PROCESS
    sleep 2
else
    echo "✅ Port 3000 is free"
fi

echo "🧹 Cleaning up build artifacts..."
rm -rf dist/

echo "🔨 Building the application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
    echo "🚀 Starting the server..."
    npm start
else
    echo "❌ Build failed. Please fix the build errors first."
    exit 1
fi
