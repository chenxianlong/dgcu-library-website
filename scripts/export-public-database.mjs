import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const sourcePath = resolve(process.argv[2] || './data/library.sqlite');
const outputPath = resolve(process.argv[3] || './data/library.seed.sqlite');

if (sourcePath === outputPath) {
  throw new Error('The public snapshot must not overwrite the runtime database.');
}

mkdirSync(dirname(outputPath), { recursive: true });
if (existsSync(outputPath)) unlinkSync(outputPath);

const escapeSqlString = (value) => value.replaceAll("'", "''");
const source = new DatabaseSync(sourcePath);

try {
  source.exec('PRAGMA wal_checkpoint(FULL);');
  source.exec(`VACUUM INTO '${escapeSqlString(outputPath)}';`);
} finally {
  source.close();
}

const snapshot = new DatabaseSync(outputPath);

try {
  snapshot.exec(`
    PRAGMA foreign_keys = ON;
    BEGIN IMMEDIATE;
    DELETE FROM admin_sessions;
    DELETE FROM login_attempts;
    DELETE FROM audit_logs;
    DELETE FROM admins;
    COMMIT;
    PRAGMA journal_mode = DELETE;
    VACUUM;
  `);

  const counts = Object.fromEntries(
    ['articles', 'resources', 'site_settings', 'admins', 'admin_sessions', 'login_attempts', 'audit_logs'].map(
      (table) => [table, Number(snapshot.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count)],
    ),
  );

  console.log(`Public database snapshot written to ${outputPath}`);
  console.log(JSON.stringify(counts, null, 2));
} finally {
  snapshot.close();
}
