import type { APIRoute } from 'astro';
import { hashPassword, verifyCsrf, verifyPassword } from '../../../../lib/server/auth';
import { getDatabase, nowIso } from '../../../../lib/server/db';
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  if (!verifyCsrf(context, form.get('csrf'))) return new Response('Invalid CSRF token',{status:403});
  const current = String(form.get('currentPassword')||''); const next = String(form.get('newPassword')||''); const confirm = String(form.get('confirmPassword')||'');
  const admin = getDatabase().prepare('SELECT * FROM admins WHERE id = ?').get(context.locals.admin!.id) as Record<string,string|number>;
  if (!(await verifyPassword(current,String(admin.password_salt),String(admin.password_hash)))) return context.redirect('/admin/account/?error=current',303);
  if (next !== confirm || next.length < 12 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return context.redirect('/admin/account/?error=policy',303);
  const { salt,hash } = await hashPassword(next); getDatabase().prepare('UPDATE admins SET password_hash=?,password_salt=?,updated_at=? WHERE id=?').run(hash,salt,nowIso(),admin.id);
  getDatabase().prepare('DELETE FROM admin_sessions WHERE admin_id=? AND id_hash NOT IN (SELECT id_hash FROM admin_sessions WHERE admin_id=? ORDER BY created_at DESC LIMIT 1)').run(admin.id,admin.id);
  return context.redirect('/admin/account/?saved=1',303);
};
