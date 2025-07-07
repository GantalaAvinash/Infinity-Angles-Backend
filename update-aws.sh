#!/bin/bash

# Quick Update Script for AWS EC2 Deployment
# Usage: ./update-aws.sh

echo "🔄 Updating Infinity Angles Backend on AWS EC2"
echo "=============================================="

# Configuration
EC2_IP="43.205.255.217"
EC2_USER="ec2-user"
KEY_PATH="~/.ssh/your-key.pem"  # Replace with your actual key path
REMOTE_PATH="/home/ec2-user/infinity-angles-backend"

# Colors
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

echo -e "${GREEN}Step 1: Uploading updated files...${NC}"
copy_to_ec2 "server.js" "$REMOTE_PATH/"
copy_to_ec2 "package.json" "$REMOTE_PATH/"
copy_to_ec2 "controllers/" "$REMOTE_PATH/"
copy_to_ec2 "models/" "$REMOTE_PATH/"
copy_to_ec2 "routes/" "$REMOTE_PATH/"
copy_to_ec2 "middleware/" "$REMOTE_PATH/"
copy_to_ec2 "services/" "$REMOTE_PATH/"
copy_to_ec2 "config/" "$REMOTE_PATH/"
copy_to_ec2 "utils/" "$REMOTE_PATH/"

echo -e "${GREEN}Step 2: Installing dependencies and restarting...${NC}"
run_remote "
    cd $REMOTE_PATH
    npm install --production
    pm2 restart infinity-angles-backend
"

echo -e "${GREEN}Step 3: Checking status...${NC}"
run_remote "pm2 status"

echo ""
echo -e "${GREEN}🎉 Update Complete!${NC}"
echo "🏥 Check health: http://$EC2_IP/health"
