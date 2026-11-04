import { mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

export const uploadDirectory = resolve(process.env.LIBRARY_UPLOAD_DIR || './data/uploads');
const allowedTypes = new Map([
  ['image/jpeg','.jpg'], ['image/png','.png'], ['image/webp','.webp'], ['image/gif','.gif'],
]);

export async function storeImage(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return '';
  if (value.size > 10 * 1024 * 1024) throw new Error('Image is larger than 10 MB');
  const extension = allowedTypes.get(value.type) || extname(value.name).toLowerCase();
  if (!['.jpg','.jpeg','.png','.webp','.gif'].includes(extension)) throw new Error('Unsupported image type');
  await mkdir(uploadDirectory,{recursive:true});
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}${extension === '.jpeg' ? '.jpg' : extension}`;
  await writeFile(resolve(uploadDirectory,name),Buffer.from(await value.arrayBuffer()),{flag:'wx'});
  return `/uploads/admin/${name}`;
}

export function uploadFilePath(name: string) {
  const safe = name.replace(/[^A-Za-z0-9._-]/g,'');
  return safe === name ? resolve(uploadDirectory,safe) : null;
}
