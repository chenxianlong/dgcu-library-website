import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { APIContext } from 'astro';
import { closeExpiredSessions, getDatabase, nowIso } from './db';

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'dgcu_library_admin';
const SESSION_AGE_SECONDS = 60 * 60 * 8;

export type AdminUser = {
  id: number;
  username: string;
  displayName: string;
};

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function requestIp(context: APIContext) {
  const forwarded = context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || context.clientAddress || 'unknown';
}

function fingerprintIp(context: APIContext) {
  const secret = process.env.AUTH_SECRET || 'dgcu-library-local-development';
  return sha256(`${secret}:${requestIp(context)}`);
}

export async function hashPassword(password: string, salt = randomBytes(16).toString('base64')) {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return { salt, hash: derived.toString('base64') };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHash, 'base64');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function isLoginRateLimited(context: APIContext, username: string) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const result = getDatabase().prepare(`
    SELECT COUNT(*) AS count FROM login_attempts
    WHERE successful = 0 AND created_at >= ? AND (username = ? COLLATE NOCASE OR ip_hash = ?)
  `).get(since, username, fingerprintIp(context)) as { count: number };
  return Number(result.count) >= 5;
}

export function recordLoginAttempt(context: APIContext, username: string, successful: boolean) {
  getDatabase().prepare(`
    INSERT INTO login_attempts (username, ip_hash, successful, created_at) VALUES (?, ?, ?, ?)
  `).run(username, fingerprintIp(context), successful ? 1 : 0, nowIso());
}

export function createSession(context: APIContext, adminId: number) {
  closeExpiredSessions();
  const token = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(24).toString('base64url');
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_AGE_SECONDS * 1000).toISOString();
  getDatabase().prepare(`
    INSERT INTO admin_sessions (id_hash, admin_id, csrf_token, expires_at, created_at, ip_hash, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    sha256(token), adminId, csrfToken, expiresAt, now, fingerprintIp(context),
    (context.request.headers.get('user-agent') || '').slice(0, 300),
  );
  context.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: context.url.protocol === 'https:' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: SESSION_AGE_SECONDS,
  });
  return csrfToken;
}

export function destroySession(context: APIContext) {
  const token = context.cookies.get(SESSION_COOKIE)?.value;
  if (token) getDatabase().prepare('DELETE FROM admin_sessions WHERE id_hash = ?').run(sha256(token));
  context.cookies.delete(SESSION_COOKIE, { path: '/admin' });
}

export function getSession(context: APIContext): { admin: AdminUser; csrfToken: string } | null {
  const token = context.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = getDatabase().prepare(`
    SELECT a.id, a.username, a.display_name, s.csrf_token, s.expires_at
    FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.id_hash = ? AND a.status = 'active'
  `).get(sha256(token)) as Record<string, string | number> | undefined;
  if (!row || String(row.expires_at) <= nowIso()) {
    if (row) destroySession(context);
    return null;
  }
  return {
    admin: { id: Number(row.id), username: String(row.username), displayName: String(row.display_name) },
    csrfToken: String(row.csrf_token),
  };
}

export function verifyCsrf(context: APIContext, supplied: FormDataEntryValue | null) {
  const session = getSession(context);
  if (!session || typeof supplied !== 'string') return false;
  const actual = Buffer.from(supplied);
  const expected = Buffer.from(session.csrfToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function audit(adminId: number | null, action: string, entityType: string, entityId: string, detail = '') {
  getDatabase().prepare(`
    INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, action, entityType, entityId, detail.slice(0, 1000), nowIso());
}
