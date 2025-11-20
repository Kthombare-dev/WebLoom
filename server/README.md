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
   cp .env.example .env.local
   # Edit .env.local and add your GEMINI_API_KEY
   ```
   
   **Get a free Gemini API key:**
   - Go to https://makersuite.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the key and add it to `.env.local` as `GEMINI_API_KEY=your_key_here`
   
   **Note:** The server uses `.env.local` for configuration. The server will work without the API key, but AI features will be disabled.

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Server will run on:** `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Check if server is running

### Scrape Content
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
- `POST /api/question` - Ask a question (uses Gemini AI if API key is set)
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
scraped_content (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Next Steps

- [ ] Integrate AI model (Gemini Flash, OpenAI, etc.)
- [ ] Add vector database for semantic search
- [ ] Implement user authentication
- [ ] Add content management endpoints
- [ ] Add rate limiting
- [ ] Add request validation middleware

## Tech Stack

- **Express** - Web framework
- **SQLite (sql.js)** - Pure JavaScript SQLite database (no native compilation)
- **Google Gemini AI** - AI-powered Q&A (Gemini 1.5 Flash - free tier)
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables

