# AWS EC2 Deployment Guide for Infinity Angles Backend

## Prerequisites

1. **AWS EC2 Instance**: IP `43.205.255.217`
2. **SSH Key**: Your EC2 private key file (.pem)
3. **MongoDB Atlas**: Database URL configured
4. **Security Groups**: Ports 80, 443, 3000 open

## Option 1: Automated Deployment (Recommended)

```bash
# Make the deployment script executable
chmod +x deploy-aws.sh

# Update the script with your SSH key path
# Edit deploy-aws.sh and replace:
# KEY_PATH="~/.ssh/your-key.pem"  # Replace with your actual key path

# Run the deployment script
./deploy-aws.sh
```

## Option 2: Manual Deployment

### Step 1: Connect to EC2 Instance

```bash
# Replace with your actual key path
ssh -i ~/.ssh/your-key.pem ec2-user@43.205.255.217
```

### Step 2: Install Node.js and Dependencies

```bash
# Update system
sudo yum update -y

# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Git and other tools
sudo yum install -y git nginx
```

### Step 3: Upload Application Files

From your local machine:
```bash
# Copy files to EC2 (replace key path)
scp -i ~/.ssh/your-key.pem -r . ec2-user@43.205.255.217:/home/ec2-user/infinity-angles-backend/
```

### Step 4: Setup Application on EC2

```bash
# Navigate to application directory
cd /home/ec2-user/infinity-angles-backend

# Install dependencies
npm install --production

# Copy production environment
cp .env.production .env

# IMPORTANT: Edit .env file and replace <db_password> with your actual MongoDB password
nano .env

# Create necessary directories
mkdir -p logs uploads/images

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
```

### Step 5: Configure Nginx

```bash
# Create Nginx configuration
sudo tee /etc/nginx/conf.d/infinity-angles.conf > /dev/null <<EOF
server {
    listen 80;
    server_name 43.205.255.217;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /uploads/ {
        alias /home/ec2-user/infinity-angles-backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 6: Configure Firewall (if needed)

```bash
# For firewalld (if available)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Verification

Test your deployment:

```bash
# Check application health
curl http://43.205.255.217/health

# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# View application logs
pm2 logs infinity-angles-backend
```

## Important Configuration Updates

### 1. Database Password
Edit the `.env` file and replace `<db_password>` with your actual MongoDB Atlas password:
```bash
nano .env
# Replace: mongodb+srv://gantalaavinash:<db_password>@cluster0...
# With: mongodb+srv://gantalaavinash:YOUR_ACTUAL_PASSWORD@cluster0...
```

### 2. Update Mobile App Configuration
Update your mobile app configuration to use the new API endpoint:
```javascript
// In your React Native app
const API_BASE_URL = 'http://43.205.255.217/api';
```

### 3. Security Considerations
- Change the JWT secret in production
- Enable HTTPS with SSL certificate
- Restrict CORS origins to your domain
- Set up proper logging and monitoring

## Useful Commands

```bash
# PM2 Commands
pm2 status                          # Check status
pm2 logs infinity-angles-backend    # View logs
pm2 restart infinity-angles-backend # Restart app
pm2 stop infinity-angles-backend    # Stop app
pm2 delete infinity-angles-backend  # Remove app

# Nginx Commands
sudo systemctl restart nginx        # Restart Nginx
sudo systemctl reload nginx         # Reload configuration
sudo nginx -t                       # Test configuration

# System Commands
sudo systemctl status nginx         # Check Nginx status
netstat -tlnp | grep :80           # Check what's listening on port 80
```

## Troubleshooting

### Common Issues:

1. **Connection refused**: Check if PM2 is running and port 3000 is open
2. **502 Bad Gateway**: Application might be down, check PM2 logs
3. **Database connection failed**: Verify MongoDB connection string and password
4. **File upload issues**: Check uploads directory permissions

### Debugging Steps:

```bash
# Check if application is running
pm2 status

# Check application logs
pm2 logs infinity-angles-backend

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test direct connection to Node.js
curl http://localhost:3000/health

# Check system resources
htop
df -h
```

## SSL Certificate Setup (Optional)

For production, consider setting up SSL:

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## API Endpoints

Once deployed, your API will be available at:

- **Base URL**: `http://43.205.255.217/api`
- **Health Check**: `http://43.205.255.217/health`
- **Authentication**: `http://43.205.255.217/api/auth`
- **Posts**: `http://43.205.255.217/api/posts`
- **Images**: `http://43.205.255.217/uploads/`
