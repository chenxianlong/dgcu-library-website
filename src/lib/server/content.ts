import Markdoc from '@markdoc/markdoc';
import { getDatabase, nowIso } from './db';

export type Article = {
  id: string; title: string; date: string; category: string; summary: string; cover: string;
  featured: boolean; sourceUrl: string; legacyId: string; content: string; status: string;
  createdAt: string; updatedAt: string;
};

export type LibraryResource = {
  id: string; name: string; description: string; url: string; category: string;
  access: string; featured: boolean; status: string; createdAt: string; updatedAt: string;
};

function articleFromRow(row: Record<string, unknown>): Article {
  return {
    id: String(row.id), title: String(row.title), date: normalizeArticleDate(row.date), category: String(row.category),
    summary: String(row.summary), cover: String(row.cover || ''), featured: Boolean(row.featured),
    sourceUrl: String(row.source_url || ''), legacyId: String(row.legacy_id || ''),
    content: String(row.content || ''), status: String(row.status), createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function normalizeArticleDate(value: unknown) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0,10);
}

function resourceFromRow(row: Record<string, unknown>): LibraryResource {
  return {
    id: String(row.id), name: String(row.name), description: String(row.description), url: String(row.url),
    category: String(row.category), access: String(row.access), featured: Boolean(row.featured),
    status: String(row.status), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export function listArticles(options: { includeUnpublished?: boolean; limit?: number; offset?: number } = {}) {
  const where = options.includeUnpublished ? '' : "WHERE status = 'published'";
  const limit = Math.max(1, Math.min(options.limit || 1000, 2000));
  const offset = Math.max(0, options.offset || 0);
  return (getDatabase().prepare(`SELECT * FROM articles ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`).all(limit, offset) as Record<string, unknown>[]).map(articleFromRow);
}

export function countArticles(includeUnpublished = false) {
  const where = includeUnpublished ? '' : "WHERE status = 'published'";
  return Number((getDatabase().prepare(`SELECT COUNT(*) AS count FROM articles ${where}`).get() as { count: number }).count);
}

export function getArticle(id: string, includeUnpublished = false) {
  const row = getDatabase().prepare(`SELECT * FROM articles WHERE id = ? ${includeUnpublished ? '' : "AND status = 'published'"}`).get(id) as Record<string, unknown> | undefined;
  return row ? articleFromRow(row) : null;
}

export function saveArticle(input: Omit<Article, 'createdAt' | 'updatedAt'>) {
  const now = nowIso();
  getDatabase().prepare(`
    INSERT INTO articles (id,title,date,category,summary,cover,featured,source_url,legacy_id,content,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,date=excluded.date,category=excluded.category,
      summary=excluded.summary,cover=excluded.cover,featured=excluded.featured,source_url=excluded.source_url,
      legacy_id=excluded.legacy_id,content=excluded.content,status=excluded.status,updated_at=excluded.updated_at
  `).run(input.id, input.title, input.date, input.category, input.summary, input.cover, input.featured ? 1 : 0,
    input.sourceUrl, input.legacyId, input.content, input.status, now, now);
}

export function listResources(includeUnpublished = false) {
  const where = includeUnpublished ? '' : "WHERE status = 'published'";
  return (getDatabase().prepare(`SELECT * FROM resources ${where} ORDER BY featured DESC, name`).all() as Record<string, unknown>[]).map(resourceFromRow);
}

export function getResource(id: string, includeUnpublished = false) {
  const row = getDatabase().prepare(`SELECT * FROM resources WHERE id = ? ${includeUnpublished ? '' : "AND status = 'published'"}`).get(id) as Record<string, unknown> | undefined;
  return row ? resourceFromRow(row) : null;
}

export function saveResource(input: Omit<LibraryResource, 'createdAt' | 'updatedAt'>) {
  const now = nowIso();
  getDatabase().prepare(`
    INSERT INTO resources (id,name,description,url,category,access,featured,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,url=excluded.url,
      category=excluded.category,access=excluded.access,featured=excluded.featured,status=excluded.status,updated_at=excluded.updated_at
  `).run(input.id, input.name, input.description, input.url, input.category, input.access,
    input.featured ? 1 : 0, input.status, now, now);
}

export function renderArticleContent(content: string) {
  const ast = Markdoc.parse(content);
  const transformed = Markdoc.transform(ast);
  return Markdoc.renderers.html(transformed);
}

export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}
