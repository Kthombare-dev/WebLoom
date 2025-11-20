chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    try {
      const content = extractPageContent();
      sendResponse({ success: true, content });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

function extractPageContent() {
  const scripts = document.querySelectorAll('script, style, noscript, iframe');
  scripts.forEach(el => el.remove());

  let mainContent = '';
  
  const article = document.querySelector('article');
  if (article) {
    mainContent = article.innerText || article.textContent;
  } else {
    const main = document.querySelector('main');
    if (main) {
      mainContent = main.innerText || main.textContent;
    } else {
      const body = document.body.cloneNode(true);
      const unwanted = body.querySelectorAll('nav, header, footer, aside, .sidebar, .menu, .navigation, .ad, .advertisement');
      unwanted.forEach(el => el.remove());
      mainContent = body.innerText || body.textContent;
    }
  }

  let cleanedContent = mainContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  if (cleanedContent.length < 100) {
    const body = document.body.cloneNode(true);
    const unwanted = body.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .ad, .advertisement');
    unwanted.forEach(el => el.remove());
    cleanedContent = body.innerText || body.textContent;
    cleanedContent = cleanedContent.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
  }

  if (cleanedContent.length > 50000) {
    cleanedContent = cleanedContent.substring(0, 50000) + '... [content truncated]';
  }

  return cleanedContent || 'No content found';
}

