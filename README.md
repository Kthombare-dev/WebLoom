https://github.com/user-attachments/assets/d8ff4eaa-ebcb-4438-8e2b-3b5633d611b1

# WebLoom – Chrome Extension + AI-Powered Q&A Platform

WebLoom lets you scrape any article or document with a Chrome extension, store it securely per user, and ask natural-language questions against your own knowledge base using Gemini AI. The stack includes:

- **Chrome extension** (Manifest v3) with built-in auth + scraping
- **Node/Express backend** with SQLite storage, JWT auth, and Gemini-powered Q&A
- **React/Vite dashboard** to browse scraped entries and run queries

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Browser extension | Manifest v3, plain JS/HTML/CSS | Popup UI, login/signup, authenticated scraping |
| Web app | React 18 + Vite + CSS | Auth + dashboard + Q&A client |
| Backend API | Node.js (Express 4), SQLite (sql.js), JWT, bcryptjs | `/api/auth`, `/api/scrape`, `/api/question`, `/health`, `/` |
| AI | Google Gemini 2.0 Flash (fallback to 1.5 Flash) | Answers restricted to user’s scraped corpus |
| Auth | Email/password + JWT | Shared between extension and web app |

---

## Repo Structure

```
WebLoom/
├── client/         # Vite/React dashboard
├── extension/      # Chrome extension (popup + manifest + content script)
├── server/         # Express API + SQLite DB + AI service
└── README.md
```

---

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- Chrome browser for loading the extension
- Google Gemini API key (https://makersuite.google.com/app/apikey)

### 2. Backend (server)
```bash
cd server
cp env.sample .env.local
npm install
npm start    # http://localhost:3002
```
`.env.local` must include:
```
PORT=3002
GEMINI_API_KEY=your_google_api_key
JWT_SECRET=your_random_secret
```

### 3. Web Client (dashboard)
```bash
cd client
npm install
npm run dev    # http://localhost:5173
```
Optional: set `VITE_API_BASE_URL` in `client/.env` if your API isn’t on `http://localhost:3002`.

### 4. Chrome Extension
1. Go to `chrome://extensions`
2. Enable “Developer mode”
3. Click “Load unpacked” → select the `extension/` folder
4. Ensure `extension/popup.js` and `manifest.json` point to your backend URL
5. Sign up / log in via the popup, then scrape any page

---

## Approach & Architecture

```
Chrome Extension ──(JWT)──> Express API ──> SQLite DB
                                   │
                                   └─> Gemini AI
                                        │
React Dashboard <──(JWT)───────────────┘
```

1. **Auth** – `/api/auth/signup` and `/api/auth/login` issue JWTs (bcrypt + jsonwebtoken). Tokens live in Chrome storage or localStorage and are attached as `Authorization: Bearer <token>`.
2. **Scraping** – The extension injects a content script, extracts readable text, and posts `{ url, title, content, timestamp }` to `/api/scrape`, linking each row to the user’s `user_id`.
3. **Q&A** – `/api/question` fetches relevant rows (LIKE search or latest fallback) for that user, builds a prompt, and calls Gemini. Responses include AI answer + reference metadata.
4. **Dashboard** – React app mirrors the extension’s auth flow, lists scraped entries (hostname, snippet, India-based timestamps), and renders AI answers with scrollable references.

### Key Files
- `server/database.js` – SQL.js init, schema, CRUD helpers
- `server/routes/*` – Auth, scrape, question endpoints
- `server/services/aiService.js` – Gemini setup + prompt
- `extension/popup.js` – Auth UI + scraping logic
- `client/src/App.jsx` – Auth + dashboard + Q&A

---

## API Reference (short)

| Endpoint | Method | Auth? | Description |
|----------|--------|-------|-------------|
| `/health` | GET | No | Server status |
| `/api/auth/signup` | POST | No | `{ email, password }` |
| `/api/auth/login` | POST | No | `{ email, password }` |
| `/api/scrape` | POST | Yes | Save scraped page for user |
| `/api/scrape` | GET | Yes | Paginated list of user content |
| `/api/question` | POST | Optional | AI answer + references (scoped if token provided) |

Full cURL examples live in `server/API_ENDPOINTS.md`.

---

## Deployment Notes
- **Backend**: Deploy on Render/Railway/Fly/etc. Ensure persistent storage (or migrate to hosted DB). Set env vars and run `npm start`.
- **Frontend**: `cd client && npm run build`, deploy `dist/` to Netlify/Vercel/Cloudflare Pages. Set `VITE_API_BASE_URL`.
- **Extension**: Update API URL, zip `extension/`, and upload to the Chrome Web Store.

---

## Testing
- Client: `cd client && npm run build`
- Server: `npm start` + Postman or cURL (see API docs)
- Extension: Manual flow (login, scrape, verify in dashboard, ask AI question)

---

## Future Enhancements
- Swap SQLite for a managed database
- Add embeddings/vector search for relevance
- Dashboard tagging/folders, team accounts
- Rate limiting and audit logging

---

Made by Ketan Thombare
