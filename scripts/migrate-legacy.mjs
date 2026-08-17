import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import iconv from 'iconv-lite';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const root = process.cwd();
const startUrl = new URL('http://lib.dgcu.edu.cn/webfile/');
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 1500);
const downloadAssets = process.argv.includes('--download-assets');
const outputDir = path.join(root, 'src', 'content', 'articles', 'legacy');
const migrationDir = path.join(root, 'migration');
const assetDir = path.join(root, 'public', 'legacy-assets');
const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
const queue = [startUrl.href];
const visited = new Set();
const pages = [];
const articles = [];
const errors = [];

await Promise.all([fs.mkdir(outputDir, { recursive: true }), fs.mkdir(migrationDir, { recursive: true }), fs.mkdir(assetDir, { recursive: true })]);

function normalizeUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (url.hostname === 'lib.ccdgut.edu.cn') url.hostname = 'lib.dgcu.edu.cn';
    url.hash = '';
    return url;
  } catch { return null; }
}

function shouldCrawl(url) {
  return url.hostname === startUrl.hostname && url.pathname.toLowerCase().startsWith('/webfile/') && !/\.(?:jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|zip|rar|7z)$/i.test(url.pathname);
}

function decodeHtml(buffer, contentType = '') {
  const probe = buffer.subarray(0, 2048).toString('latin1');
  const declared = `${contentType} ${probe}`.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]?.toLowerCase();
  const charset = declared && iconv.encodingExists(declared) ? declared : 'gb18030';
  return iconv.decode(buffer, charset);
}

function cleanText(value = '') { return value.replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
function yaml(value = '') { return JSON.stringify(cleanText(value)); }
function slugFor(url) {
  const id = url.searchParams.get('id') || url.searchParams.get('ID') || url.searchParams.get('newsid');
  return id ? `legacy-${id}` : `legacy-${crypto.createHash('sha1').update(url.href).digest('hex').slice(0, 10)}`;
}

function pickArticle($) {
  if ($('.newsabout .con').length) return $('.newsabout .con').first();
  if ($('.newsabout').length) return $('.newsabout').first();
  const selectors = ['#content', '.content', '.news-content', '.article-content', '.nr', '.main', 'td', 'div'];
  const candidates = selectors.flatMap((selector) => $(selector).toArray()).filter((node) => cleanText($(node).text()).length > 120);
  candidates.sort((a, b) => cleanText($(b).text()).length - cleanText($(a).text()).length);
  return candidates[0] ? $(candidates[0]) : $('body');
}

async function saveAsset(url, articleSlug) {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const ext = path.extname(new URL(response.url).pathname).slice(0, 10) || '.bin';
    const name = `${crypto.createHash('sha1').update(url).digest('hex').slice(0, 12)}${ext}`;
    const dir = path.join(assetDir, articleSlug); await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), Buffer.from(await response.arrayBuffer()));
    return `/legacy-assets/${articleSlug}/${name}`;
  } catch (error) { errors.push({ url, error: `资源下载失败：${error.message}` }); return url; }
}

async function migrateArticle(url, html, $) {
  const slug = slugFor(url);
  if (articles.some((article) => article.slug === slug)) return;
  const body = pickArticle($).clone();
  body.find('script,style,nav,form,input,button').remove();
  const headingCandidates = [$('.newsabout h1').first().text(), $('h1').first().text(), $('title').text().split(/[-_|]/)[0], body.find('strong,font').filter((_, el) => cleanText($(el).text()).length > 6).first().text()];
  const title = cleanText(headingCandidates.find((value) => cleanText(value).length > 5) || `旧站文章 ${slug}`);
  const allText = cleanText(body.text());
  const metadata = cleanText($('.newsabout h2').first().text());
  const date = metadata.match(/(20\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/) || allText.match(/(20\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/) || html.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  const published = date ? `${date[1]}-${date[2].padStart(2, '0')}-${date[3].padStart(2, '0')}` : '2014-01-01';
  const category = /获奖|名单/.test(title) ? '获奖通知' : /活动|讲座|展览|培训/.test(title) ? '活动预告' : /通知|公告|开放|试用/.test(title) ? '通知公告' : '新闻动态';
  if (downloadAssets) {
    for (const element of body.find('img[src],a[href]').toArray()) {
      const attr = element.name === 'img' ? 'src' : 'href'; const raw = $(element).attr(attr); const assetUrl = normalizeUrl(raw, url);
      if (assetUrl && /\.(?:jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|zip|rar|7z)$/i.test(assetUrl.pathname)) $(element).attr(attr, await saveAsset(assetUrl.href, slug));
    }
  }
  body.find('a[href]').each((_, el) => { const linked = normalizeUrl($(el).attr('href'), url); if (linked) $(el).attr('href', linked.href); });
  body.find('img[src]').each((_, el) => { const linked = normalizeUrl($(el).attr('src'), url); if (linked && !$(el).attr('src')?.startsWith('/legacy-assets/')) $(el).attr('src', linked.href); });
  let markdown = turndown.turndown(body.html() || '');
  markdown = markdown.replace(new RegExp(`^#*\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'), '').trim();
  const summary = cleanText(allText.replace(title, '')).slice(0, 180) || '旧站迁移内容，待人工复核摘要。';
  const content = `---\ntitle: ${yaml(title)}\ndate: ${yaml(published)}\ncategory: ${yaml(category)}\nsummary: ${yaml(summary)}\nfeatured: false\nsourceUrl: ${yaml(url.href)}\nlegacyId: ${yaml(slug.replace('legacy-', ''))}\n---\n\n${markdown}\n`;
  await fs.writeFile(path.join(outputDir, `${slug}.mdoc`), content, 'utf8');
  articles.push({ slug, title, date: published, category, sourceUrl: url.href, contentLength: markdown.length });
}

while (queue.length && visited.size < limit) {
  const current = queue.shift(); if (visited.has(current)) continue; visited.add(current);
  try {
    const response = await fetch(current, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const finalUrl = normalizeUrl(response.url, current); const buffer = Buffer.from(await response.arrayBuffer());
    const html = decodeHtml(buffer, response.headers.get('content-type') || ''); const $ = cheerio.load(html);
    const title = cleanText($('title').text()); pages.push({ url: finalUrl.href, title, status: response.status });
    $('a[href]').each((_, link) => { const found = normalizeUrl($(link).attr('href'), finalUrl); if (found && shouldCrawl(found) && !visited.has(found.href) && !queue.includes(found.href)) queue.push(found.href); });
    if (/NewsView\.asp/i.test(finalUrl.pathname) || /(?:^|[?&])(?:id|newsid)=\d+/i.test(finalUrl.href)) await migrateArticle(finalUrl, html, $);
    process.stdout.write(`\r已扫描 ${visited.size} 页，发现 ${articles.length} 篇内容，队列 ${queue.length}`);
  } catch (error) { errors.push({ url: current, error: error.message }); }
}

const manifest = { generatedAt: new Date().toISOString(), startUrl: startUrl.href, limit, downloadAssets, scanned: pages.length, migrated: articles.length, pending: queue.length, pages, articles, errors };
await fs.writeFile(path.join(migrationDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
await fs.writeFile(path.join(migrationDir, 'report.md'), `# 旧站迁移报告\n\n- 扫描页面：${pages.length}\n- 已生成内容：${articles.length}\n- 待扫描队列：${queue.length}\n- 错误：${errors.length}\n- 资源本地化：${downloadAssets ? '已启用' : '未启用'}\n\n> 自动迁移保留原始链接，发布前仍需对标题、日期、正文边界和附件逐条抽检。\n`, 'utf8');
console.log(`\n完成：${articles.length} 篇内容已写入 ${path.relative(root, outputDir)}。`);
