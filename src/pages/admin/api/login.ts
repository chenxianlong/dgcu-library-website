import type { APIRoute } from 'astro';
import { createSession, isLoginRateLimited, recordLoginAttempt, verifyPassword } from '../../../lib/server/auth';
import { getDatabase, nowIso } from '../../../lib/server/db';

export const POST: APIRoute = async (context) => {
  const expectedOrigin = process.env.PUBLIC_ORIGIN || context.url.origin;
  const requestOrigin = context.request.headers.get('origin');
  if (!requestOrigin || requestOrigin !== expectedOrigin) return new Response('Invalid request origin', { status: 403 });
  const form = await context.request.formData();
  const username = String(form.get('username') || '').trim().slice(0, 80);
  const password = String(form.get('password') || '');
  const requestedNext = String(form.get('next') || '/admin/');
  const next = requestedNext.startsWith('/admin') && !requestedNext.startsWith('//') ? requestedNext : '/admin/';
  if (!username || !password) return context.redirect(`/admin/login?error=missing&next=${encodeURIComponent(next)}`, 303);
  if (isLoginRateLimited(context, username)) return context.redirect('/admin/login?error=limited', 303);

  const admin = getDatabase().prepare(`SELECT * FROM admins WHERE username = ? COLLATE NOCASE AND status = 'active'`).get(username) as Record<string, string | number> | undefined;
  const valid = admin ? await verifyPassword(password, String(admin.password_salt), String(admin.password_hash)) : false;
  recordLoginAttempt(context, username, valid);
  if (!admin || !valid) return context.redirect(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`, 303);

  createSession(context, Number(admin.id));
  getDatabase().prepare('UPDATE admins SET last_login_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), admin.id);
  return context.redirect(next, 303);
};

export const ALL: APIRoute = (context) => context.redirect('/admin/login', 303);
