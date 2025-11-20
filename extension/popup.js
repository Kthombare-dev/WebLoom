document.addEventListener('DOMContentLoaded', () => {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const statusDiv = document.getElementById('status');
  const infoDiv = document.getElementById('info');
  const btnText = document.getElementById('btnText');

  scrapeBtn.addEventListener('click', async () => {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        showStatus('Error: Could not access current tab', 'error');
        return;
      }

      // Check if URL is valid for scraping (not chrome://, chrome-extension://, etc.)
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        throw new Error('Cannot scrape Chrome internal pages. Please navigate to a regular website.');
      }

      // Disable button and show loading
      scrapeBtn.disabled = true;
      btnText.textContent = 'Scraping...';
      statusDiv.textContent = 'Scraping page content...';
      statusDiv.className = 'status loading';

      // Extract content directly using executeScript with inline function
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: function() {
          // Clone the body to work with a copy (don't modify the actual page)
          const bodyClone = document.body.cloneNode(true);
          
          // Remove script and style elements from the CLONE only
          const scripts = bodyClone.querySelectorAll('script, style, noscript, iframe');
          scripts.forEach(el => el.remove());

          // Get main content - try to find article, main, or body from the CLONE
          let mainContent = '';
          
          // Try to find article tag first in the clone
          const article = bodyClone.querySelector('article');
          if (article) {
            mainContent = article.innerText || article.textContent;
          } else {
            // Try main tag in the clone
            const main = bodyClone.querySelector('main');
            if (main) {
              mainContent = main.innerText || main.textContent;
            } else {
              // Use the cloned body, but remove common non-content elements from the CLONE
              const unwanted = bodyClone.querySelectorAll('nav, header, footer, aside, .sidebar, .menu, .navigation, .ad, .advertisement');
              unwanted.forEach(el => el.remove());
              mainContent = bodyClone.innerText || bodyClone.textContent;
            }
          }

          // Clean up the text
          let cleanedContent = mainContent
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
            .trim();

          // If content is too short, get more from the cloned body
          if (cleanedContent.length < 100) {
            // Create a fresh clone if needed
            const freshClone = document.body.cloneNode(true);
            const unwanted = freshClone.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .ad, .advertisement');
            unwanted.forEach(el => el.remove());
            cleanedContent = freshClone.innerText || freshClone.textContent;
            cleanedContent = cleanedContent.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
          }

          // Limit content size for MVP (can be adjusted)
          if (cleanedContent.length > 50000) {
            cleanedContent = cleanedContent.substring(0, 50000) + '... [content truncated]';
          }

          return cleanedContent || 'No content found';
        }
      });

      const results = { content: injectionResults[0].result };
      
      if (results && results.content) {
        // Prepare data to send to backend
        const scrapedData = {
          url: tab.url,
          title: tab.title || 'Untitled',
          content: results.content,
          timestamp: new Date().toISOString()
        };

        // Send to backend API
        try {
          const response = await fetch('http://localhost:3001/api/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(scrapedData)
          });

          if (response.ok) {
            const data = await response.json();
            showStatus('✓ Content scraped and saved!', 'success');
            infoDiv.innerHTML = `
              <p><strong>URL:</strong> ${truncateUrl(tab.url)}</p>
              <p><strong>Content length:</strong> ${results.content.length} characters</p>
            `;
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        } catch (fetchError) {
          // If server is not available, show test mode (scraping worked, but can't save)
          if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
            showStatus('✓ Content scraped! (Test mode - server not running)', 'success');
            const preview = results.content.substring(0, 200) + (results.content.length > 200 ? '...' : '');
            infoDiv.innerHTML = `
              <p><strong>URL:</strong> ${truncateUrl(tab.url)}</p>
              <p><strong>Content length:</strong> ${results.content.length} characters</p>
              <p><strong>Preview:</strong></p>
              <p style="font-size: 11px; color: #666; max-height: 100px; overflow-y: auto; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-top: 5px;">${preview}</p>
              <p style="font-size: 10px; color: #999; margin-top: 5px;">⚠️ Server not available - content not saved</p>
            `;
            // Store in local storage for testing
            chrome.storage.local.set({ lastScraped: scrapedData });
            return;
          }
          throw fetchError;
        }
      } else {
        throw new Error('No content extracted from page');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      let errorMessage = error.message;
      
      // Provide more helpful error messages
      if (error.message.includes('Cannot access')) {
        errorMessage = 'Cannot access this page. Try a regular website.';
      } else if (error.message.includes('No content')) {
        errorMessage = 'No content found on this page.';
      }
      
      showStatus(`Error: ${errorMessage}`, 'error');
      
      // Only show server message if it's a network error
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        infoDiv.innerHTML = `<p class="error-text">⚠️ Server not available. Content was scraped but not saved.</p>`;
      } else {
        infoDiv.innerHTML = `<p class="error-text">${errorMessage}</p>`;
      }
    } finally {
      scrapeBtn.disabled = false;
      btnText.textContent = 'Scrape Page';
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }

  function truncateUrl(url) {
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  }
});

