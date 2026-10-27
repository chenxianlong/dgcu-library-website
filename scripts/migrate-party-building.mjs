import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import iconv from 'iconv-lite';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const root = process.cwd();
const inspectOnly = process.argv.includes('--inspect');
const normalizeExisting = process.argv.includes('--normalize-existing');
const listUrls = [
  'http://ls.dgcu.edu.cn/webfile/NewsList.asp?SortID=177&SortPath=0,177,',
  'http://ls.dgcu.edu.cn/webfile/NewsList.asp?SortID=177&page=2&SortPath=0,177,',
];
const outputDir = path.join(root, 'src', 'content', 'articles', 'party-building');
const assetRoot = path.join(root, 'public', 'party-assets');
const manifestPath = path.join(root, 'migration', 'party-building.json');
const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

function decodeHtml(buffer, contentType = '') {
  const probe = buffer.subarray(0, 4096).toString('latin1');
  const declared = `${contentType} ${probe}`.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]?.toLowerCase();
  const charset = declared && iconv.encodingExists(declared) ? declared : 'gb18030';
  return iconv.decode(buffer, charset);
}

async function fetchHtml(url) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return { html: decodeHtml(buffer, response.headers.get('content-type') || ''), finalUrl: response.url };
}

function cleanText(value = '') {
  return value.replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeDate(value = '') {
  const match = value.match(/(20\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : '';
}

function articleId(url) {
  for (const key of ['ID', 'id', 'NewsID', 'newsid']) {
    const value = url.searchParams.get(key);
    if (value && /^\d+$/.test(value)) return value;
  }
  return crypto.createHash('sha1').update(url.href).digest('hex').slice(0, 10);
}

function isArticleLink(url) {
  const name = path.basename(url.pathname).toLowerCase();
  return /news(?:view|show|detail)|shownews|newscontent/.test(name)
    || [...url.searchParams.keys()].some((key) => /^(?:id|newsid)$/i.test(key));
}

function yaml(value = '') {
  return JSON.stringify(cleanText(value));
}

if (normalizeExisting) {
  const files = (await fs.readdir(outputDir)).filter((name) => name.endsWith('.mdoc'));
  for (const name of files) {
    const file = path.join(outputDir, name);
    const content = await fs.readFile(file, 'utf8');
    let updated = content.replace(/^summary:\s*("(?:\\.|[^"\\])*")$/m, (_, encoded) => {
      const normalized = JSON.parse(encoded).replace(/\s+/g, ' ').trim();
      return `summary: ${JSON.stringify(normalized)}`;
    });
    if (!/^id:/m.test(updated)) updated = updated.replace(/^---\r?\n/, `---\nid: ${JSON.stringify(name.replace(/\.mdoc$/, ''))}\n`);
    await fs.writeFile(file, updated, 'utf8');
  }
  console.log(`Normalized ${files.length} existing party-building summaries.`);
  process.exit(0);
}

function pickArticle($) {
  for (const selector of ['.newsshow .ttt', '.newsabout .con', '.newsabout', '#content', '.news-content', '.article-content', '.content', '.nr']) {
    const candidate = $(selector).first();
    if (cleanText(candidate.text()).length > 60) return candidate;
  }
  const candidates = ['td', 'main', 'section', 'div']
    .flatMap((selector) => $(selector).toArray())
    .filter((node) => cleanText($(node).text()).length > 120)
    .sort((a, b) => cleanText($(b).text()).length - cleanText($(a).text()).length);
  return candidates[0] ? $(candidates[0]) : $('body');
}

async function saveAsset(rawUrl, baseUrl, slug) {
  const url = new URL(rawUrl, baseUrl);
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`asset ${url.href} returned HTTP ${response.status}`);
  const ext = path.extname(new URL(response.url).pathname).toLowerCase().slice(0, 10) || '.bin';
  const filename = `${crypto.createHash('sha1').update(url.href).digest('hex').slice(0, 12)}${ext}`;
  const destinationDir = path.join(assetRoot, slug);
  await fs.mkdir(destinationDir, { recursive: true });
  await fs.writeFile(path.join(destinationDir, filename), Buffer.from(await response.arrayBuffer()));
  return `/party-assets/${slug}/${filename}`;
}

const discovered = new Map();
for (const [pageIndex, listUrl] of listUrls.entries()) {
  const { html, finalUrl } = await fetchHtml(listUrl);
  const $ = cheerio.load(html);
  $('a[href]').each((_, element) => {
    const rawHref = $(element).attr('href');
    if (!rawHref) return;
    let url;
    try { url = new URL(rawHref, finalUrl); } catch { return; }
    if (url.hostname !== new URL(finalUrl).hostname || url.searchParams.get('SortID') !== '177' || !isArticleLink(url)) return;
    const title = cleanText($(element).attr('title') || $(element).text());
    if (title.length < 4) return;
    const surroundingText = cleanText($(element).closest('li,tr,p,div').first().text());
    const id = articleId(url);
    if (!discovered.has(id)) discovered.set(id, { id, title, date: normalizeDate(surroundingText), url: url.href, page: pageIndex + 1 });
  });
}

const sourceItems = [...discovered.values()];
if (inspectOnly) {
  console.log(JSON.stringify(sourceItems, null, 2));
  process.exit(0);
}

for (const generatedDir of [outputDir, assetRoot]) {
  const resolved = path.resolve(generatedDir);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error(`Unsafe generated directory: ${resolved}`);
  await fs.rm(resolved, { recursive: true, force: true });
}

await Promise.all([
  fs.mkdir(outputDir, { recursive: true }),
  fs.mkdir(assetRoot, { recursive: true }),
  fs.mkdir(path.dirname(manifestPath), { recursive: true }),
]);

const migrated = [];
const errors = [];
for (const [index, item] of sourceItems.entries()) {
  try {
    const { html, finalUrl } = await fetchHtml(item.url);
    const $ = cheerio.load(html);
    const body = pickArticle($).clone();
    body.find('script,style,nav,form,input,button,iframe').remove();
    const detailTitle = cleanText($('.newsshow .t,.newsabout h1,h1').first().text());
    const title = detailTitle.length > 4 ? detailTitle : item.title;
    const bodyText = cleanText(body.text());
    const metadata = cleanText($('.newsshow .tt,.newsabout h2,.newsabout .time,.date,.news-date').first().text());
    const date = item.date || normalizeDate(metadata) || normalizeDate(bodyText);
    if (!date) throw new Error('publication date not found');
    const slug = `party-${item.id}`;

    for (const element of body.find('img[src],a[href]').toArray()) {
      const attribute = element.name === 'img' ? 'src' : 'href';
      const raw = $(element).attr(attribute);
      if (!raw || /^(?:data:|javascript:|mailto:|tel:|#)/i.test(raw)) continue;
      let assetUrl;
      try { assetUrl = new URL(raw, finalUrl); } catch { continue; }
      if (!/\.(?:jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|zip|rar|7z)$/i.test(assetUrl.pathname)) continue;
      try { $(element).attr(attribute, await saveAsset(raw, finalUrl, slug)); }
      catch (error) { errors.push({ type: 'asset', article: slug, url: assetUrl.href, error: error.message }); }
    }

    body.find('a[href]').each((_, element) => {
      const raw = $(element).attr('href');
      if (!raw || raw.startsWith('/party-assets/')) return;
      try { $(element).attr('href', new URL(raw, finalUrl).href); } catch { /* keep original */ }
    });
    body.find('img[src]').each((_, element) => {
      const raw = $(element).attr('src');
      if (!raw || raw.startsWith('/party-assets/')) return;
      try { $(element).attr('src', new URL(raw, finalUrl).href); } catch { /* keep original */ }
    });

    body.find('h1,h2').filter((_, element) => cleanText($(element).text()) === title).remove();
    let markdown = turndown.turndown(body.html() || '').trim();
    if (!markdown) throw new Error('article body is empty');
    const summary = cleanText(bodyText.replace(title, '')).replace(/\s+/g, ' ').slice(0, 180) || `${title}。`;
    const content = `---\nid: ${yaml(slug)}\ntitle: ${yaml(title)}\ndate: ${yaml(date)}\ncategory: "党建工作"\nsummary: ${yaml(summary)}\nfeatured: false\nsourceUrl: ${yaml(finalUrl)}\nlegacyId: ${yaml(`party-${item.id}`)}\n---\n\n${markdown}\n`;
    await fs.writeFile(path.join(outputDir, `${slug}.mdoc`), content, 'utf8');
    migrated.push({ ...item, slug, title, date, sourceUrl: finalUrl, contentLength: markdown.length });
    console.log(`[${index + 1}/${sourceItems.length}] ${date} ${title}`);
  } catch (error) {
    errors.push({ type: 'article', ...item, error: error.message });
  }
}

migrated.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'));
await fs.writeFile(manifestPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  listUrls,
  discovered: sourceItems.length,
  migrated: migrated.length,
  articles: migrated,
  errors,
}, null, 2), 'utf8');

console.log(`Migration complete: ${migrated.length}/${sourceItems.length} articles, ${errors.length} errors.`);
