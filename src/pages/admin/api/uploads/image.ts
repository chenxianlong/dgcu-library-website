import type { APIRoute } from 'astro';
import { audit, verifyCsrf } from '../../../../lib/server/auth';
import { storeImage } from '../../../../lib/server/uploads';

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  if (!verifyCsrf(context, form.get('csrf'))) {
    return Response.json({ error: '登录状态已失效，请刷新页面后重试。' }, { status: 403 });
  }

  try {
    const file = form.get('image');
    const path = await storeImage(file);
    if (!path) return Response.json({ error: '请选择图片文件。' }, { status: 400 });
    audit(context.locals.admin!.id, 'upload', 'image', path, file instanceof File ? file.name : '');
    return Response.json({ path });
  } catch (error) {
    const message = error instanceof Error ? error.message : '图片上传失败。';
    return Response.json({ error: message }, { status: 400 });
  }
};
