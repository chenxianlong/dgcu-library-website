import type { APIRoute } from 'astro';
import { audit, verifyCsrf } from '../../../../lib/server/auth';
import { getResource, saveResource, slugify } from '../../../../lib/server/content';
const text = (form: FormData, name: string, max = 10000) => String(form.get(name) || '').trim().slice(0, max);
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  if (!verifyCsrf(context, form.get('csrf'))) return new Response('Invalid CSRF token', { status: 403 });
  const originalId = text(form,'originalId',120); const name = text(form,'name',200); const description = text(form,'description',4000); const url = text(form,'url',1000);
  if (!name || !description || !/^https?:\/\//i.test(url)) return context.redirect(`/admin/resources/${originalId || 'new'}/?error=validation`,303);
  let id = originalId || slugify(name) || `resource-${Date.now()}`; if (!originalId && getResource(id,true)) id = `${id}-${Date.now().toString(36)}`;
  const status = ['published','draft','archived'].includes(text(form,'status',20)) ? text(form,'status',20) : 'draft';
  saveResource({ id,name,description,url,category:text(form,'category',40),access:text(form,'access',20),featured:form.get('featured')==='on',status });
  audit(context.locals.admin!.id, originalId ? 'update' : 'create', 'resource', id, name);
  return context.redirect('/admin/resources/?saved=1',303);
};
