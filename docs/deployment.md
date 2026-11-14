# 部署与运维

## 环境变量

复制 `.env.example` 为 `.env`，或在部署平台的环境变量面板配置。

| 变量 | 必填 | 默认值 | 说明 |
|------|:----:|--------|------|
| `SUPABASE_URL` | ✅ | — | 自建 PostgREST 地址，如 `https://forus.los-theseus.site/db`（nginx 会剥掉 `/db/rest/v1`） |
| `SUPABASE_KEY` | ✅ | — | 本地签发的 `forus_app` JWT（会被打包进前端，属正常公开） |
| `NUXT_PASSPHRASE` | ✅ | `622`（代码内回退，**危险**） | 服务端共用暗号 |
| `NUXT_AUTH_SECRET` | ✅ | `forus-dev-secret-change-me`（**危险**） | Cookie 签名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 空 | **仅服务端**：`forus_service` JWT，用于信件 / 小猫。绝不能暴露到前端 |
| `NUXT_SUPABASE_INTERNAL_URL` | ❌ | 空 | 容器内直连 PostgREST，如 `http://forus-rest:3000`；不设则走公网 `/db` |
| `NUXT_UPLOADS_DIR` | ❌ | `.data/uploads` | 本地上传目录；生产容器内为 `/data/uploads`（也兼容单数 `NUXT_UPLOAD_DIR`） |
| `NUXT_CAT_API_BASE` | ❌ | `https://wawapii.com/v1` | OpenAI 兼容接口地址 |
| `NUXT_CAT_API_KEY` | ❌ | 空（不配置则小猫不可用） | 服务端私有 Key |
| `NUXT_CAT_MODEL` | ❌ | `deepseek-chat` | 模型名 |

生成签名密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> `@nuxtjs/supabase` 在构建时读取 `SUPABASE_URL` / `SUPABASE_KEY`；预构建产物在运行时可用 `NUXT_PUBLIC_SUPABASE_URL` / `NUXT_PUBLIC_SUPABASE_KEY` 覆盖。其余 `NUXT_*` 由 Nitro 映射到 `runtimeConfig`；`SUPABASE_SERVICE_ROLE_KEY` 也可在运行时用 `NUXT_SUPABASE_SERVICE_ROLE_KEY` 覆盖。
> 代码中的默认值只是本地开发兜底，**生产环境必须显式配置**，否则任何知道仓库内容的人都能解锁。

## 自建 Postgres / PostgREST 准备

1. `forus-db`（Postgres 17）保存数据；`forus-rest`（PostgREST 12）提供 REST。
2. 创建角色：`authenticator`（登录 + SET ROLE）、`forus_app`（浏览器 JWT，12 张业务表 CRUD）、`forus_service`（BYPASSRLS，全部表）、`forus_noaccess`（无权限，无 JWT 时使用）。
3. 生成一把 `PGRST_JWT_SECRET`，签发 `forus_app` / `forus_service` 两把 JWT；分别填入 `SUPABASE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`。
4. PostgREST 配置：`PGRST_DB_URI` 用 `authenticator`，`PGRST_DB_ANON_ROLE=forus_noaccess`，`PGRST_JWT_SECRET` 与签发时一致。
5. nginx：`location /db/rest/v1/` 反代到 `127.0.0.1:3001/`；`location /uploads/` 静态服务 `/opt/forus/uploads`。
6. 详细步骤、导入与回退见 [迁移方案](./archive/261114/16-Supabase迁移自建数据库-开工方案.md)。

## 部署到 Vercel

1. 将仓库导入 Vercel，Framework Preset 选择 **Nuxt**。
2. Build Command：`npm run build`；Output 由 Nuxt 自动处理。
3. 在 **Project Settings → Environment Variables** 添加上表变量（至少前 4 项）。
4. 部署完成后用自定义域名或 Vercel 域名访问；HTTPS 由平台提供，`Secure` Cookie 才能生效。
5. 首次访问：输入暗号 → 选择身份 → 检查各页面读写与实时同步。

## 自托管（Node）

```bash
npm ci
npm run build
PORT=3000 HOST=0.0.0.0 node .output/server/index.mjs
```

- 前面必须有一层 HTTPS 反向代理（Nginx / Caddy / Cloudflare），否则浏览器不会保存 `Secure` Cookie。
- 反向代理需正确传递 `Host`、`X-Forwarded-Proto`，并允许 Cookie 透传。
- 同时提供 `/db/rest/v1/`（PostgREST）与 `/uploads/`（本地文件）两个 location；`client_max_body_size` 至少 30m。
- 进程管理器可用 systemd / pm2 / Docker。

## 一键更新脚本（自托管）

仓库根目录的 `update.sh` 用于在服务器上完成一次可验证的更新：

```bash
bash update.sh            # 拉取 → 校验依赖 → 构建 → 重启 → 健康检查
bash update.sh --checks   # 构建前额外跑 typecheck / test / lint
bash update.sh --help     # 查看全部选项
```

前提：

- 项目根目录存在 `.env`，且工作区干净（脚本会拒绝未提交改动）。
- 远程为 `origin/main`，本地在 `main` 分支。
- 服务名默认为 `forus`，支持 `systemd` / `pm2` / `docker compose`；可通过 `--mode=` 或 `DEPLOY_MODE` 指定。
- 健康检查默认走 `http://127.0.0.1:${PORT}`，`PORT` 读取 `.env`，回退 `3000`。
- 部署元数据写入 `.data/deploy-info.json`（已由 `.gitignore` 忽略），`GET /api/health` 会返回其中的 `commit`；`package.json` 带 `version` 时也会返回 `version`。
  - systemd / PM2 的 `WorkingDirectory` / `cwd` 必须是项目根目录。
  - Docker 模式若未把宿主机的 `.data` 挂载进容器，health 会降级为「200 + 时间戳 + 前端指纹」校验。

脚本按 L1 代码、L2 依赖、L2.5 校验（可选）、L3 构建、L4 进程、L5 对外逐层校验；任一层失败都会立即退出，并打印日志入口、上一版 `.output` 与回滚命令。数据存放在自建 Postgres，脚本不会备份或修改数据库。

首次使用前先把脚本本身提交，否则 L1 会因工作区未提交改动而拒绝执行。

## 小猫 AI 配置

任选一个 OpenAI 兼容服务，把地址、Key、模型名写入环境变量：

```bash
NUXT_CAT_API_BASE=https://wawapii.com/v1
NUXT_CAT_API_KEY=sk-...
NUXT_CAT_MODEL=deepseek-chat
```

验证接口是否兼容：

```bash
curl -s "$NUXT_CAT_API_BASE/chat/completions" \
  -H "Authorization: Bearer $NUXT_CAT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"'"$NUXT_CAT_MODEL"'","messages":[{"role":"user","content":"喵"}]}'
```

若返回结构不是 `choices[0].message.content`，需要调整 `server/api/cat.post.ts` 的解析逻辑。
未配置 Key 时接口返回 500「小猫还没配置好」，前端显示兜底文案，不影响其他功能。

## 部署后验证清单

- [ ] 首页显示封面与问候语。
- [ ] 错误暗号被拒绝；正确暗号后能看到主界面。
- [ ] DevTools → Application → Cookies 中 `forus_token` 为 **HttpOnly**、`Secure`（生产）。
- [ ] 未解锁时直接访问 `/memo`、`/letters` 会被重定向回 `/`，且响应 HTML 不含内页内容。
- [ ] 未解锁停留在首页时，Network 中没有 `/db/rest/v1` 或 `/uploads` 的业务数据请求。
- [ ] 导航栏「🔒 锁定」后回到封面，再进需要重新输入暗号。
- [ ] 连续输入错误暗号 5 次后第 6 次返回 429；15 分钟后恢复。
- [ ] 首次解锁会要求选择身份；刷新后不再询问。
- [ ] 两套主题切换正常，按钮与状态色随主题变化。
- [ ] 各页面新增 / 编辑 / 删除正常。
- [ ] 两个浏览器（或手机 + 电脑）同时打开，留言 / 图片 / 备忘录等在 30 秒内同步。
- [ ] 上传图片后 `/uploads/<file>` 可访问，删除记录后本地文件也被清理。
- [ ] 信件：发件人可读写自己的信；收件人未到期只看到标题，到期后可读。
- [ ] 用 `forus_app` JWT 直接请求 `letters` / `cat_messages` 返回 401/403。
- [ ] `/calendar` 与 `/push` 可直接访问（导航中隐藏属预期）。
- [ ] 小猫对话能返回内容，刷新后显示最近 100 条；未配置时显示兜底提示。
- [ ] `npm run build`、`npm run typecheck`、`npm run test`、`npm run lint` 全部通过。

## 排障

| 现象 | 排查方向 |
|------|----------|
| 输入正确暗号仍无法进入 | 生产是否 HTTPS；`NUXT_PASSPHRASE` 是否有空格；反向代理是否丢弃 `Set-Cookie` |
| 第 6 次输入返回 429 | 正常限流；等待 15 分钟，或重启 Nitro 进程清空内存计数 |
| 一直 401 / 每次都要重新解锁 | `NUXT_AUTH_SECRET` 是否在多次部署间变化；Cookie 是否被代理过滤 |
| 信件 / 小猫 / 删除图片返回 500「缺少 SUPABASE_SERVICE_ROLE_KEY」 | 配置服务端 `SUPABASE_SERVICE_ROLE_KEY`（`forus_service` JWT）并重新部署 |
| 信件列表为空或 403 | 检查 `forus_service` 是否有 BYPASSRLS + 表授权；`SUPABASE_SERVICE_ROLE_KEY` 是否是本地签发的 JWT |
| 修改暗号后老设备仍能进 | 正常现象：Cookie 不绑定暗号。轮换 `NUXT_AUTH_SECRET` 才会全部失效 |
| 数据能读但另一台设备不同步 | 等待 30 秒轮询；页面隐藏时不会请求，切回前台会立即刷新 |
| 上传成功但图片打不开 | `NUXT_UPLOADS_DIR` 是否指向挂载目录；nginx `/uploads/` 的 `root` 是否正确 |
| 删除图片失败 | `utils/storage.ts` 是否识别 `/uploads/`；`/api/media/delete` 是否拿到文件名 |
| `/db/rest/v1/*` 返回 404 | nginx location 必须是 `/db/rest/v1/`（PostgREST 根是 `/`），不能只写 `/db/` |
| 无 JWT 访问 `/db` 返回 200 | PostgREST `PGRST_DB_ANON_ROLE` 应设为无权限角色 `forus_noaccess` |
| `update.sh` 提示找不到 forus 服务 | compose 服务名是 `forus-app`；脚本已兼容，确认使用最新版 update.sh |
| 小猫一直「睡着了」 | 服务端日志；`NUXT_CAT_API_KEY` / `BASE` / `MODEL` 是否正确；上游是否超时 |
| 日历天气获取失败 | `ipapi.co` 限流或浏览器定位被拒；`open-meteo.com` 是否可访问；30 分钟缓存是否命中 |
| 构建失败提示 `#app-manifest` | 已通过 `experimental.appManifest: false` 关闭；确认配置未被改回 |
| 内页 SSR 一直重定向 | Nitro `/api/status` 是否可达；反向代理是否阻止内部请求转发 Cookie |

## 日志与监控

- Nitro 侧错误大多返回给前端兜底文案；小猫接口会 `console.error` 上游与数据库错误，其他接口可按需补充日志。
- Postgres / PostgREST / nginx 日志：`docker compose logs`、`journalctl`、`/var/log/nginx/forus.*.log`。
- 数据库与上传目录已配置每日备份（04:30 / 04:40，保留 14 天），备份在 `/opt/backup/`。
- 项目没有错误上报（Sentry 等），故障主要靠人工发现。
