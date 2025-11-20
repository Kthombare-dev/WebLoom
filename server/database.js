import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_FILE = join(__dirname, 'webloom.db');

let db = null;
let SQL = null;

// Initialize SQL.js and database
export async function initDatabase() {
  try {
    // Initialize SQL.js (for Node.js, no locateFile needed)
    SQL = await initSqlJs();

    // Load existing database or create new one
    if (existsSync(DB_FILE)) {
      const buffer = readFileSync(DB_FILE);
      db = new SQL.Database(buffer);
      console.log('✅ Database loaded from file');
    } else {
      db = new SQL.Database();
      console.log('✅ New database created');
    }

    // Create table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS scraped_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_url ON scraped_content(url)
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_timestamp ON scraped_content(timestamp)
    `);

    // Save the database to file
    saveDatabase();
    
    console.log('✅ Database initialized successfully (SQLite)');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Save database to file
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

// Ensure database is initialized
async function ensureDb() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

export async function insertScrapedContent(url, title, content, timestamp) {
  await ensureDb();
  
  const stmt = db.prepare(`
    INSERT INTO scraped_content (url, title, content, timestamp)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.bind([url, title || 'Untitled', content, timestamp || new Date().toISOString()]);
  stmt.step();
  stmt.free();
  
  // Get the last inserted ID
  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];
  
  saveDatabase();
  return id;
}

export async function getAllScrapedContent(limit = 100, offset = 0) {
  await ensureDb();
  
  const stmt = db.prepare(`
    SELECT id, url, title, content, timestamp, created_at
    FROM scraped_content
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  stmt.bind([limit, offset]);
  
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

export async function searchScrapedContent(query, limit = 50) {
  await ensureDb();
  
  const stmt = db.prepare(`
    SELECT id, url, title, content, timestamp, created_at
    FROM scraped_content
    WHERE content LIKE ? OR title LIKE ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  const searchTerm = `%${query}%`;
  stmt.bind([searchTerm, searchTerm, limit]);
  
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

export async function getContentCount() {
  await ensureDb();
  
  const stmt = db.prepare('SELECT COUNT(*) as count FROM scraped_content');
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  
  return result.count;
}

export async function deleteScrapedContent(id) {
  await ensureDb();
  
  const stmt = db.prepare('DELETE FROM scraped_content WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const changes = db.getRowsModified();
  stmt.free();
  
  if (changes > 0) {
    saveDatabase();
    return true;
  }
  
  return false;
}
