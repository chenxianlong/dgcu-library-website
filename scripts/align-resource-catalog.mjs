import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const databasePath = resolve(process.env.LIBRARY_DB_PATH || './data/library.sqlite');
const db = new DatabaseSync(databasePath);
const purchasedIds = ['cnki', 'ncpssd', 'chaoxing-digital-books', 'duxiu', 'emerald', 'met-english', 'yinfu-remote', 'yinfu-local', 'guoyan', 'youyue-foreign-books'];
const trialIds = ['trial-pkulaw', 'trial-legacy-715', 'trial-wiley-online-library', 'trial-legacy-738', 'trial-legacy-740', 'trial-legacy-672', 'trial-zhiyuebook', 'trial-legacy-677'];
const includedIds = [...purchasedIds, ...trialIds];
const retiredSourceIds = new Set(['cnki-ai', 'domestic-newspapers', 'national-library', 'vpn-external-access', 'zsyyb', 'zszwx']);
const now = new Date().toISOString();

db.exec('BEGIN IMMEDIATE');
try {
  const archive = db.prepare(`UPDATE resources SET status = 'draft', updated_at = ? WHERE id = ?`);
  for (const row of db.prepare('SELECT id FROM resources').all()) {
    if (row.id.startsWith('trial-legacy-') && !trialIds.includes(row.id) || retiredSourceIds.has(row.id)) archive.run(now, row.id);
  }
  const restore = db.prepare(`UPDATE resources SET status = 'published', updated_at = ? WHERE id = ?`);
  for (const id of includedIds) restore.run(now, id);
  const update = db.prepare('UPDATE resources SET name = ?, description = ?, updated_at = ? WHERE id = ?');
  const updateTrial = db.prepare('UPDATE resources SET name = ?, description = ?, url = ?, access = ?, updated_at = ? WHERE id = ?');
  update.run('读秀全文检索', '提供图书及相关学术文献的检索和全文获取服务。', now, 'duxiu');
  updateTrial.run('北大法宝', '提供法律法规、司法案例、法学期刊及法律实务资料的专业检索服务。', 'https://www.pkulaw.com/', '校内', now, 'trial-pkulaw');
  updateTrial.run('燕递文献服务系统', '整合海外电子书、期刊、预印本等外文资源，提供文献检索与传递服务。', 'https://www.yandilib.com/', '公开', now, 'trial-legacy-715');
  updateTrial.run('Wiley在线期刊数据库', '提供 Wiley 出版的多学科在线学术期刊检索与阅读服务。', 'https://onlinelibrary.wiley.com/', '校内', now, 'trial-wiley-online-library');
  updateTrial.run('设计师之家', '提供艺术设计教程、电子图书、期刊、设计素材和数字展馆等资源。', 'https://www.51sjsj.com/', 'VPN', now, 'trial-legacy-738');
  updateTrial.run('阅途美育在线', '提供美育课程、艺术鉴赏、美育图书和数字展馆等资源。', 'https://www.myu100.com/', 'VPN', now, 'trial-legacy-740');
  update.run('中国知网 CNKI AI', 'CNKI AI 新一代生成式知识服务平台，提供文献检索、辅助研读、成果创作和知识管理功能。', now, 'trial-legacy-672');
  update.run('人民邮电出版社电子书平台', '提供计算机、电子信息、工学、经管、人文社科和艺术传媒等领域的专业电子书，试用权限以平台当前提示为准。', now, 'trial-legacy-677');
  db.exec('COMMIT');
  console.log(`Resource catalog aligned: ${purchasedIds.length} purchased, ${trialIds.length} trial.`);
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
