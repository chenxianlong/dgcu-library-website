import type { APIRoute } from 'astro';
import { audit, verifyCsrf } from '../../../../lib/server/auth';
import { saveServiceHours, type ServiceHoursStatus } from '../../../../lib/server/settings';

const text = (form: FormData, name: string, max: number) => String(form.get(name) || '').trim().slice(0, max);

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  if (!verifyCsrf(context, form.get('csrf'))) return new Response('Invalid CSRF token', { status: 403 });

  const display = text(form, 'display', 60);
  const statusValue = text(form, 'status', 20);
  const statusText = text(form, 'statusText', 40);
  const note = text(form, 'note', 160);
  const enteredUrl = text(form, 'detailUrl', 500);
  const detailUrl = enteredUrl || '/news/';
  const validStatus = ['normal', 'special', 'closed'].includes(statusValue);
  const validUrl = detailUrl.startsWith('/') && !detailUrl.startsWith('//') || /^https?:\/\//i.test(detailUrl);
  if (!display || !statusText || !validStatus || !validUrl) {
    return context.redirect('/admin/service-hours/?error=validation', 303);
  }

  saveServiceHours({ display, status: statusValue as ServiceHoursStatus, statusText, note, detailUrl });
  audit(context.locals.admin!.id, 'update', 'site_setting', 'service_hours', `${display} / ${statusText}`);
  return context.redirect('/admin/service-hours/?saved=1', 303);
};
