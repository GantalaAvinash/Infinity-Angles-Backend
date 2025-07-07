# URGENT: MongoDB Connection Fix

## Issue: 
`MongoParseError: option buffermaxentries is not supported`

## Quick Fix Steps:

### 1. SSH into EC2:
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@43.205.255.217
cd /home/ec2-user/infinity-angles-backend
```

### 2. Stop Current App:
```bash
pm2 stop all
pm2 delete all
```

### 3. Fix Database Configuration:
```bash
# Edit config/config.js
nano config/config.js

# Replace the database options section with:
```

```javascript
// Database settings
database: {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infinity_angles',
  testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/infinity_angles_test',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000
  }
},
```

### 4. Test MongoDB Connection:
```bash
# Test connection directly
node -e "
const mongoose = require('mongoose');
const uri = 'mongodb+srv://gantalaavinash:test1234@cluster0.igo3u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(uri, { 
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000
})
.then(() => {
  console.log('✅ MongoDB connection successful');
  process.exit(0);
})
.catch((err) => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});
"
```

### 5. Fix Ecosystem Config:
```bash
# Edit ecosystem.config.js
nano ecosystem.config.js

# Change:
instances: 'max' → instances: 1
exec_mode: 'cluster' → exec_mode: 'fork'
```

### 6. Start Application:
```bash
export NODE_ENV=production
pm2 start ecosystem.config.js --env production
pm2 save
```

### 7. Verify:
```bash
pm2 status
pm2 logs --lines 20
curl http://localhost:3000/health
```

## Alternative: Use Fix Script

If you have the updated files locally:
```bash
# Update KEY_PATH in mongodb-fix.sh, then:
./mongodb-fix.sh
```

## Common Issues:

1. **MongoDB Atlas IP Whitelist**: Add your EC2 IP (43.205.255.217) to MongoDB Atlas Network Access
2. **Network Connectivity**: Ensure EC2 can reach MongoDB Atlas
3. **Credentials**: Verify username/password in connection string

## Test Commands:
```bash
# Check if EC2 can reach MongoDB Atlas
curl -I https://cluster0.igo3u.mongodb.net/

# Check DNS resolution
nslookup cluster0.igo3u.mongodb.net

# Check network connectivity
telnet cluster0.igo3u.mongodb.net 27017
```
