# 正式部署方案

## 推荐架构

学校服务器使用 Docker 运行 Astro Node standalone 服务，前置 Nginx 负责域名、HTTPS 与反向代理。网站内容保存在仓库中，发布过程可审计、可回滚。

## 两种后台模式

### 1. 本地后台 + 审核发布（默认，最稳妥）

生产构建不设置 `PUBLIC_KEYSTATIC_GITHUB_REPO`，线上不会挂载 `/keystatic`。编辑人员在内网或开发机访问本地 `/keystatic`，内容变更经过 Git 审核后重新部署。

### 2. GitHub 协作后台

设置 `.env.example` 中的 Keystatic GitHub 环境变量，并在构建参数中设置 `PUBLIC_KEYSTATIC_GITHUB_REPO=组织/仓库`。线上 `/keystatic` 将通过 GitHub App 登录，只有仓库写入权限成员可以编辑。

## Docker 部署

```sh
cp .env.example .env.production
docker compose build
docker compose up -d
curl http://127.0.0.1:4321/api/health.json
```

Nginx 示例位于 `deploy/nginx.conf.example`。配置学校域名和证书后，将流量代理至 `127.0.0.1:4321`。

## 不使用 Docker

```sh
npm ci
npm run build
HOST=0.0.0.0 PORT=4321 node dist/server/entry.mjs
```

建议使用 systemd 或 PM2 托管进程，并保留最近两个可回滚版本。

## 上线检查

- 确认学校域名、HTTPS 证书和旧站跳转规则。
- 复核 `migration/content-audit.md` 中的短正文、历史外链和第三方失效附件。
- 抽检最新通知、规章制度、开放时间、联系方式和数据库入口。
- 确认生产环境后台模式；不得直接暴露无身份认证的本地后台。
- 验证 `/api/health.json`、首页、新闻分页、文章详情、资源搜索和移动端导航。
- 建立内容仓库、附件目录及部署配置的定期备份。
