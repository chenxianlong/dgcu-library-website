import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const databasePath = resolve(process.env.LIBRARY_DB_PATH || './data/library.sqlite');
const db = new DatabaseSync(databasePath);
const rows = db.prepare('SELECT id,date FROM articles').all();
const update = db.prepare('UPDATE articles SET date = ?, updated_at = ? WHERE id = ?');
const now = new Date().toISOString();
let repaired = 0;

db.exec('BEGIN');
try {
  for (const row of rows) {
    const current = String(row.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(current)) continue;
    const parsed = new Date(current);
    if (Number.isNaN(parsed.getTime())) continue;
    update.run(parsed.toISOString().slice(0,10), now, row.id);
    repaired++;
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

console.log(`Repaired ${repaired} article dates in ${databasePath}`);
