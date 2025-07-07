#!/bin/bash

# Emergency Fix Script for AWS EC2 Deployment
# This script will fix the environment and database connection issues

echo "🚨 Emergency Fix for Infinity Angles Backend"
echo "==========================================="

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

echo -e "${GREEN}Step 1: Uploading fixed configuration files...${NC}"
copy_to_ec2 ".env.production" "$REMOTE_PATH/.env"
copy_to_ec2 "config/" "$REMOTE_PATH/"
copy_to_ec2 "models/" "$REMOTE_PATH/"

echo -e "${GREEN}Step 2: Stopping current application...${NC}"
run_remote "cd $REMOTE_PATH && pm2 stop all"

echo -e "${GREEN}Step 3: Setting production environment...${NC}"
run_remote "
    cd $REMOTE_PATH
    # Set NODE_ENV to production
    export NODE_ENV=production
    echo 'NODE_ENV=production' > .env.local
    cat .env.production >> .env.local
    mv .env.local .env
    
    # Verify environment file
    echo '📋 Environment file contents:'
    head -10 .env
"

echo -e "${GREEN}Step 4: Starting application in production mode...${NC}"
run_remote "
    cd $REMOTE_PATH
    pm2 delete all
    NODE_ENV=production pm2 start ecosystem.config.js --env production
    pm2 save
"

echo -e "${GREEN}Step 5: Checking application status...${NC}"
run_remote "
    pm2 status
    pm2 logs --lines 20
"

echo -e "${GREEN}Step 6: Testing database connection...${NC}"
sleep 5
run_remote "curl -s http://localhost:3000/health | head -10"

echo ""
echo -e "${GREEN}🎉 Fix Complete!${NC}"
echo "🏥 Check health: http://$EC2_IP/health"
echo "📊 Monitor logs: ssh -i $KEY_PATH $EC2_USER@$EC2_IP 'pm2 logs'"
