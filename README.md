# 东莞城市学院图书馆网站重构

基于 Astro 7、Astro Content Collections 与 Keystatic 的图书馆门户。前台采用第三版“服务入口型”设计，内容以 Markdoc/YAML 文件保存，可在 Git 中审阅和版本管理。

## 本地运行

```sh
npm install
npm run dev
```

- 网站首页：`http://localhost:4321/`
- 本地内容后台：`http://localhost:4321/keystatic`
- 生产构建：`npm run build`

生产环境默认关闭本地后台，避免无认证编辑入口暴露。需要线上协作编辑时，按 `DEPLOYMENT.md` 配置 Keystatic GitHub 模式。

## 内容位置

- 新闻与公告：`src/content/articles/`
- 数据库资源：`src/content/resources/`
- 旧站迁移内容：`src/content/articles/legacy/`
- 旧站图片和附件：`public/legacy-assets/`
- 迁移清单：`migration/manifest.json`
- 内容审计：`migration/content-audit.md`

## 重新执行迁移

```sh
npm run migrate:sample
npm run migrate:legacy
npm run repair:metadata
npm run audit:content
```

全量脚本会扫描旧站、按旧站文章 ID 去重，并把图片/附件下载到本地。自动迁移完成后仍应根据 `migration/report.md` 对标题、时间、附件及正文边界做抽样复核。

## 部署

项目包含 `Dockerfile`、`compose.yaml`、健康检查接口和 Nginx 示例，完整步骤见 `DEPLOYMENT.md`。
