# Emergency Fix Guide for AWS EC2 Deployment Issues

## Issues Identified:
1. ❌ Application running in development mode instead of production
2. ❌ Database connection trying to connect to localhost instead of MongoDB Atlas
3. ❌ Duplicate MongoDB schema indexes causing warnings
4. ❌ Deprecated MongoDB driver options

## Quick Fix Steps:

### 1. SSH into your EC2 instance:
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@43.205.255.217
```

### 2. Navigate to your application directory:
```bash
cd /home/ec2-user/infinity-angles-backend
```

### 3. Stop the current application:
```bash
pm2 stop all
```

### 4. Fix the environment configuration:
```bash
# Create a proper .env file for production
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
```

### 5. Start the application with proper environment:
```bash
# Delete all previous PM2 processes
pm2 delete all

# Start with production environment
NODE_ENV=production pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
```

### 6. Verify the fix:
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs --lines 20

# Test health endpoint
curl http://localhost:3000/health

# Check if environment is now production
pm2 logs | grep "Environment:"
```

### 7. Test from outside:
```bash
# From your local machine
curl http://43.205.255.217/health
```

## Alternative: Use the Emergency Fix Script

If you have the updated files locally, you can run the emergency fix script:

```bash
# Update the KEY_PATH in emergency-fix.sh with your actual key path
# Then run:
./emergency-fix.sh
```

## Expected Results After Fix:

✅ Environment should show: `📂 Environment: production`
✅ Database connection should succeed without timeout errors
✅ No more duplicate index warnings
✅ Health check should return proper response
✅ Application should be accessible at http://43.205.255.217/api

## Monitoring Commands:

```bash
# Check PM2 status
pm2 status

# View real-time logs
pm2 logs --lines 50

# Check specific app logs
pm2 logs infinity-angles-backend

# Restart if needed
pm2 restart infinity-angles-backend

# Check environment variables
pm2 env 0  # Replace 0 with your app ID
```

## If Issues Persist:

1. **Check MongoDB Atlas IP Whitelist**: Ensure your EC2 IP (43.205.255.217) is whitelisted in MongoDB Atlas
2. **Verify MongoDB Atlas credentials**: Make sure username/password are correct
3. **Check EC2 security groups**: Ensure outbound connections are allowed
4. **Review network connectivity**: Test if EC2 can reach MongoDB Atlas

```bash
# Test MongoDB connection from EC2
curl -I https://cluster0.igo3u.mongodb.net/

# Check if DNS resolution works
nslookup cluster0.igo3u.mongodb.net
```
