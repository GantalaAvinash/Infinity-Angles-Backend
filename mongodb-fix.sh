#!/bin/bash

# MongoDB Connection Fix Script for AWS EC2 Deployment
# This script fixes the bufferMaxEntries error and other connection issues

echo "🔧 MongoDB Connection Fix for Infinity Angles Backend"
echo "=================================================="

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

echo -e "${GREEN}Step 1: Stopping current application...${NC}"
run_remote "cd $REMOTE_PATH && pm2 stop all && pm2 delete all"

echo -e "${GREEN}Step 2: Uploading fixed configuration files...${NC}"
copy_to_ec2 "config/config.js" "$REMOTE_PATH/config/"
copy_to_ec2 "config/database-simple.js" "$REMOTE_PATH/config/"
copy_to_ec2 "ecosystem.config.js" "$REMOTE_PATH/"
copy_to_ec2 ".env.production" "$REMOTE_PATH/.env"

echo -e "${GREEN}Step 3: Testing MongoDB connection...${NC}"
run_remote "
    cd $REMOTE_PATH
    # Test MongoDB connection with Node.js
    node -e \"
    const mongoose = require('mongoose');
    const uri = 'mongodb+srv://gantalaavinash:test1234@cluster0.igo3u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    
    mongoose.connect(uri, { 
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    })
    .then(() => {
      console.log('✅ MongoDB connection test successful');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ MongoDB connection test failed:', err.message);
      process.exit(1);
    });
    \"
"

echo -e "${GREEN}Step 4: Starting application with fixed configuration...${NC}"
run_remote "
    cd $REMOTE_PATH
    export NODE_ENV=production
    pm2 start ecosystem.config.js --env production
    pm2 save
"

echo -e "${GREEN}Step 5: Checking application status...${NC}"
sleep 10
run_remote "
    pm2 status
    echo ''
    echo '📋 Recent logs:'
    pm2 logs --lines 10
"

echo -e "${GREEN}Step 6: Testing health endpoint...${NC}"
run_remote "
    sleep 5
    curl -s http://localhost:3000/health | head -5
"

echo ""
echo -e "${GREEN}🎉 MongoDB Connection Fix Complete!${NC}"
echo "=========================================="
echo "🏥 Health Check: http://$EC2_IP/health"
echo "🌐 API Base: http://$EC2_IP/api"
echo "📊 Monitor: ssh -i $KEY_PATH $EC2_USER@$EC2_IP 'pm2 monit'"
echo ""
echo -e "${YELLOW}If issues persist, check:${NC}"
echo "1. MongoDB Atlas IP whitelist (add 0.0.0.0/0 temporarily)"
echo "2. MongoDB Atlas user permissions"
echo "3. Network connectivity from EC2 to MongoDB Atlas"
