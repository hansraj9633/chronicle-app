// src/storage/db.js
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

let db = null;
const DEFAULT_CATEGORIES = ['Journal', 'Tech', 'Creative', 'Other'];

export async function getDb() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('chronicle.db');
  await initSchema();
  return db;
}

async function initSchema() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      deck TEXT,
      body TEXT NOT NULL,
      category TEXT DEFAULT 'Journal',
      tags TEXT DEFAULT '',
      status TEXT DEFAULT 'published',
      word_count INTEGER DEFAULT 0,
      read_time INTEGER DEFAULT 1,
      pinned INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );
  `);

  // Insert defaults if not present
  await db.runAsync(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'broadsheet')`,
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('font_size', '16')`,
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('streak', '0')`,
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('last_write_date', '')`,
  );

  const categoryCount = await db.getFirstAsync(`SELECT COUNT(*) as count FROM categories`);
  if ((categoryCount?.count || 0) === 0) {
    for (const name of DEFAULT_CATEGORIES) {
      await db.runAsync(`INSERT INTO categories (name) VALUES (?)`, [name]);
    }
  }
}

// ── POSTS ──────────────────────────────────────────────

export async function getAllPosts(filter = 'All', search = '') {
  const d = await getDb();
  let query = `SELECT * FROM posts`;
  const params = [];
  const conditions = [];

  if (filter !== 'All') {
    conditions.push(`category = ?`);
    params.push(filter);
  }
  if (search.trim()) {
    conditions.push(`(title LIKE ? OR body LIKE ? OR tags LIKE ?)`);
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }
  if (conditions.length) query += ` WHERE ` + conditions.join(' AND ');
  query += ` ORDER BY pinned DESC, created_at DESC`;

  return await d.getAllAsync(query, params);
}

export async function getPost(id) {
  const d = await getDb();
  return await d.getFirstAsync(`SELECT * FROM posts WHERE id = ?`, [id]);
}

export async function createPost(post) {
  const d = await getDb();
  const now = new Date().toISOString();
  const wc = wordCount(post.body);
  const result = await d.runAsync(
    `INSERT INTO posts (title, deck, body, category, tags, status, word_count, read_time, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      post.title, post.deck || '', post.body,
      post.category || 'Journal', post.tags || '',
      post.status || 'published',
      wc, Math.max(1, Math.ceil(wc / 200)),
      0, now, now,
    ]
  );
  await updateStreak();
  return result.lastInsertRowId;
}

export async function updatePost(id, post) {
  const d = await getDb();
  const now = new Date().toISOString();
  const wc = wordCount(post.body);

  const existingPost = await d.getFirstAsync(`SELECT body FROM posts WHERE id = ?`, [id]);

  const oldImageUris = extractManagedImageUris(existingPost?.body || '');
  const newImageUris = extractManagedImageUris(post.body || '');

  const newImageSet = new Set(newImageUris);
  const removedImageUris = oldImageUris.filter(uri => !newImageSet.has(uri));

  for (const uri of removedImageUris) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Ignore file deletion errors so post update still succeeds
    }
  }

  await d.runAsync(
    `UPDATE posts SET title=?, deck=?, body=?, category=?, tags=?, status=?, word_count=?, read_time=?, updated_at=?
     WHERE id=?`,
    [
      post.title, post.deck || '', post.body,
      post.category || 'Journal', post.tags || '',
      post.status || 'published',
      wc, Math.max(1, Math.ceil(wc / 200)),
      now, id,
    ]
  );
}

export async function deletePost(id) {
  const d = await getDb();

  const post = await d.getFirstAsync(`SELECT body FROM posts WHERE id = ?`, [id]);

  if (post?.body) {
    const imageUris = extractManagedImageUris(post.body);

    for (const uri of imageUris) {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch {
        // Ignore file deletion errors so post delete still succeeds
      }
    }
  }

  await d.runAsync(`DELETE FROM posts WHERE id = ?`, [id]);
}

export async function togglePin(id, pinned) {
  const d = await getDb();
  await d.runAsync(`UPDATE posts SET pinned=? WHERE id=?`, [pinned ? 1 : 0, id]);
}

export async function getStats() {
  const d = await getDb();
  const total = await d.getFirstAsync(`SELECT COUNT(*) as count FROM posts WHERE status='published'`);
  const drafts = await d.getFirstAsync(`SELECT COUNT(*) as count FROM posts WHERE status='draft'`);
  const words = await d.getFirstAsync(`SELECT SUM(word_count) as total FROM posts WHERE status='published'`);
  const streak = await getSetting('streak');
  return {
    posts: total?.count || 0,
    drafts: drafts?.count || 0,
    words: words?.total || 0,
    streak: parseInt(streak) || 0,
  };
}

// ── ARCHIVE ────────────────────────────────────────────

export async function getPostsByMonth() {
  const d = await getDb();
  const posts = await d.getAllAsync(
    `SELECT id, title, category, status, word_count, read_time, pinned, created_at
     FROM posts WHERE status='published' ORDER BY created_at DESC`
  );
  // Group by YYYY-MM
  const groups = {};
  for (const p of posts) {
    const date = new Date(p.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = { key, label, posts: [] };
    groups[key].posts.push(p);
  }
  return Object.values(groups);
}

export async function exportAllPosts() {
  const d = await getDb();
  return await d.getAllAsync(`SELECT * FROM posts ORDER BY created_at DESC`);
}

// Categories

export async function getCategories() {
  const d = await getDb();
  return await d.getAllAsync(`SELECT id, name FROM categories ORDER BY id ASC`);
}

export async function addCategory(name) {
  const d = await getDb();
  const trimmed = normalizeCategoryName(name);
  await ensureCategoryAvailable(trimmed);
  const result = await d.runAsync(`INSERT INTO categories (name) VALUES (?)`, [trimmed]);
  return result.lastInsertRowId;
}

export async function updateCategory(id, newName) {
  const d = await getDb();
  const trimmed = normalizeCategoryName(newName);
  const existing = await d.getFirstAsync(`SELECT name FROM categories WHERE id = ?`, [id]);
  if (!existing) throw new Error('Category not found.');
  if (existing.name.toLowerCase() === trimmed.toLowerCase()) return;
  await ensureCategoryAvailable(trimmed, id);
  await d.runAsync(`UPDATE categories SET name = ? WHERE id = ?`, [trimmed, id]);
}

export async function deleteCategory(id) {
  const d = await getDb();
  await d.runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
}

export async function importPosts(postsArray) {
  const d = await getDb();
  for (const p of postsArray) {
    const wc = p.word_count || p.body.trim().split(/\s+/).filter(Boolean).length;
    await d.runAsync(
      `INSERT OR IGNORE INTO posts (title, deck, body, category, tags, status, word_count, read_time, pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.title, p.deck || '', p.body, p.category || 'Journal', p.tags || '',
       p.status || 'published', wc, Math.max(1, Math.ceil(wc / 200)),
       p.pinned || 0, p.created_at, p.updated_at]
    );
  }
}

// ── SETTINGS ──────────────────────────────────────────

export async function getSetting(key) {
  const d = await getDb();
  const row = await d.getFirstAsync(`SELECT value FROM settings WHERE key=?`, [key]);
  return row?.value ?? null;
}

export async function setSetting(key, value) {
  const d = await getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [key, String(value)]
  );
}

// ── HELPERS ───────────────────────────────────────────

function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeCategoryName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Category name cannot be empty.');
  return trimmed;
}

async function ensureCategoryAvailable(name, excludeId = null) {
  const d = await getDb();
  const existing = excludeId == null
    ? await d.getFirstAsync(`SELECT id FROM categories WHERE LOWER(name) = LOWER(?)`, [name])
    : await d.getFirstAsync(`SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?`, [name, excludeId]);
  if (existing) throw new Error('That category already exists.');
}

async function updateStreak() {
  const d = await getDb();
  const today = new Date().toDateString();
  const lastDate = await getSetting('last_write_date');
  const streak = parseInt(await getSetting('streak')) || 0;

  if (lastDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const newStreak = lastDate === yesterday.toDateString() ? streak + 1 : 1;

  await setSetting('streak', newStreak);
  await setSetting('last_write_date', today);
}

function extractManagedImageUris(markdown = '') {
  const matches = [...String(markdown).matchAll(/!\[.*?\]\((file:\/\/.*?)\)/g)];
  const imageFolder = `${FileSystem.documentDirectory}chronicle-images/`;

  return matches
    .map(match => match[1])
    .filter(uri => uri.startsWith(imageFolder));
}