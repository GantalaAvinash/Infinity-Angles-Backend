# 🚨 EMERGENCY: MongoDB Atlas Connection Fix

## Problem:
Application is connecting to `localhost:27017` instead of MongoDB Atlas.

## ROOT CAUSE:
The `.env` file is not being loaded properly, causing the app to use default localhost connection.

## IMMEDIATE SOLUTION:

### Step 1: SSH into EC2
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@43.205.255.217
cd /home/ec2-user/infinity-angles-backend
```

### Step 2: Stop Application
```bash
pm2 stop all
pm2 delete all
```

### Step 3: Create Correct .env File
```bash
# Remove existing .env file
rm -f .env

# Create new .env file with correct MongoDB Atlas connection
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

### Step 4: Verify Environment Variables
```bash
# Test if environment variables are loaded
node -e "
require('dotenv').config();
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'CONFIGURED' : 'NOT SET');
console.log('Full URI:', process.env.MONGODB_URI);
"
```

### Step 5: Test MongoDB Connection
```bash
# Test direct connection to MongoDB Atlas
node -e "
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
"
```

### Step 6: Start Application
```bash
# Start with explicit environment
NODE_ENV=production pm2 start server.js --name infinity-angles-backend
pm2 save
```

### Step 7: Verify Success
```bash
# Check PM2 status
pm2 status

# Check logs for successful connection
pm2 logs --lines 20

# Look for these SUCCESS indicators:
# ✅ Environment: production
# ✅ MONGODB_URI: ***CONFIGURED***
# ✅ Successfully connected to MongoDB
# ✅ Database: (database name)
# ✅ Host: (MongoDB Atlas host)
```

### Step 8: Test Health Endpoint
```bash
# Test local health endpoint
curl http://localhost:3000/health

# Test external health endpoint
curl http://43.205.255.217/health
```

## EXPECTED SUCCESS OUTPUT:
```
🔍 Environment Debug Info:
NODE_ENV: production
MONGODB_URI: ***CONFIGURED***
PORT: 3000
✅ Successfully connected to MongoDB
📍 Database: infinity_angles
🌐 Host: cluster0-shard-00-00.igo3u.mongodb.net
🚀 Server is running on port 3000
📂 Environment: production
```

## If Still Failing:

### Check MongoDB Atlas Settings:
1. **Network Access**: Add IP `43.205.255.217` to whitelist
2. **Database User**: Verify username `gantalaavinash` exists
3. **Password**: Verify password `test1234` is correct

### Test Network Connectivity:
```bash
# Test if EC2 can reach MongoDB Atlas
curl -I https://cluster0.igo3u.mongodb.net/

# Test DNS resolution
nslookup cluster0.igo3u.mongodb.net

# Test port connectivity
nc -zv cluster0.igo3u.mongodb.net 27017
```

### Alternative: Use Critical Fix Script
```bash
# From your local machine (update KEY_PATH first):
./critical-fix.sh
```

## SUCCESS CRITERIA:
- ✅ No more `localhost:27017` errors
- ✅ Environment shows `production`
- ✅ MongoDB URI shows `***CONFIGURED***`
- ✅ Database connection successful
- ✅ Health endpoint returns proper response
- ✅ API accessible at `http://43.205.255.217/api`
