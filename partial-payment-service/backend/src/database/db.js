import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const log = getLogger('database');

const DATA_DIR = path.resolve(__dirname, '../../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_PATH = path.join(DATA_DIR, 'partial_payment.sqlite');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function backupDatabase() {
  if (fs.existsSync(DB_PATH)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `partial_payment_${timestamp}.sqlite`);
    fs.copyFileSync(DB_PATH, backupPath);
    log.info(`Created database backup at ${backupPath}`);
  }
}

// Perform backup before opening (in case migration fails)
backupDatabase();

const db = new Database(DB_PATH);

// Configure PRAGMAs for performance, concurrency, and reliability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

// Ensure migration history table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

let currentDbVersion = 'uninitialized';

function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  
  const getApplied = db.prepare('SELECT filename FROM migrations_history').pluck();
  const appliedFiles = new Set(getApplied.all());
  const insertMigration = db.prepare('INSERT INTO migrations_history (filename) VALUES (?)');

  // We wrap migration application in a transaction
  const applyTransaction = db.transaction((file, sql) => {
    db.exec(sql);
    insertMigration.run(file);
  });

  for (const file of files) {
    if (!appliedFiles.has(file)) {
      log.info(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      try {
        applyTransaction(file, sql);
        log.info(`Successfully applied migration: ${file}`);
      } catch (err) {
        log.error({ err, file }, `Failed to apply migration ${file}`);
        process.exit(1);
      }
    }
  }

  // Determine current version
  const lastApplied = db.prepare('SELECT filename FROM migrations_history ORDER BY id DESC LIMIT 1').get();
  if (lastApplied) {
    currentDbVersion = lastApplied.filename.replace('.sql', '');
  }
}

runMigrations();

export const databaseVersion = currentDbVersion;
export default db;
