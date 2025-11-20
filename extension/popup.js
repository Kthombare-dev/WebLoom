const API_BASE_URL = 'http://localhost:3002';

let authToken = null;
let authUser = null;

document.addEventListener('DOMContentLoaded', () => {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const statusDiv = document.getElementById('status');
  const infoDiv = document.getElementById('info');
  const btnText = document.getElementById('btnText');
  const authSection = document.getElementById('authSection');
  const scrapeSection = document.getElementById('scrapeSection');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authTabs = document.querySelectorAll('[data-auth-tab]');
  const authMessage = document.getElementById('authMessage');
  const logoutBtn = document.getElementById('logoutBtn');
  const userEmailEl = document.getElementById('userEmail');

  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      authTabs.forEach((btn) => btn.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.authTab;
      if (mode === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
      } else {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
      }
      authMessage.textContent = '';
      authMessage.classList.remove('success');
    });
  });

  loginForm.addEventListener('submit', (event) => handleAuth(event, 'login'));
  signupForm.addEventListener('submit', (event) => handleAuth(event, 'signup'));
  logoutBtn.addEventListener('click', () => handleLogout());

  chrome.storage.local.get(['authToken', 'authUser'], (data) => {
    if (data.authToken && data.authUser) {
      authToken = data.authToken;
      authUser = data.authUser;
      showScrapeSection(authSection, scrapeSection, userEmailEl);
    } else {
      showAuthSection(authSection, scrapeSection);
    }
  });

  scrapeBtn.addEventListener('click', () =>
    handleScrapeClick(scrapeBtn, statusDiv, infoDiv, btnText)
  );
});

async function handleAuth(event, mode) {
  event.preventDefault();
  const form = event.target;
  const authMessage = document.getElementById('authMessage');
  authMessage.textContent = '';
  authMessage.classList.remove('success');

  const formData = new FormData(form);
  const email = formData.get('email')?.trim();
  const password = formData.get('password')?.trim();

  if (!email || !password) {
    authMessage.textContent = 'Please enter email and password.';
    return;
  }

  try {
    setAuthFormsDisabled(true);
    const response = await fetch(`${API_BASE_URL}/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    authToken = data.token;
    authUser = data.user;
    chrome.storage.local.set({ authToken, authUser }, () => {
      authMessage.textContent =
        mode === 'signup'
          ? 'Account created! You are now logged in.'
          : 'Logged in successfully.';
      authMessage.classList.add('success');
      setTimeout(() => {
        authMessage.textContent = '';
        showScrapeSection(
          document.getElementById('authSection'),
          document.getElementById('scrapeSection'),
          document.getElementById('userEmail')
        );
      }, 400);
    });
  } catch (error) {
    authMessage.textContent = error.message || 'Unable to authenticate.';
  } finally {
    setAuthFormsDisabled(false);
  }
}

function setAuthFormsDisabled(isDisabled) {
  [document.getElementById('loginForm'), document.getElementById('signupForm')].forEach((form) => {
    Array.from(form.elements).forEach((el) => (el.disabled = isDisabled));
  });
}

function showAuthSection(authSection, scrapeSection) {
  authSection.classList.remove('hidden');
  scrapeSection.classList.add('hidden');
}

function showScrapeSection(authSection, scrapeSection, userEmailEl) {
  authSection.classList.add('hidden');
  scrapeSection.classList.remove('hidden');
  if (userEmailEl) {
    userEmailEl.textContent = authUser?.email || '';
  }
}

function handleLogout(message) {
  authToken = null;
  authUser = null;
  chrome.storage.local.remove(['authToken', 'authUser'], () => {
    showAuthSection(
      document.getElementById('authSection'),
      document.getElementById('scrapeSection')
    );
    if (message) {
      showStatus(message, 'error');
    } else {
      showStatus('Logged out', 'success');
    }
    document.getElementById('info').innerHTML = '';
  });
}

async function handleScrapeClick(button, statusDiv, infoDiv, btnText) {
  if (!authToken) {
    showStatus('Please log in before scraping.', 'error');
    infoDiv.innerHTML = '<p class="error-text">Authentication required.</p>';
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showStatus('Error: Could not access current tab', 'error');
      return;
    }

    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:')
    ) {
      throw new Error('Cannot scrape Chrome internal pages. Please navigate to a regular website.');
    }

    button.disabled = true;
    btnText.textContent = 'Scraping...';
    showStatus('Scraping page content...', 'loading');

    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeContentFromPage,
    });

    const content = injectionResults[0]?.result;
    if (!content) {
      throw new Error('No content extracted from page');
    }

    const payload = {
      url: tab.url,
      title: tab.title || 'Untitled',
      content,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(`${API_BASE_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      handleLogout('Session expired. Please log in again.');
      return;
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    showStatus('✓ Content scraped and saved!', 'success');
    infoDiv.innerHTML = `
      <p><strong>URL:</strong> ${truncateUrl(tab.url)}</p>
      <p><strong>Content length:</strong> ${content.length} characters</p>
    `;
  } catch (error) {
    console.error('Scraping error:', error);
    let message = error.message || 'Something went wrong.';
    if (message.includes('Failed to fetch')) {
      message = 'Server not available. Make sure the backend is running.';
    }
    showStatus(`Error: ${message}`, 'error');
    infoDiv.innerHTML = `<p class="error-text">${message}</p>`;
  } finally {
    button.disabled = false;
    btnText.textContent = 'Scrape Page';
  }
}

function scrapeContentFromPage() {
  const bodyClone = document.body.cloneNode(true);
  const scripts = bodyClone.querySelectorAll('script, style, noscript, iframe');
  scripts.forEach((el) => el.remove());

  let mainContent = '';
  const article = bodyClone.querySelector('article');
  if (article) {
    mainContent = article.innerText || article.textContent;
  } else {
    const main = bodyClone.querySelector('main');
    if (main) {
      mainContent = main.innerText || main.textContent;
    } else {
      const unwanted = bodyClone.querySelectorAll('nav, header, footer, aside, .sidebar, .menu, .navigation, .ad, .advertisement');
      unwanted.forEach((el) => el.remove());
      mainContent = bodyClone.innerText || bodyClone.textContent;
    }
  }

  let cleanedContent = mainContent.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();

  if (cleanedContent.length < 100) {
    const freshClone = document.body.cloneNode(true);
    const unwanted = freshClone.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .ad, .advertisement');
    unwanted.forEach((el) => el.remove());
    cleanedContent = (freshClone.innerText || freshClone.textContent || '')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  if (cleanedContent.length > 50000) {
    cleanedContent = cleanedContent.substring(0, 50000) + '... [content truncated]';
  }

  return cleanedContent || 'No content found';
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

function truncateUrl(url) {
  if (url.length > 50) {
    return url.substring(0, 47) + '...';
  }
  return url;
}

