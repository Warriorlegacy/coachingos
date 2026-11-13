// server/db.js - Multi-Runtime Database Adapter (Node.js SQLite, sql.js WASM, Cloudflare D1)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const req = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.url && import.meta.url.startsWith('file:')) {
      return createRequire(import.meta.url);
    }
  } catch { /* ignored */ }
  return null;
})();

const here = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.url && import.meta.url.startsWith('file:')) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch { /* ignored */ }
  try { return process.cwd ? process.cwd() : '/'; } catch { return '/'; }
})();

let instance = null;
let kind = 'none';
let currentDbFile = '';

function makeNodeDriver(dbFile) {
  if (!req) throw new Error('require unavailable');
  const { DatabaseSync } = req('node:sqlite');
  if (!DatabaseSync) throw new Error('node:sqlite unavailable');
  
  const d = new DatabaseSync(dbFile);
  d.exec('PRAGMA foreign_keys = ON');
  d.exec('PRAGMA busy_timeout = 5000');
  try { d.exec('PRAGMA journal_mode = WAL'); } catch { /* in-memory or read-only */ }

  return {
    kind: 'node:sqlite',
    exec(sql) { d.exec(sql); },
    run(sql, params = []) {
      const stmt = d.prepare(sql);
      const r = stmt.run(...params);
      return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
    },
    all(sql, params = []) {
      const stmt = d.prepare(sql);
      return stmt.all(...params);
    },
    get(sql, params = []) {
      const stmt = d.prepare(sql);
      const res = stmt.get(...params);
      return res ?? null;
    },
    close() {
      try { d.close(); } catch { /* ignore */ }
    }
  };
}

/** Fallback WASM driver for environments without node:sqlite */
async function makeWasmDriver(dbFile) {
  if (!req) throw new Error('require unavailable');
  const initSqlJs = req('sql.js');
  const SQL = await initSqlJs();
  let buffer = null;
  if (dbFile !== ':memory:' && fs.existsSync(dbFile)) {
    buffer = fs.readFileSync(dbFile);
  }
  const db = buffer ? new SQL.Database(buffer) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');

  const persist = () => {
    if (dbFile && dbFile !== ':memory:') {
      const data = db.export();
      fs.writeFileSync(dbFile, Buffer.from(data));
    }
  };

  return {
    kind: 'sql.js',
    exec(sql) {
      db.run(sql);
      persist();
    },
    run(sql, params = []) {
      db.run(sql, params);
      persist();
      const res = db.exec("SELECT changes() AS changes, last_insert_rowid() AS lastInsertRowid");
      const changes = res[0]?.values[0]?.[0] || 0;
      const lastInsertRowid = res[0]?.values[0]?.[1] || 0;
      return { changes: Number(changes), lastInsertRowid: Number(lastInsertRowid) };
    },
    all(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },
    get(sql, params = []) {
      const all = this.all(sql, params);
      return all[0] ?? null;
    },
    close() {
      persist();
      db.close();
    }
  };
}

/**
 * @param {string|null} [dbPath]
 */
export async function initDatabase(dbPath = null) {
  if (instance) return instance;

  const targetFile = dbPath || process.env.DATABASE_FILE || path.resolve(here, '../data/coachingos.db');
  currentDbFile = targetFile;

  if (targetFile !== ':memory:') {
    const dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  try {
    instance = makeNodeDriver(targetFile);
    kind = 'node:sqlite';
  } catch (err) {
    console.warn('[DB] node:sqlite init failed, falling back to sql.js WASM:', err.message);
    instance = await makeWasmDriver(targetFile);
    kind = 'sql.js';
  }

  // Load and apply schema
  const schemaPath = path.resolve(here, 'db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    instance.exec(schemaSql);
  }

  return instance;
}

export function getDatabase() {
  if (!instance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return instance;
}

export function getDatabaseStatus() {
  return {
    driver: kind,
    file: currentDbFile,
    durable: currentDbFile !== ':memory:',
    ready: !!instance,
  };
}

// Reset instance for isolated tests
export function _resetDatabaseForTesting() {
  if (instance) {
    try { instance.close(); } catch { /* ignore */ }
    instance = null;
    kind = 'none';
    currentDbFile = '';
  }
}
