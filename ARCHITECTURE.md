# Backend Architecture Documentation

## 📁 Project Structure

```
backend/
├── config/                 # Configuration files
│   └── config.js          # Application configuration
├── controllers/            # Business logic controllers
│   └── feedsController.js # Feeds business logic
├── data/                   # Data files and seeds
│   └── feeds.js           # Sample feeds data
├── middleware/             # Custom middleware
│   ├── errorHandler.js    # Global error handling
│   ├── logger.js          # Request logging
│   └── validation.js      # Input validation
├── routes/                 # API routes
│   └── feeds.js           # Feeds routes definition
├── utils/                  # Utility functions
│   ├── dateUtils.js       # Date manipulation utilities
│   └── responseUtils.js   # Response formatting utilities
├── server.js              # Main application entry point
├── package.json           # Dependencies and scripts
└── README.md              # Project documentation
```

## 🏗️ Architecture Overview

### 1. **Layered Architecture**
The application follows a layered architecture pattern:

- **Routes Layer**: Handles HTTP requests and routing
- **Middleware Layer**: Validates input, logs requests, handles errors
- **Controller Layer**: Contains business logic
- **Data Layer**: Manages data storage and retrieval
- **Utils Layer**: Provides common utilities

### 2. **Separation of Concerns**
Each layer has distinct responsibilities:

- **Routes**: Define API endpoints and delegate to controllers
- **Controllers**: Implement business logic and coordinate data operations
- **Middleware**: Handle cross-cutting concerns (validation, logging, error handling)
- **Data**: Manage data persistence and initial data seeding
- **Utils**: Provide reusable utility functions

## 🛣️ API Routes Structure

### Base URL: `/api/feeds`

| Method | Endpoint | Description | Validation |
|--------|----------|-------------|------------|
| GET | `/` | Get all feeds | Query params |
| GET | `/stats` | Get feed statistics | None |
| GET | `/categories` | Get all categories | None |
| GET | `/:id` | Get feed by ID | UUID validation |
| POST | `/` | Create new feed | Full validation |
| PUT | `/:id` | Update feed | UUID + content validation |
| PATCH | `/:id/like` | Like a feed | UUID validation |
| PATCH | `/:id/unlike` | Unlike a feed | UUID validation |
| DELETE | `/:id` | Delete feed | UUID validation |

## 🔧 Controllers

### FeedsController Methods:
- `getAllFeeds()` - Handles feed listing with filtering and pagination
- `getFeedById()` - Retrieves specific feed
- `createFeed()` - Creates new feed with validation
- `updateFeed()` - Updates existing feed
- `likeFeed()` - Increments like count
- `unlikeFeed()` - Decrements like count
- `deleteFeed()` - Removes feed
- `getCategories()` - Returns unique categories
- `getFeedStats()` - Returns system statistics

## 🛡️ Middleware

### 1. **Error Handler** (`errorHandler.js`)
- Global error handling
- Specific error type handling (validation, JWT, etc.)
- Consistent error response format

### 2. **Validation** (`validation.js`)
- Input validation using express-validator
- Request body validation
- Query parameter validation
- UUID parameter validation

### 3. **Logger** (`logger.js`)
- Request/response logging
- Performance timing
- Structured log format

## 📊 Data Management

### Current Implementation:
- **In-memory storage** using JavaScript arrays
- **Sample data** loaded from `data/feeds.js`
- **CRUD operations** through controller methods

### Production Considerations:
- Replace with database (MongoDB, PostgreSQL, etc.)
- Add data persistence
- Implement caching layer
- Add backup/restore functionality

## 🔧 Utilities

### 1. **Response Utils** (`responseUtils.js`)
- Standardized response formatting
- Success/error response helpers
- HTTP status code management

### 2. **Date Utils** (`dateUtils.js`)
- Relative time calculations
- Date formatting functions
- Date validation helpers

## 📝 Configuration

### Configuration Structure (`config/config.js`):
- **Server settings** (port, environment)
- **API settings** (version, pagination defaults)
- **CORS configuration**
- **Feed constraints** (content length, tags limit)
- **Logging preferences**

## 🚀 Startup Process

1. **Initialize Express app**
2. **Load configuration**
3. **Set up middleware stack**
4. **Register routes**
5. **Start HTTP server**
6. **Log startup information**

## 🔍 Request Flow

```
HTTP Request
    ↓
Logger Middleware
    ↓
CORS & Security (Helmet)
    ↓
Body Parser
    ↓
Route Handler
    ↓
Validation Middleware
    ↓
Controller Method
    ↓
Data Operations
    ↓
Response Formatting
    ↓
HTTP Response
```

## 🧪 Testing Strategy

### Current Testing Tools:
- **CLI Test Tool** (`test-api.js`) for manual API testing
- **curl commands** for endpoint verification
- **Health check endpoint** for system monitoring

### Recommended Additions:
- Unit tests for controllers
- Integration tests for API endpoints
- Load testing for performance
- Automated testing pipeline

## 🔒 Security Features

### Current Implementation:
- **Helmet.js** for security headers
- **CORS** configuration
- **Input validation** to prevent injection
- **Error handling** to prevent information leakage

### Production Enhancements:
- Authentication/authorization
- Rate limiting
- API key management
- Input sanitization
- Request size limits

## 📈 Performance Considerations

### Current Optimizations:
- Efficient array operations
- Pagination to limit response size
- Structured error handling

### Scalability Improvements:
- Database indexing
- Caching layer (Redis)
- Connection pooling
- Load balancing
- CDN for static assets

## 🔄 Data Flow

```
Client Request
    ↓
Routes Layer (HTTP handling)
    ↓
Middleware Layer (Validation, logging)
    ↓
Controller Layer (Business logic)
    ↓
Data Layer (CRUD operations)
    ↓
Response Formatting
    ↓
Client Response
```

## 📋 Development Workflow

1. **Add new routes** in `routes/` directory
2. **Implement controllers** in `controllers/` directory
3. **Add validation** in `middleware/validation.js`
4. **Update data models** if needed
5. **Test with CLI tool** or curl commands
6. **Update documentation**

## 🚨 Error Handling Strategy

### Error Types:
- **Validation Errors** (400) - Invalid input data
- **Not Found Errors** (404) - Resource doesn't exist
- **Server Errors** (500) - Internal server issues
- **Authentication Errors** (401/403) - Future implementation

### Error Response Format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [], // Optional detailed errors
  "timestamp": "2025-07-01T12:00:00.000Z"
}
```

This architecture provides a solid foundation for the feeds backend with clear separation of concerns, comprehensive error handling, and room for future enhancements.
