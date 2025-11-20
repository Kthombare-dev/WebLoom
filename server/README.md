# WebLoom Server

Backend Express server for the WebLoom AI Q&A platform.

## Features

- RESTful API for receiving scraped content from Chrome extension
- SQLite database for storing scraped content
- Basic search functionality
- Ready for AI integration (Gemini, OpenAI, etc.)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.sample .env.local
   # Edit .env.local and set your keys/secrets
   ```
   
   Required variables:
   - `GEMINI_API_KEY` – get it from https://makersuite.google.com/app/apikey
   - `JWT_SECRET` – any secure random string for signing auth tokens
   
   **Note:** `.env.local` is used for all secrets and is git-ignored.

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Server will run on:** `http://localhost:3002`

## API Endpoints

### Health Check
- `GET /health` - Check if server is running

### Authentication

- `POST /api/auth/signup` – Create a new account
  ```json
  {
    "email": "user@example.com",
    "password": "secret123"
  }
  ```

- `POST /api/auth/login` – Obtain a JWT before scraping
  ```json
  {
    "email": "user@example.com",
    "password": "secret123"
  }
  ```

Both responses return `{ token, user }`. Use the token in subsequent requests:
```
Authorization: Bearer <token>
```

### Scrape Content (requires auth token)
- `POST /api/scrape` - Save scraped content from extension
  ```json
  {
    "url": "https://example.com",
    "title": "Example Page",
    "content": "Page content...",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

- `GET /api/scrape` - Get all scraped content (with pagination)
  - Query params: `?limit=50&offset=0`

### Questions (AI-Powered)
- `POST /api/question` - Ask a question (uses Gemini AI if API key is set). If a token is provided, answers only use that user’s scraped content; otherwise, it falls back to all public content.
  ```json
  {
    "question": "What is machine learning?"
  }
  ```
  
  Response includes:
  - AI-generated answer based on scraped content
  - Reference links to source URLs
  - Snippets from relevant content

## Database

Uses SQLite (`webloom.db`) with `sql.js` (pure JavaScript implementation, no native compilation needed). The database is automatically created on first run.

### Schema

```sql
users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

scraped_content (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id)
)
```

## Next Steps

- [ ] Integrate AI model (Gemini Flash, OpenAI, etc.)
- [ ] Add vector database for semantic search
- [x] Implement user authentication
- [ ] Add content management endpoints
- [ ] Add rate limiting
- [ ] Add request validation middleware

## Tech Stack

- **Express** - Web framework
- **SQLite (sql.js)** - Pure JavaScript SQLite database (no native compilation)
- **Google Gemini AI** - AI-powered Q&A (Gemini 1.5 Flash - free tier)
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables

