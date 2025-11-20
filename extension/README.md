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

3. **Testing without backend (Test Mode):**
   - You can test the extension even without the backend server running
   - The extension will scrape content and show a preview
   - It will display a message that the server is not available
   - Scraped data is also stored in Chrome's local storage for testing

4. **With backend server:**
   - Start the server on `http://localhost:3001`
   - The extension sends scraped data to `/api/scrape` endpoint
   - Content will be saved to the database

## Usage

1. Navigate to any webpage you want to scrape
2. Click the WebLoom extension icon in the toolbar
3. Click the "Scrape Page" button
4. The extension will extract visible content and send it to the backend

## Features

- Extracts main content from web pages (prioritizes article/main tags)
- Sends scraped content with URL, title, and timestamp to backend
- Test mode: Works without backend server (shows preview of scraped content)
- Simple, clean popup UI with gradient design
- Error handling and status feedback
- Content preview in test mode

## Files

- `manifest.json` - Extension configuration (Manifest V3)
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic and API communication
- `content.js` - Content script that extracts page content
- `styles.css` - Popup styling

