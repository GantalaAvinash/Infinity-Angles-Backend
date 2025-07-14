# Infinity Angles Backend v2.0

A production-ready, scalable backend API for the Infinity Angles social platform built with TypeScript, Express.js, and MongoDB.

## 🚀 Features

- **Modern Architecture**: Clean, modular TypeScript codebase
- **Authentication & Authorization**: JWT-based auth with refresh tokens
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Comprehensive request validation with express-validator
- **Security**: Helmet, CORS, rate limiting, input sanitization
- **Logging**: Structured logging with Winston
- **Testing**: Jest test suite with API testing
- **Documentation**: Swagger/OpenAPI documentation
- **Deployment**: Docker support with multi-stage builds
- **Monitoring**: Health checks and error tracking

## 📋 Requirements

- Node.js 18+ 
- MongoDB 6.0+
- Redis 7+ (optional, for caching)
- Docker & Docker Compose (for containerized deployment)

## 🛠️ Quick Start

### Development Setup

1. **Clone and navigate to the backend directory**
   ```bash
   git clone <repository-url>
   cd infinity-angles-v2/backend
   ```

2. **Run the setup script**
   ```bash
   npm run setup
   # or manually: ./setup-dev.sh
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`
API Documentation: `http://localhost:3000/api/docs`

### Production Deployment

#### Using Docker (Recommended)

1. **Build and deploy**
   ```bash
   ./deploy.sh
   ```

2. **Or manually with Docker Compose**
   ```bash
   npm run docker:prod
   ```

#### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start with PM2**
   ```bash
   npm run deploy
   ```

## 📁 Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/          # MongoDB models
├── routes/          # API routes
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── tests/           # Test files
└── server.ts        # Application entry point
```

## 🔧 Configuration

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/infinity-angles
MONGODB_TEST_URI=mongodb://localhost:27017/infinity-angles-test

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@infinityangles.com

# Redis (Optional)
REDIS_URL=redis://localhost:6379
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/search` - Search users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/profile/me` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password
- `POST /api/users/:id/follow` - Follow/unfollow user
- `GET /api/users/:id/followers` - Get user followers
- `GET /api/users/:id/following` - Get user following

### Posts
- `GET /api/posts` - Get all posts (paginated)
- `GET /api/posts/:id` - Get post by ID
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comments` - Add comment to post
- `GET /api/posts/user/:userId` - Get user posts

### System
- `GET /api/health` - Health check

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

## 🔍 Code Quality

### Linting & Formatting
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks
The project uses Husky and lint-staged for pre-commit hooks:
- Runs ESLint and Prettier on staged files
- Runs type checking
- Prevents commits with linting errors

## 🐳 Docker

### Development
```bash
# Start development environment
npm run docker:dev
```

### Production
```bash
# Build image
npm run docker:build

# Run production container
npm run docker:prod
```

### Docker Compose Services
- **api**: Backend API server
- **mongo**: MongoDB database
- **redis**: Redis cache
- **nginx**: Reverse proxy (production only)

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "version": "2.0.0",
    "database": "connected",
    "memory": {
      "used": "50.2 MB",
      "total": "128 MB"
    }
  }
}
```

### Logging
- Structured JSON logging with Winston
- Different log levels (error, warn, info, debug)
- Log files stored in `logs/` directory
- Request/response logging in development

## 🚀 Deployment Options

### 1. Docker (Recommended)
- Multi-stage builds for optimized images
- Includes MongoDB, Redis, and Nginx
- Automatic health checks
- Volume persistence

### 2. PM2 (Process Manager)
- Production process management
- Automatic restarts
- Load balancing
- Monitoring dashboard

### 3. Cloud Platforms
- AWS ECS/EKS
- Google Cloud Run
- Azure Container Instances
- Heroku
- DigitalOcean App Platform

## 🔧 Performance Optimizations

- **Database Indexing**: Optimized MongoDB indexes
- **Caching**: Redis caching for frequently accessed data
- **Compression**: Gzip compression for responses
- **Rate Limiting**: Prevents API abuse
- **Connection Pooling**: Efficient database connections
- **Image Optimization**: Sharp for image processing

## 🛡️ Security Features

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control
- **Input Validation**: Request validation and sanitization
- **SQL Injection Protection**: MongoDB sanitization
- **XSS Protection**: Helmet security headers
- **Rate Limiting**: Prevents brute force attacks
- **CORS**: Configurable cross-origin policies
- **File Upload Security**: Type and size validation

## 📖 API Documentation

Interactive API documentation is available at `/api/docs` when the server is running.

The documentation includes:
- Endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Error codes and messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Run linting and formatting
7. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the health check endpoint
- Check application logs

## 🔄 Changelog

### v2.0.0
- Complete TypeScript rewrite
- Modern architecture with clean separation of concerns
- Comprehensive testing suite
- Docker support
- Enhanced security features
- API documentation with Swagger
- Production-ready deployment scripts
