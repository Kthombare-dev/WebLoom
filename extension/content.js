// Content script that runs on web pages to extract content

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    try {
      const content = extractPageContent();
      sendResponse({ success: true, content });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep the message channel open for async response
  }
});

function extractPageContent() {
  // Remove script and style elements
  const scripts = document.querySelectorAll('script, style, noscript, iframe');
  scripts.forEach(el => el.remove());

  // Get main content - try to find article, main, or body
  let mainContent = '';
  
  // Try to find article tag first
  const article = document.querySelector('article');
  if (article) {
    mainContent = article.innerText || article.textContent;
  } else {
    // Try main tag
    const main = document.querySelector('main');
    if (main) {
      mainContent = main.innerText || main.textContent;
    } else {
      // Fallback to body, but remove common non-content elements
      const body = document.body.cloneNode(true);
      const unwanted = body.querySelectorAll('nav, header, footer, aside, .sidebar, .menu, .navigation, .ad, .advertisement');
      unwanted.forEach(el => el.remove());
      mainContent = body.innerText || body.textContent;
    }
  }

  // Clean up the text
  let cleanedContent = mainContent
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
    .trim();

  // If content is too short, get more from body
  if (cleanedContent.length < 100) {
    const body = document.body.cloneNode(true);
    const unwanted = body.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .ad, .advertisement');
    unwanted.forEach(el => el.remove());
    cleanedContent = body.innerText || body.textContent;
    cleanedContent = cleanedContent.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
  }

  // Limit content size for MVP (can be adjusted)
  if (cleanedContent.length > 50000) {
    cleanedContent = cleanedContent.substring(0, 50000) + '... [content truncated]';
  }

  return cleanedContent || 'No content found';
}

