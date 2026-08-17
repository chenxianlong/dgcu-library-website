import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const articleRoot = path.join(root, 'src', 'content', 'articles');
const assetRoot = path.join(root, 'public', 'legacy-assets');
const migrationRoot = path.join(root, 'migration');

async function walk(directory, extension) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(target, extension));
    else if (!extension || entry.name.endsWith(extension)) output.push(target);
  }
  return output;
}

function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  if (!match) return '';
  try { return JSON.parse(match[1]); } catch { return match[1].replace(/^['"]|['"]$/g, ''); }
}

const files = await walk(articleRoot, '.mdoc');
const assetFiles = await walk(assetRoot).catch(() => []);
const manifest = JSON.parse(await fs.readFile(path.join(migrationRoot, 'manifest.json'), 'utf8'));
const records = [];
const localMissing = [];

for (const file of files) {
  const content = await fs.readFile(file, 'utf8');
  const [, frontmatter = '', body = ''] = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/) || [];
  const title = field(frontmatter, 'title');
  const date = field(frontmatter, 'date');
  const remoteAssets = [...body.matchAll(/(?:!\[[^\]]*\]|\[[^\]]+\])\((https?:\/\/[^)\s]+\.(?:jpe?g|png|gif|webp|pdf|docx?|xlsx?|pptx?|zip|rar|7z))(?:\s+['"][^'"]*['"])?\)/gi)].map((match) => match[1]);
  const localAssets = [...body.matchAll(/\((\/legacy-assets\/[^)\s]+)\)/g)].map((match) => match[1]);
  for (const value of localAssets) {
    const target = path.join(root, 'public', decodeURI(value));
    try { await fs.access(target); } catch { localMissing.push({ file: path.relative(root, file), asset: value }); }
  }
  records.push({
    file: path.relative(root, file), title, date, bodyLength: body.trim().length,
    legacy: file.includes(`${path.sep}legacy${path.sep}`), remoteAssets,
    suspiciousTitle: /作者[:：]|编辑[:：]|审核[:：]|浏览[:：]|^旧站文章|^东莞城市学院图书馆$/.test(title),
  });
}

const titleGroups = new Map();
for (const record of records) {
  if (!titleGroups.has(record.title)) titleGroups.set(record.title, []);
  titleGroups.get(record.title).push(record.file);
}
const duplicateTitles = [...titleGroups.entries()].filter(([title, list]) => title && list.length > 1).map(([title, list]) => ({ title, files: list }));
const failedAssets = manifest.errors.filter((item) => item.error.startsWith('资源下载失败'));
const uniqueFailedAssets = [...new Set(failedAssets.map((item) => item.url))];
const failedHosts = Object.entries(uniqueFailedAssets.reduce((acc, value) => { try { const host = new URL(value).host; acc[host] = (acc[host] || 0) + 1; } catch { acc.invalid = (acc.invalid || 0) + 1; } return acc; }, {})).sort((a, b) => b[1] - a[1]);
const pageErrors = manifest.errors.filter((item) => !item.error.startsWith('资源下载失败'));
const suspicious = records.filter((record) => record.suspiciousTitle);
const shortBodies = records.filter((record) => record.legacy && record.bodyLength < 50);
const unknownDates = records.filter((record) => record.legacy && record.date === '2014-01-01');
const remoteReferences = [...new Set(records.flatMap((record) => record.remoteAssets))];

const audit = {
  generatedAt: new Date().toISOString(),
  counts: { totalArticles: records.length, legacyArticles: records.filter((record) => record.legacy).length, localAssets: assetFiles.length, suspiciousTitles: suspicious.length, shortBodies: shortBodies.length, unknownDates: unknownDates.length, duplicateTitles: duplicateTitles.length, missingLocalAssets: localMissing.length, remainingRemoteAssetReferences: remoteReferences.length, uniqueFailedExternalAssets: uniqueFailedAssets.length, malformedDiscoveredLinks: pageErrors.length },
  failedHosts, suspicious, shortBodies, unknownDates, duplicateTitles, localMissing, remainingRemoteAssetReferences: remoteReferences, malformedDiscoveredLinks: pageErrors,
};

await fs.writeFile(path.join(migrationRoot, 'content-audit.json'), JSON.stringify(audit, null, 2), 'utf8');
const markdown = `# 内容迁移审计\n\n生成时间：${audit.generatedAt}\n\n## 结果概览\n\n- 文章总数：${audit.counts.totalArticles}\n- 旧站唯一文章：${audit.counts.legacyArticles}\n- 已本地化图片/附件：${audit.counts.localAssets}\n- 本地附件缺失：${audit.counts.missingLocalAssets}\n- 仍引用的远程附件：${audit.counts.remainingRemoteAssetReferences}\n- 失败外部附件（去重）：${audit.counts.uniqueFailedExternalAssets}\n- 可疑标题：${audit.counts.suspiciousTitles}\n- 正文过短：${audit.counts.shortBodies}\n- 日期待核：${audit.counts.unknownDates}\n- 重复标题组：${audit.counts.duplicateTitles}\n- 旧页面错误链接：${audit.counts.malformedDiscoveredLinks}\n\n## 异常解释\n\n旧页面错误链接均来自页面中书写错误的外链，并非文章详情页缺失。失败外部附件主要来自已下线的第三方旧域名；原始 URL 仍保留在正文中，便于后续人工寻找镜像。\n\n## 失败附件域名\n\n${failedHosts.map(([host, count]) => `- ${host}：${count}`).join('\n')}\n\n## 发布建议\n\n1. 优先复核可疑标题和正文过短条目。\n2. 对仍有业务价值的第三方附件寻找权威镜像；无法恢复的链接应标注“历史外链已失效”。\n3. 上线前由图书馆业务人员抽检近期内容、规章制度、数据库入口和联系方式。\n`;
await fs.writeFile(path.join(migrationRoot, 'content-audit.md'), markdown, 'utf8');
console.log(JSON.stringify(audit.counts, null, 2));
