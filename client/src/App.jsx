import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002';
const STORAGE_KEY = 'webloomAuth';
const INDIA_LOCALE = { timeZone: 'Asia/Kolkata' };

function formatDateTime(value, options = {}) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN', {
      ...options,
      timeZone: INDIA_LOCALE.timeZone,
    });
  } catch {
    return '';
  }
}

function App() {
  const [scrapedContent, setScrapedContent] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [references, setReferences] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [qaError, setQaError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authToken, setAuthToken] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return '';
    try {
      return JSON.parse(stored).token;
    } catch {
      return '';
    }
  });
  const [authUser, setAuthUser] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored).user;
    } catch {
      return null;
    }
  });

  const lastUpdatedLabel = useMemo(() => {
    if (!scrapedContent.length) return '';
    const date = scrapedContent[0]?.created_at || scrapedContent[0]?.timestamp;
    if (!date) return '';
    return new Date(date).toLocaleString();
  }, [scrapedContent]);

  useEffect(() => {
    if (!authToken) {
      setScrapedContent([]);
      return;
    }
    const controller = new AbortController();

    async function loadContent() {
      try {
        setContentLoading(true);
        setContentError('');
        const response = await fetch(`${API_BASE_URL}/api/scrape?limit=50`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (response.status === 401) {
          handleLogout('Session expired. Please log in again.');
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to load scraped content (${response.status})`);
        }
        const json = await response.json();
        setScrapedContent(json.data || []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setContentError(error.message || 'Unable to load scraped content');
        }
      } finally {
        setContentLoading(false);
      }
    }

    loadContent();
    return () => controller.abort();
  }, [authToken]);

  async function handleAskQuestion(event) {
    event.preventDefault();
    if (!authToken) {
      setQaError('Please log in first.');
      return;
    }
    if (!question.trim()) {
      setQaError('Please enter a question.');
      return;
    }

    try {
      setIsAsking(true);
      setQaError('');
      setAnswer(null);
      setReferences([]);

      const response = await fetch(`${API_BASE_URL}/api/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ question }),
      });

      if (response.status === 401) {
        handleLogout('Session expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const json = await response.json();
      setAnswer(json.answer);
      setReferences(json.references || []);
    } catch (error) {
      setQaError(error.message || 'Unable to get answer. Please try again.');
    } finally {
      setIsAsking(false);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthError('');
    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthError('Please provide email and password.');
      return;
    }

    try {
      setAuthLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authForm.email.trim(),
          password: authForm.password.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      const payload = { token: data.token, user: data.user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setAuthToken(data.token);
      setAuthUser(data.user);
      setAuthForm({ email: '', password: '' });
    } catch (error) {
      setAuthError(error.message || 'Unable to authenticate.');
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout(message) {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken('');
    setAuthUser(null);
    setScrapedContent([]);
    setAnswer(null);
    setReferences([]);
    if (message) {
      setAuthError(message);
      setAuthMode('login');
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">WebLoom</p>
          <h1>Ask questions about your scraped knowledge base</h1>
          <p className="subtitle">
            Scrape pages with the Chrome extension, then ask natural-language questions to get
            AI-powered answers grounded in your data.
          </p>
        </div>
        <div className="status-tag">
          <span className={`dot ${authToken ? '' : 'offline'}`} />
          {authToken ? (
            <>
              <span>{authUser?.email}</span>
              <button className="link-button" onClick={() => handleLogout()}>
                Log out
              </button>
            </>
          ) : (
            <span>Not signed in</span>
          )}
        </div>
      </header>

      {!authToken ? (
        <section className="card auth-panel">
          <div className="auth-mode-toggle">
            {['login', 'signup'].map((mode) => (
              <button
                key={mode}
                className={authMode === mode ? 'active' : ''}
                onClick={() => {
                  setAuthMode(mode);
                  setAuthError('');
                }}
              >
                {mode === 'login' ? 'Login' : 'Sign up'}
              </button>
            ))}
          </div>
          <form onSubmit={handleAuthSubmit}>
            <label>Email</label>
            <input
              type="email"
              value={authForm.email}
              onChange={(event) =>
                setAuthForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="you@example.com"
              required
              disabled={authLoading}
            />
            <label>Password</label>
            <input
              type="password"
              value={authForm.password}
              onChange={(event) =>
                setAuthForm((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="At least 6 characters"
              required
              disabled={authLoading}
            />
            <button type="submit" disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Create account'}
            </button>
            {authError && <p className="error">{authError}</p>}
          </form>
        </section>
      ) : (
        <main className="grid">
          <section className="card qa-card">
            <h2>Ask WebLoom AI</h2>
            <p className="helper-text">Answers come directly from the content you scraped.</p>

            <form onSubmit={handleAskQuestion} className="qa-form">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="e.g. Summarize the main points from the latest articles"
                rows={4}
                disabled={isAsking}
              />
              <button type="submit" disabled={isAsking}>
                {isAsking ? 'Thinking...' : 'Ask Question'}
              </button>
            </form>

            {qaError && <p className="error">{qaError}</p>}

            {answer && (
              <div className="answer-block">
                <div className="answer-label">Answer</div>
                <p>{answer}</p>

                {!!references.length && (
                  <div className="references">
                    <div className="answer-label">References</div>
                    <ul>
                      {references.map((ref) => (
                        <li key={ref.id}>
                          <a href={ref.url} target="_blank" rel="noreferrer">
                            {ref.title || ref.url}
                          </a>
                          {ref.snippet && <p>{ref.snippet}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="card content-card">
            <div className="content-header">
              <div>
                <h2>Scraped Knowledge Base</h2>
                <p className="helper-text">
                  {contentLoading
                    ? 'Loading your scraped content...'
                    : scrapedContent.length
                    ? `Showing ${scrapedContent.length} latest entries`
                    : 'No content yet. Use the Chrome extension to scrape a page.'}
                </p>
              </div>
              {lastUpdatedLabel && (
                <div className="timestamp">Updated {lastUpdatedLabel}</div>
              )}
            </div>

            {contentError && <p className="error">{contentError}</p>}

            <div className="content-list">
              {scrapedContent.map((item) => {
                let hostname = 'Unknown source';
                try {
                  hostname = new URL(item.url).hostname;
                } catch {
                  // Ignore parsing errors
                }

                return (
                  <article key={item.id} className="content-item">
                    <div className="content-meta">
                      <span>{hostname}</span>
                      <span>
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleDateString()
                          : 'Unknown date'}
                      </span>
                    </div>
                    <h3>{item.title || 'Untitled page'}</h3>
                    <p>{item.content?.slice(0, 220)}...</p>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      View source ↗
                    </a>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      )}

      <footer className="app-footer">
        <p>Need data? Open the WebLoom Chrome extension and scrape any article or blog post.</p>
      </footer>
    </div>
  );
}

export default App;
