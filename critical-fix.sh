#!/bin/bash

# CRITICAL FIX: Force MongoDB Atlas Connection
# This script will ensure the correct environment variables are loaded

echo "🚨 CRITICAL FIX: MongoDB Atlas Connection"
echo "========================================"

# Configuration
EC2_IP="43.205.255.217"
EC2_USER="ec2-user"
KEY_PATH="~/.ssh/your-key.pem"  # Replace with your actual key path
REMOTE_PATH="/home/ec2-user/infinity-angles-backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to run commands on EC2
run_remote() {
    ssh -i "$KEY_PATH" "$EC2_USER@$EC2_IP" "$1"
}

# Function to copy files to EC2
copy_to_ec2() {
    scp -i "$KEY_PATH" -r "$1" "$EC2_USER@$EC2_IP:$2"
}

echo -e "${GREEN}Step 1: Stopping all applications...${NC}"
run_remote "cd $REMOTE_PATH && pm2 stop all && pm2 delete all"

echo -e "${GREEN}Step 2: Uploading fixed server.js...${NC}"
copy_to_ec2 "server.js" "$REMOTE_PATH/"

echo -e "${GREEN}Step 3: Creating correct .env file...${NC}"
run_remote "
    cd $REMOTE_PATH
    
    # Remove any existing .env file
    rm -f .env
    
    # Create the correct .env file with MongoDB Atlas connection
    cat > .env << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=production

# MongoDB Configuration - AWS Production
MONGODB_URI=mongodb+srv://gantalaavinash:test1234@cluster0.igo3u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_TEST_URI=mongodb+srv://gantalaavinash:test1234@cluster0.igo3u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration
JWT_SECRET=616ea3a53026dd479902190b00fa7a0fc5e86318f8bcef28c1f4783b3e73953f
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=*

# Image Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads/images

# Post Auto-Delete Configuration (24 hours in milliseconds)
POST_DELETE_INTERVAL=86400000
EOF

    echo '✅ .env file created'
    echo '📋 Contents:'
    head -10 .env
"

echo -e "${GREEN}Step 4: Testing environment variables...${NC}"
run_remote "
    cd $REMOTE_PATH
    
    # Test if environment variables are loaded correctly
    node -e \"
    require('dotenv').config();
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'CONFIGURED' : 'NOT SET');
    console.log('Full URI:', process.env.MONGODB_URI);
    \"
"

echo -e "${GREEN}Step 5: Testing direct MongoDB connection...${NC}"
run_remote "
    cd $REMOTE_PATH
    
    # Test MongoDB connection
    node -e \"
    require('dotenv').config();
    const mongoose = require('mongoose');
    const uri = process.env.MONGODB_URI;
    
    console.log('Testing connection to:', uri);
    
    mongoose.connect(uri, { 
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    })
    .then(() => {
      console.log('✅ MongoDB Atlas connection successful!');
      console.log('Database:', mongoose.connection.name);
      console.log('Host:', mongoose.connection.host);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ MongoDB connection failed:', err.message);
      process.exit(1);
    });
    \"
"

echo -e "${GREEN}Step 6: Starting application...${NC}"
run_remote "
    cd $REMOTE_PATH
    
    # Start with explicit environment
    NODE_ENV=production pm2 start server.js --name infinity-angles-backend
    pm2 save
"

echo -e "${GREEN}Step 7: Monitoring startup...${NC}"
sleep 10
run_remote "
    pm2 status
    echo ''
    echo '📋 Application logs:'
    pm2 logs --lines 15
"

echo -e "${GREEN}Step 8: Testing health endpoint...${NC}"
run_remote "
    sleep 5
    echo 'Testing localhost health:'
    curl -s http://localhost:3000/health || echo 'Local health check failed'
"

echo ""
echo -e "${GREEN}🎉 Critical Fix Complete!${NC}"
echo "========================================"
echo "🏥 Health Check: http://$EC2_IP/health"
echo "📊 Monitor: ssh -i $KEY_PATH $EC2_USER@$EC2_IP 'pm2 monit'"
echo ""
echo -e "${YELLOW}Expected Results:${NC}"
echo "✅ Environment: production"
echo "✅ MongoDB URI: CONFIGURED"
echo "✅ Connection: MongoDB Atlas"
echo "✅ Health endpoint: Working"
