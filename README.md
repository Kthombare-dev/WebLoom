Here’s a full `README.md` you can drop at the repo root:

---

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
└── README.md       # (this file)
```

---

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- Chrome browser for loading the extension
- Google Gemini API key (free at https://makersuite.google.com/app/apikey)

### 2. Backend (server)

```bash
cd server
cp env.sample .env.local   # edit with your secrets
npm install
npm start                  # runs on http://localhost:3002
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
npm run dev                # default http://localhost:5173
```

Optional: set `VITE_API_BASE_URL` in `client/.env` if your API isn’t on `http://localhost:3002`.

### 4. Chrome Extension

1. Go to `chrome://extensions`
2. Enable “Developer mode”
3. Click “Load unpacked” and pick the `extension/` folder
4. Update `extension/popup.js` (API base) and `manifest.json` host permissions if your backend runs elsewhere
5. Sign up / log in through the popup, then scrape any page

---

## Approach & Architecture

### Data Flow

```
Chrome Extension ──(JWT)──> Express API ──> SQLite DB
                                   │
                                   └─> Gemini AI (via aiService.js)
                                        │
React Dashboard <── (JWT) ──────────────┘
```

1. **Authentication** – Users create an account via `/api/auth/signup` (extension or web). Passwords are hashed with `bcryptjs`, tokens are signed with `JWT_SECRET`. Tokens live in Chrome storage (extension) or `localStorage` (web) and are sent as `Authorization: Bearer <token>`.

2. **Scraping** – The extension uses `chrome.scripting.executeScript` to extract readable text (article/main/body fallback). It sends `url`, `title`, `content`, `timestamp`, and the auth token to `/api/scrape`. Each row is stored with the user’s `user_id` in SQLite (`webloom.db`).

3. **Question Answering** – The web app (or API clients) post to `/api/question` with the user’s question. The server:
   - Looks up the calling user (via JWT)
   - Finds relevant scraped entries (LIKE search fallback to most recent if no keyword match)
   - Builds a context prompt and calls Gemini 2.0 Flash (fallback to 1.5)
   - Returns the generated answer plus references (URL/title/snippet/timestamp)

4. **Dashboard UI** – React client consumes the same APIs:
   - Login/Signup forms (shared with extension)
   - Shows the user’s scraped documents (hostname, title, snippet, India-time timestamp)
   - Q&A form that displays the answer and scrollable references list

### Key Directories

- `server/database.js` – SQL.js setup, user + scraped_content tables, helpers for CRUD/search
- `server/routes/*` – `/api/auth`, `/api/scrape`, `/api/question`
- `server/services/aiService.js` – Gemini initialization and prompt logic
- `extension/popup.js` – Auth handling, scraping logic, UI states
- `client/src/App.jsx` – Auth, dashboard layout, Q&A, state orchestration

---

## Deployment Notes

- **Backend**: can run on Render/Railway/Fly/etc. Remember to provide persistent storage or swap to a hosted DB for production.
- **Frontend**: `npm run build` → deploy `client/dist` to Netlify/Vercel/Cloudflare, setting `VITE_API_BASE_URL` to your API URL.
- **Extension**: Update API URL in `manifest.json` + `popup.js`, then zip the `extension/` folder for Chrome Web Store submission.

---

## API Reference (short)

| Endpoint | Method | Auth? | Description |
|----------|--------|-------|-------------|
| `/health` | GET | No | Server status |
| `/api/auth/signup` | POST | No | `{ email, password }` |
| `/api/auth/login` | POST | No | `{ email, password }` |
| `/api/scrape` | POST | Yes | Save `{ url, title, content, timestamp }` |
| `/api/scrape` | GET | Yes | Paginated list of user’s scraped entries |
| `/api/question` | POST | Optional | `{ question }` → AI answer & references (scoped if token provided) |

Full cURL examples live in `server/API_ENDPOINTS.md`.

---

## Testing

- **Client**: `cd client && npm run build` (already passing)
- **Server**: `npm start` + use Postman/API docs
- **Extension**: Manual smoke test—log in, scrape a page, check React dashboard for the entry, ask a question

---

## Future Enhancements

- Swap SQLite for hosted Postgres/MySQL
- Add vector embeddings for semantic search
- Granular organization (tags, folders) in the dashboard
- Multi-tenant/company support
- Rate limiting & audit logs

---

Happy scraping!
