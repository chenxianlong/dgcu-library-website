import { collection, config, fields } from '@keystatic/core';

const githubRepo = import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO as `${string}/${string}` | undefined;

export default config({
  storage: githubRepo ? { kind: 'github', repo: githubRepo } : { kind: 'local' },
  ui: {
    brand: { name: '东莞城市学院图书馆内容后台' },
    navigation: {
      内容管理: ['articles'],
      资源管理: ['resources'],
    },
  },
  collections: {
    articles: collection({
      label: '新闻与公告',
      slugField: 'title',
      path: 'src/content/articles/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: '标题' } }),
        date: fields.date({ label: '发布日期', validation: { isRequired: true } }),
        category: fields.select({
          label: '栏目',
          options: [
            { label: '通知公告', value: '通知公告' },
            { label: '新闻动态', value: '新闻动态' },
            { label: '活动预告', value: '活动预告' },
            { label: '获奖通知', value: '获奖通知' },
          ],
          defaultValue: '通知公告',
        }),
        summary: fields.text({ label: '摘要', multiline: true, validation: { isRequired: true } }),
        cover: fields.text({ label: '封面图片路径', description: '例如 /images/news-campus.jpg' }),
        featured: fields.checkbox({ label: '首页推荐', defaultValue: false }),
        sourceUrl: fields.url({ label: '原始页面地址' }),
        legacyId: fields.text({ label: '旧站内容 ID' }),
        content: fields.markdoc({ label: '正文', options: { image: { directory: 'public/uploads/articles', publicPath: '/uploads/articles/' } } }),
      },
    }),
    resources: collection({
      label: '数据库与电子资源',
      slugField: 'name',
      path: 'src/content/resources/*',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: '资源名称' } }),
        description: fields.text({ label: '资源说明', multiline: true, validation: { isRequired: true } }),
        url: fields.url({ label: '访问地址', validation: { isRequired: true } }),
        category: fields.select({
          label: '资源分类',
          options: ['中文数据库', '外文数据库', '电子图书', '考试学习', '开放资源', '试用资源'].map((value) => ({ label: value, value })),
          defaultValue: '中文数据库',
        }),
        access: fields.select({
          label: '访问方式',
          options: ['校内', 'VPN', '公开'].map((value) => ({ label: value, value })),
          defaultValue: '校内',
        }),
        featured: fields.checkbox({ label: '首页常用资源', defaultValue: false }),
      },
    }),
  },
});
