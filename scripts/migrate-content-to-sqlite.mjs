import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import matter from 'gray-matter';
import YAML from 'yaml';

const root = resolve(import.meta.dirname, '..');
const databasePath = resolve(process.env.LIBRARY_DB_PATH || `${root}/data/library.sqlite`);
mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS articles (id TEXT PRIMARY KEY,title TEXT NOT NULL,date TEXT NOT NULL,category TEXT NOT NULL,summary TEXT NOT NULL,cover TEXT NOT NULL DEFAULT '',featured INTEGER NOT NULL DEFAULT 0,source_url TEXT NOT NULL DEFAULT '',legacy_id TEXT NOT NULL DEFAULT '',content TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'published',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS resources (id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,url TEXT NOT NULL,category TEXT NOT NULL,access TEXT NOT NULL,featured INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'published',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);`);

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const now = new Date().toISOString();
function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0,10);
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0,10);
}
const articleRoot = resolve(root, 'src/content/articles');
const insertArticle = db.prepare(`INSERT OR IGNORE INTO articles (id,title,date,category,summary,cover,featured,source_url,legacy_id,content,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
let articles = 0;
for (const file of filesUnder(articleRoot).filter((item) => ['.md','.mdoc'].includes(extname(item)))) {
  const parsed = matter(readFileSync(file, 'utf8'));
  const id = relative(articleRoot, file).replaceAll('\\','/').replace(/\.(md|mdoc)$/,'');
  insertArticle.run(id,String(parsed.data.title||id),normalizeDate(parsed.data.date),String(parsed.data.category||'通知公告'),String(parsed.data.summary||''),String(parsed.data.cover||''),parsed.data.featured?1:0,String(parsed.data.sourceUrl||''),String(parsed.data.legacyId||''),parsed.content.trim(),'published',now,now);
  articles++;
}

const resourceRoot = resolve(root, 'src/content/resources');
const insertResource = db.prepare(`INSERT OR IGNORE INTO resources (id,name,description,url,category,access,featured,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);
let resources = 0;
for (const file of filesUnder(resourceRoot).filter((item) => ['.yaml','.yml'].includes(extname(item)))) {
  const parsed = YAML.parse(readFileSync(file,'utf8'));
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const fileId = relative(resourceRoot,file).replaceAll('\\','/').replace(/\.ya?ml$/,'');
  for (const [index, data] of entries.entries()) {
    const id = String(data.id || (entries.length === 1 ? fileId : `${fileId}-${index + 1}`));
    insertResource.run(id,String(data.name||id),String(data.description||''),String(data.url||''),String(data.category||'中文数据库'),String(data.access||'校内'),data.featured?1:0,'published',now,now);
    resources++;
  }
}

const trialResourceFile = resolve(root, 'migration/trial-databases.yaml');
if (existsSync(trialResourceFile)) {
  const trialResources = YAML.parse(readFileSync(trialResourceFile, 'utf8'));
  for (const data of trialResources) {
    const id = String(data.id);
    insertResource.run(id,String(data.name||id),String(data.description||''),String(data.url||''),String(data.category||'试用数据库'),String(data.access||'校内'),data.featured?1:0,'published',now,now);
    resources++;
  }
}
console.log(`Migrated ${articles} article files and ${resources} resources into ${databasePath}`);
