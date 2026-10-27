import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const username = String(process.env.ADMIN_USERNAME || process.argv[2] || '').trim();
const displayName = String(process.env.ADMIN_DISPLAY_NAME || process.argv[3] || '内容管理员').trim();
const password = String(process.env.ADMIN_PASSWORD || '');
if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) throw new Error('ADMIN_USERNAME must be 3-40 letters, numbers, dots, underscores or hyphens.');
if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error('ADMIN_PASSWORD must contain letters and numbers and be at least 12 characters.');

const root = resolve(import.meta.dirname, '..');
const databasePath = resolve(process.env.LIBRARY_DB_PATH || `${root}/data/library.sqlite`);
mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE COLLATE NOCASE,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',last_login_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);`);
const salt = randomBytes(16).toString('base64');
const hash = ((await promisify(scryptCallback)(password,salt,64))).toString('base64');
const now = new Date().toISOString();
db.prepare(`INSERT INTO admins (username,display_name,password_hash,password_salt,status,created_at,updated_at) VALUES (?,?,?,?,'active',?,?) ON CONFLICT(username) DO UPDATE SET display_name=excluded.display_name,password_hash=excluded.password_hash,password_salt=excluded.password_salt,status='active',updated_at=excluded.updated_at`).run(username,displayName,hash,salt,now,now);
console.log(`Administrator '${username}' is ready in ${databasePath}`);
