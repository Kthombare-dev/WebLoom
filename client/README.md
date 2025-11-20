# WebLoom Client

Single-page React application for exploring scraped content and asking AI-powered questions that reference the stored knowledge base.

## Getting Started

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173` by default.

## Environment Variables

Optional: create `client/.env` to override the server URL and reuse the same API base.

```
VITE_API_BASE_URL=http://localhost:3002
```

If not provided, the client automatically falls back to `http://localhost:3002`.

## Features

- Login / Sign-up card (shares the same auth endpoints as the Chrome extension)
- Lists the latest scraped entries with host, timestamp, and snippet
- Shows backend health, last update time, and logged-in user email
- Question form that calls `/api/question` for Gemini-backed answers scoped to your account
- Renders references (title, snippet, source URL) returned by the server
- Helpful error states when backend or auth is offline/invalid

## Tech Stack

- React 18 + Vite
- Fetch API for HTTP requests
- Modern CSS (no external UI framework)
