import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_FILE = join(__dirname, 'webloom.db');

let db = null;
let SQL = null;

export async function initDatabase() {
  try {
    SQL = await initSqlJs();

    if (existsSync(DB_FILE)) {
      const buffer = readFileSync(DB_FILE);
      db = new SQL.Database(buffer);
      console.log('✅ Database loaded from file');
    } else {
      db = new SQL.Database();
      console.log('✅ New database created');
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS scraped_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    ensureScrapedContentHasUserId();

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_url ON scraped_content(url)
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_timestamp ON scraped_content(timestamp)
    `);

    saveDatabase();
    
    console.log('✅ Database initialized successfully (SQLite)');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_FILE, buffer);
  } catch (error) {
    console.error('Error saving database:', error);
    throw error;
  }
}

async function ensureDb() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

function ensureScrapedContentHasUserId() {
  const pragma = db.exec(`PRAGMA table_info(scraped_content)`);
  const hasUserId = pragma.length > 0 && pragma[0].values.some((row) => row[1] === 'user_id');
  if (!hasUserId) {
    db.run('ALTER TABLE scraped_content ADD COLUMN user_id INTEGER');
  }
}

export async function insertScrapedContent(url, title, content, timestamp, userId = null) {
  await ensureDb();
  
  const stmt = db.prepare(`
    INSERT INTO scraped_content (url, title, content, timestamp, user_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.bind([
    url,
    title || 'Untitled',
    content,
    timestamp || new Date().toISOString(),
    userId ?? null,
  ]);
  stmt.step();
  stmt.free();
  
  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];
  
  saveDatabase();
  return id;
}

export async function getAllScrapedContent(limit = 100, offset = 0, userId = null) {
  await ensureDb();

  const query = `
    SELECT id, url, title, content, timestamp, created_at, user_id
    FROM scraped_content
    ${userId ? 'WHERE user_id = ?' : ''}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const stmt = db.prepare(query);
  const params = userId ? [userId, limit, offset] : [limit, offset];
  stmt.bind(params);
  
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id,
      url: row.url,
      title: row.title,
      content: row.content,
      timestamp: row.timestamp,
      created_at: row.created_at
    });
  }
  
  stmt.free();
  return results;
}

export async function getScrapedContentById(id) {
  await ensureDb();
  
  const stmt = db.prepare(`
    SELECT id, url, title, content, timestamp, created_at
    FROM scraped_content
    WHERE id = ?
  `);
  
  stmt.bind([id]);
  
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  
  stmt.free();
  return result;
}

export async function searchScrapedContent(query, userId = null, limit = 50) {
  await ensureDb();
  
  const stmt = db.prepare(`
    SELECT id, url, title, content, timestamp, created_at, user_id
    FROM scraped_content
    WHERE (content LIKE ? OR title LIKE ?)
    ${userId ? 'AND user_id = ?' : ''}
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  const searchTerm = `%${query}%`;
  const params = userId
    ? [searchTerm, searchTerm, userId, limit]
    : [searchTerm, searchTerm, limit];
  stmt.bind(params);
  
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id,
      url: row.url,
      title: row.title,
      content: row.content,
      timestamp: row.timestamp,
      created_at: row.created_at
    });
  }
  
  stmt.free();
  return results;
}

export async function getContentCount(userId = null) {
  await ensureDb();
  
  const stmt = db.prepare(
    userId
      ? 'SELECT COUNT(*) as count FROM scraped_content WHERE user_id = ?'
      : 'SELECT COUNT(*) as count FROM scraped_content'
  );
  if (userId) {
    stmt.bind([userId]);
  }
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  
  return result.count;
}

export async function deleteScrapedContent(id, userId = null) {
  await ensureDb();
  
  const stmt = db.prepare(
    userId ? 'DELETE FROM scraped_content WHERE id = ? AND user_id = ?' : 'DELETE FROM scraped_content WHERE id = ?'
  );
  const params = userId ? [id, userId] : [id];
  stmt.bind(params);
  stmt.step();
  const changes = db.getRowsModified();
  stmt.free();
  
  if (changes > 0) {
    saveDatabase();
    return true;
  }
  
  return false;
}

export async function createUser(email, passwordHash) {
  await ensureDb();

  const stmt = db.prepare(`
    INSERT INTO users (email, password)
    VALUES (?, ?)
  `);
  stmt.bind([email, passwordHash]);
  stmt.step();
  stmt.free();

  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];
  saveDatabase();
  return id;
}

export async function getUserByEmail(email) {
  await ensureDb();
  const stmt = db.prepare(`
    SELECT id, email, password, created_at
    FROM users
    WHERE email = ?
  `);
  stmt.bind([email]);
  const user = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return user;
}

export async function getUserById(id) {
  await ensureDb();
  const stmt = db.prepare(`
    SELECT id, email, password, created_at
    FROM users
    WHERE id = ?
  `);
  stmt.bind([id]);
  const user = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return user;
}
