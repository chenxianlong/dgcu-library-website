import type { APIRoute } from 'astro';
import { destroySession, verifyCsrf } from '../../../lib/server/auth';
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  if (!verifyCsrf(context, form.get('csrf'))) return new Response('Invalid CSRF token', { status: 403 });
  destroySession(context);
  return context.redirect('/admin/login', 303);
};
