#!/bin/bash

# AWS EC2 Deployment Script for Infinity Angles Backend
# IP: 43.205.255.217

echo "🚀 Starting AWS EC2 Deployment for Infinity Angles Backend"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
EC2_IP="43.205.255.217"
EC2_USER="ec2-user"  # Default for Amazon Linux, change if using Ubuntu (ubuntu)
KEY_PATH="~/.ssh/your-key.pem"  # Replace with your actual key path
REMOTE_PATH="/home/ec2-user/infinity-angles-backend"
LOCAL_PATH="."

echo -e "${YELLOW}Configuration:${NC}"
echo "EC2 IP: $EC2_IP"
echo "EC2 User: $EC2_USER"
echo "Remote Path: $REMOTE_PATH"
echo ""

# Function to run commands on EC2
run_remote() {
    ssh -i "$KEY_PATH" "$EC2_USER@$EC2_IP" "$1"
}

# Function to copy files to EC2
copy_to_ec2() {
    scp -i "$KEY_PATH" -r "$1" "$EC2_USER@$EC2_IP:$2"
}

echo -e "${GREEN}Step 1: Testing SSH connection...${NC}"
if run_remote "echo 'SSH connection successful'"; then
    echo -e "${GREEN}✅ SSH connection established${NC}"
else
    echo -e "${RED}❌ SSH connection failed. Please check your key path and permissions${NC}"
    exit 1
fi

echo -e "${GREEN}Step 2: Installing Node.js and PM2 on EC2...${NC}"
run_remote "
    # Update system
    sudo yum update -y
    
    # Install Node.js 18.x
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
    
    # Install PM2 globally
    sudo npm install -g pm2
    
    # Install Git
    sudo yum install -y git
    
    # Create application directory
    mkdir -p $REMOTE_PATH
    mkdir -p $REMOTE_PATH/logs
    mkdir -p $REMOTE_PATH/uploads/images
"

echo -e "${GREEN}Step 3: Copying application files...${NC}"
copy_to_ec2 "$LOCAL_PATH/*" "$REMOTE_PATH/"

echo -e "${GREEN}Step 4: Setting up application on EC2...${NC}"
run_remote "
    cd $REMOTE_PATH
    
    # Install dependencies
    npm install --production
    
    # Copy production environment file
    cp .env.production .env
    
    # Set proper permissions
    chmod +x *.sh
    chmod -R 755 uploads/
    
    # Start application with PM2
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u $EC2_USER --hp /home/$EC2_USER
"

echo -e "${GREEN}Step 5: Setting up Nginx reverse proxy...${NC}"
run_remote "
    # Install Nginx
    sudo yum install -y nginx
    
    # Create Nginx configuration
    sudo tee /etc/nginx/conf.d/infinity-angles.conf > /dev/null <<EOF
server {
    listen 80;
    server_name $EC2_IP;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    location /uploads/ {
        alias $REMOTE_PATH/uploads/;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
}
EOF
    
    # Start and enable Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # Restart Nginx to apply configuration
    sudo systemctl restart nginx
"

echo -e "${GREEN}Step 6: Configuring firewall...${NC}"
run_remote "
    # Configure firewall (if firewalld is available)
    if systemctl is-active --quiet firewalld; then
        sudo firewall-cmd --permanent --add-port=80/tcp
        sudo firewall-cmd --permanent --add-port=443/tcp
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --reload
    fi
"

echo -e "${GREEN}Step 7: Final checks...${NC}"
run_remote "
    # Check PM2 status
    pm2 status
    
    # Check Nginx status
    sudo systemctl status nginx
    
    # Check if application is responding
    curl -f http://localhost:3000/health || echo 'Health check failed'
"

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=================================================="
echo -e "${YELLOW}Application URLs:${NC}"
echo "🌐 Main API: http://$EC2_IP/api"
echo "🏥 Health Check: http://$EC2_IP/health"
echo "📸 Images: http://$EC2_IP/uploads/"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "📱 SSH to server: ssh -i $KEY_PATH $EC2_USER@$EC2_IP"
echo "📊 Check PM2 status: pm2 status"
echo "📋 View logs: pm2 logs infinity-angles-backend"
echo "🔄 Restart app: pm2 restart infinity-angles-backend"
echo "🛑 Stop app: pm2 stop infinity-angles-backend"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update your mobile app to use: http://$EC2_IP/api"
echo "2. Replace <db_password> in .env file with your actual MongoDB password"
echo "3. Consider setting up SSL certificate for HTTPS"
echo "4. Set up monitoring and backups"
