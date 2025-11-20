# WebLoom Chrome Extension

Chrome extension for scraping web page content to feed the AI Q&A platform.

## Setup Instructions

1. **Load the extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `extension` folder

2. **Icons:**
   - The extension uses `WebLoom.png` as the icon (already included)

3. **Authentication:**
   - Sign up directly from the popup (email + password)
   - The extension stores a short-lived JWT in Chrome storage
   - You must be logged in before scraping pages

4. **Backend server:**
   - Start the server on `http://localhost:3002` (or the port configured in `.env.local`)
   - Scraped data is saved to `/api/scrape` with your auth token

## Usage

1. Navigate to any webpage you want to scrape
2. Click the WebLoom extension icon in the toolbar
3. Click the "Scrape Page" button
4. The extension will extract visible content and send it to the backend

## Features

- Login / Sign-up flow built into the popup (JWT stored in Chrome)
- Extracts main content from web pages (article/main/body)
- Sends scraped content with URL, title, timestamp, and user metadata to the backend
- Status feedback for success/errors, plus 401 handling (logs out automatically)
- Preview mode when backend is offline (content shown but not saved)

## Files

- `manifest.json` - Extension configuration (Manifest V3)
- `popup.html` - Extension popup UI
- `popup.js` - Auth logic + scraping + API communication
- `content.js` - Content script that extracts page content
- `styles.css` - Popup styling

