# Infinity Angles Backend

A simple REST API backend for managing feeds in the Infinity Angles application.

## Features

- ✅ Get all feeds with pagination and filtering
- ✅ Get feed by ID
- ✅ Create new feeds
- ✅ Like/unlike feeds
- ✅ Delete feeds
- ✅ Get available categories
- ✅ CORS enabled for cross-origin requests
- ✅ Security headers with Helmet
- ✅ Error handling middleware

## API Endpoints

### Health Check
- `GET /health` - Check if the server is running

### Feeds
- `GET /api/feeds` - Get all feeds
  - Query parameters:
    - `category` - Filter by category (optional)
    - `limit` - Number of feeds to return (default: 10)
    - `offset` - Number of feeds to skip (default: 0)
- `GET /api/feeds/:id` - Get a specific feed by ID
- `POST /api/feeds` - Create a new feed
- `PATCH /api/feeds/:id/like` - Like a feed
- `DELETE /api/feeds/:id` - Delete a feed

### Categories
- `GET /api/categories` - Get all available categories

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Or start the production server:
   ```bash
   npm start
   ```

The server will run on `http://localhost:3000` by default.

## Example Usage

### Get all feeds
```bash
curl http://localhost:3000/api/feeds
```

### Get feeds by category
```bash
curl "http://localhost:3000/api/feeds?category=General&limit=5"
```

### Create a new feed
```bash
curl -X POST http://localhost:3000/api/feeds \
  -H "Content-Type: application/json" \
  -d '{
    "author": "John Doe",
    "authorRole": "Developer",
    "content": "This is a new feed post",
    "category": "General",
    "tags": ["test", "api"]
  }'
```

### Like a feed
```bash
curl -X PATCH http://localhost:3000/api/feeds/FEED_ID/like
```

## Data Structure

### Feed Object
```json
{
  "id": "uuid",
  "author": "string",
  "authorRole": "string",
  "timestamp": "string",
  "content": "string",
  "category": "string",
  "likes": "number",
  "comments": "number",
  "tags": ["string"]
}
```

## Notes

- Currently uses in-memory storage. For production, consider using a database like MongoDB, PostgreSQL, or SQLite.
- The server includes sample data for testing purposes.
- All responses follow a consistent format with `success`, `data`, and optional `message` fields.
