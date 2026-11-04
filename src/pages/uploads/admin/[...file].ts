import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { uploadFilePath } from '../../../lib/server/uploads';

const types: Record<string,string> = { '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif' };
export const GET: APIRoute = async ({params}) => {
  const path = uploadFilePath(params.file || '');
  if (!path) return new Response('Not found',{status:404});
  try {
    const file = await readFile(path);
    return new Response(file,{headers:{'Content-Type':types[extname(path).toLowerCase()]||'application/octet-stream','Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'}});
  } catch { return new Response('Not found',{status:404}); }
};
