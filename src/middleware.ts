import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/server/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.admin = null;
  context.locals.csrfToken = '';

  if (!context.url.pathname.startsWith('/admin')) return next();

  const session = getSession(context);
  context.locals.admin = session?.admin || null;
  context.locals.csrfToken = session?.csrfToken || '';

  const publicPath = context.url.pathname === '/admin/login' || context.url.pathname === '/admin/api/login';
  if (!session && !publicPath) {
    const target = encodeURIComponent(`${context.url.pathname}${context.url.search}`);
    return context.redirect(`/admin/login?next=${target}`, 303);
  }
  if (session && context.url.pathname === '/admin/login') return context.redirect('/admin/', 303);

  const response = await next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  return response;
});
