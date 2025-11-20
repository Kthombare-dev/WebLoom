# WebLoom API Endpoints - Complete Testing Guide

## Base URL
```
http://localhost:3002
```

---

## 1. Health Check

### GET /health
Check if the server is running.

**Request:**
```bash
GET http://localhost:3002/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "WebLoom server is running"
}
```

**cURL:**
```bash
curl http://localhost:3002/health
```

---

## 2. Root Endpoint

### GET /
Get API information and available endpoints.

**Request:**
```bash
GET http://localhost:3002/
```

**Response:**
```json
{
  "message": "WebLoom API Server",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "scrape": "/api/scrape",
    "question": "/api/question"
  }
}
```

**cURL:**
```bash
curl http://localhost:3002/
```

---

## 3. Authentication

### POST /api/auth/signup
```bash
curl -X POST http://localhost:3002/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123"}'
```

### POST /api/auth/login
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123"}'
```

Both endpoints return `{ token, user }`. Use the token for authorized requests:
```
Authorization: Bearer <token>
```

---

## 4. Scrape Content (requires token)

### POST /api/scrape
Save scraped content from the Chrome extension.

**Request (remember Authorization header):**
```bash
POST http://localhost:3002/api/scrape
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "title": "Example Article Title",
  "content": "This is the scraped content from the webpage...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Content scraped and saved successfully",
  "data": {
    "id": 1,
    "url": "https://example.com/article",
    "title": "Example Article Title",
    "contentLength": 45,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "stats": {
    "totalScraped": 1
  },
  "args": {},
  "headers": {
    "content-type": "application/json",
    ...
  },
  "url": "/api/scrape"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3002/api/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "url": "https://example.com/article",
    "title": "Example Article",
    "content": "This is the content from the webpage",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }'
```

---

### GET /api/scrape
Get all scraped content with pagination.

**Request (requires token):**
```bash
GET http://localhost:3002/api/scrape?limit=10&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional, default: 50) - Number of items to return
- `offset` (optional, default: 0) - Number of items to skip

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://example.com/article",
      "title": "Example Article",
      "content": "Full content...",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1,
    "hasMore": false
  },
  "args": {
    "limit": "10",
    "offset": "0"
  },
  "headers": {
    ...
  },
  "url": "/api/scrape?limit=10&offset=0"
}
```

**cURL:**
```bash
curl http://localhost:3002/api/scrape?limit=10&offset=0 \
  -H "Authorization: Bearer <token>"
```

---

## 4. Ask Questions (AI-Powered)

### POST /api/question
Ask a question and get an AI-powered answer based on scraped content.

**Request:**
```bash
POST http://localhost:3002/api/question
Content-Type: application/json
```

**Request Body:**
```json
{
  "question": "What did you learn from the scraped content?"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "question": "What did you learn from the scraped content?",
  "answer": "Based on the scraped content, I learned that... [AI-generated answer]",
  "references": [
    {
      "id": 1,
      "url": "https://example.com/article",
      "title": "Example Article",
      "snippet": "This is a snippet of the content...",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "aiPowered": true,
  "note": "Answer generated using Gemini AI",
  "args": {},
  "headers": {
    "content-type": "application/json",
    ...
  },
  "url": "/api/question"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3002/api/question \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What did you learn from the scraped content?"
  }'
```

---

## Postman Collection

### Import these requests into Postman:

1. **Health Check**
   - Method: GET
   - URL: `http://localhost:3002/health`

2. **Get All Scraped Content**
   - Method: GET
   - URL: `http://localhost:3002/api/scrape?limit=10&offset=0`
   - Headers: `Authorization: Bearer <token>`

3. **Save Scraped Content**
   - Method: POST
   - URL: `http://localhost:3002/api/scrape`
   - Headers: `Content-Type: application/json`, `Authorization: Bearer <token>`
   - Body (raw JSON):
     ```json
     {
       "url": "https://example.com",
       "title": "Example Page",
       "content": "Page content here",
       "timestamp": "2024-01-01T00:00:00.000Z"
     }
     ```

4. **Ask Question**
   - Method: POST
   - URL: `http://localhost:3002/api/question`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "question": "What did you learn from the scraped content?"
     }
     ```

---

## Testing Workflow

1. **Start the server:**
   ```bash
   cd server
   npm start
   ```

2. **Check health:**
   ```bash
   curl http://localhost:3002/health
   ```

3. **Scrape some content** (using Chrome extension or API):
   - Use the Chrome extension to scrape a webpage, OR
   - POST to `/api/scrape` with sample data

4. **Get all scraped content:**
   ```bash
   curl http://localhost:3002/api/scrape
   ```

5. **Ask a question:**
   ```bash
   curl -X POST http://localhost:3002/api/question \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"question": "What is the main topic?"}'
   ```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Question is required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process question",
  "message": "Error details..."
}
```

---

## Notes

- All POST requests require `Content-Type: application/json` header
- The `url` property in responses refers to the request URL path
- `args` contains query parameters
- `headers` contains request headers
- Make sure the server is running on port 3002 (or check your .env.local for PORT setting)
- Ensure `.env.local` has `GEMINI_API_KEY` for AI features

