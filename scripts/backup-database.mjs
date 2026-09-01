import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const databasePath = resolve(process.env.LIBRARY_DB_PATH || './data/library.sqlite');
const backupPath = resolve(process.env.LIBRARY_DB_BACKUP_PATH || `./data/backups/library-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
mkdirSync(dirname(backupPath), { recursive: true });
const escaped = backupPath.replaceAll("'", "''");
const db = new DatabaseSync(databasePath);
db.exec(`VACUUM INTO '${escaped}'`);
console.log(`Database backup created: ${backupPath}`);
