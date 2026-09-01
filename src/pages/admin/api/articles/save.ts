import type { APIRoute } from 'astro';
import { audit, verifyCsrf } from '../../../../lib/server/auth';
import { getArticle, saveArticle, slugify } from '../../../../lib/server/content';
import { storeImage } from '../../../../lib/server/uploads';

const text = (form: FormData, name: string, max = 10000) => String(form.get(name) || '').trim().slice(0, max);
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  if (!verifyCsrf(context, form.get('csrf'))) return new Response('Invalid CSRF token', { status: 403 });
  const originalId = text(form, 'originalId', 120);
  const title = text(form, 'title', 240); const date = text(form, 'date', 10); const summary = text(form, 'summary', 2000); let content = text(form, 'content', 500000);
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !summary || !content) return context.redirect(`/admin/articles/${originalId || 'new'}/?error=validation`, 303);
  let id = originalId || slugify(title) || `article-${Date.now()}`;
  if (!originalId && getArticle(id, true)) id = `${id}-${Date.now().toString(36)}`;
  const status = ['published','draft','archived'].includes(text(form,'status',20)) ? text(form,'status',20) : 'draft';
  try {
    const uploadedCover = await storeImage(form.get('coverFile'));
    const bodyImages = form.getAll('contentImages');
    for (const value of bodyImages) {
      const imagePath = await storeImage(value);
      if (imagePath) content += `\n\n![正文图片](${imagePath})`;
    }
    saveArticle({ id, title, date, summary, content, category: text(form,'category',40), cover: uploadedCover || text(form,'cover',500), featured: form.get('featured') === 'on', sourceUrl: text(form,'sourceUrl',1000), legacyId: text(form,'legacyId',100), status });
  } catch {
    return context.redirect(`/admin/articles/${originalId || 'new'}/?error=upload`,303);
  }
  audit(context.locals.admin!.id, originalId ? 'update' : 'create', 'article', id, title);
  return context.redirect('/admin/articles/?saved=1', 303);
};
