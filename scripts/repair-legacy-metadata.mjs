import fs from 'node:fs/promises';
import path from 'node:path';
import iconv from 'iconv-lite';
import * as cheerio from 'cheerio';

const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root, 'migration', 'manifest.json'), 'utf8'));
const articleDir = path.join(root, 'src', 'content', 'articles', 'legacy');
const listUrls = [...new Set(manifest.pages.map((page) => page.url).filter((url) => /(?:NewsList\.asp|\/webfile\/?(?:index\.asp)?$)/i.test(url)))];
const names = new Map();
const failures = [];

function decode(buffer, contentType = '') {
  const probe = buffer.subarray(0, 2048).toString('latin1');
  const declared = `${contentType} ${probe}`.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]?.toLowerCase();
  return iconv.decode(buffer, declared && iconv.encodingExists(declared) ? declared : 'gb18030');
}
function clean(value = '') { return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }
function idFrom(value, base) {
  try { const url = new URL(value, base); return url.pathname.toLowerCase().endsWith('/newsview.asp') ? (url.searchParams.get('id') || url.searchParams.get('ID')) : null; } catch { return null; }
}
function score(value) {
  if (!value || /^(?:详情|详细|更多|查看|点击进入)$/i.test(value)) return -1;
  return Math.min(value.length, 80) + (/图书馆/.test(value) ? 1 : 0);
}

for (let index = 0; index < listUrls.length; index += 8) {
  const batch = listUrls.slice(index, index + 8);
  await Promise.all(batch.map(async (url) => {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = decode(Buffer.from(await response.arrayBuffer()), response.headers.get('content-type') || '');
      const $ = cheerio.load(html);
      $('a[href]').each((_, element) => {
        const id = idFrom($(element).attr('href'), url); if (!id) return;
        const candidate = clean($(element).text()) || clean($(element).find('img').attr('alt')) || clean($(element).attr('title'));
        if (score(candidate) > score(names.get(id))) names.set(id, candidate);
      });
    } catch (error) { failures.push({ url, error: error.message }); }
  }));
  process.stdout.write(`\r已复核 ${Math.min(index + 8, listUrls.length)} / ${listUrls.length} 个列表页`);
}

const files = (await fs.readdir(articleDir)).filter((name) => name.endsWith('.mdoc'));
const repairs = [];
for (const filename of files) {
  const target = path.join(articleDir, filename);
  let content = await fs.readFile(target, 'utf8');
  const id = content.match(/^legacyId:\s*["']?([^"'\r\n]+)["']?/m)?.[1];
  const current = JSON.parse(content.match(/^title:\s*(.+)$/m)?.[1] || '""');
  const replacement = id ? names.get(id) : '';
  if (replacement && /^(?:东莞城市学院图书馆|旧站文章)/.test(current)) {
    content = content.replace(/^title:\s*.+$/m, `title: ${JSON.stringify(replacement)}`);
    if (/^summary:\s*"旧站迁移内容，待人工复核摘要。"$/m.test(content)) content = content.replace(/^summary:\s*.+$/m, `summary: ${JSON.stringify(`${replacement}（旧站内容已保留，正文与附件待业务复核。）`)}`);
    await fs.writeFile(target, content, 'utf8'); repairs.push({ id, from: current, to: replacement, file: filename });
  }
}

const report = { generatedAt: new Date().toISOString(), scannedListPages: listUrls.length, discoveredTitles: names.size, repaired: repairs.length, repairs, failures };
await fs.writeFile(path.join(root, 'migration', 'metadata-repair.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(`\n完成：发现 ${names.size} 个列表标题，修复 ${repairs.length} 个通用标题，列表页失败 ${failures.length} 个。`);
