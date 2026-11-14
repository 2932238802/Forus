# 部署与运维

## 环境变量

复制 `.env.example` 为 `.env`，或在部署平台的环境变量面板配置。

| 变量 | 必填 | 默认值 | 说明 |
|------|:----:|--------|------|
| `SUPABASE_URL` | ✅ | — | Supabase 项目地址，如 `https://xxxx.supabase.co` |
| `SUPABASE_KEY` | ✅ | — | Supabase publishable / anon key（会被打包进前端，属正常公开） |
| `NUXT_PASSPHRASE` | ✅ | `622`（代码内回退，**危险**） | 服务端共用暗号 |
| `NUXT_AUTH_SECRET` | ✅ | `forus-dev-secret-change-me`（**危险**） | Cookie 签名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 空 | **仅服务端**：信件 / 小猫 / Storage 删除。绝不能暴露到前端 |
| `NUXT_CAT_API_BASE` | ❌ | `https://wawapii.com/v1` | OpenAI 兼容接口地址 |
| `NUXT_CAT_API_KEY` | ❌ | 空（不配置则小猫不可用） | 服务端私有 Key |
| `NUXT_CAT_MODEL` | ❌ | `deepseek-chat` | 模型名 |

生成签名密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> `@nuxtjs/supabase` 会在构建时读取 `SUPABASE_URL` / `SUPABASE_KEY`；预构建产物在运行时可用 `NUXT_PUBLIC_SUPABASE_URL` / `NUXT_PUBLIC_SUPABASE_KEY` 覆盖。其余 `NUXT_*` 由 Nitro 映射到 `runtimeConfig`；`SUPABASE_SERVICE_ROLE_KEY` 也可在运行时用 `NUXT_SUPABASE_SERVICE_ROLE_KEY` 覆盖。
> 代码中的默认值只是本地开发兜底，**生产环境必须显式配置**，否则任何知道仓库内容的人都能解锁。

## Supabase 准备

1. 新建项目，记录 `Project URL`、`anon public key` 与 **`service_role` key**。
2. 打开 **SQL Editor**，按 [database.md](./database.md) 的顺序执行脚本。
3. 确认 **Database → Replication** 中相关表已加入 `supabase_realtime` publication（脚本会执行 `alter publication`，但需要项目本身启用 Realtime）。
4. 确认 **Storage** 中存在 public 桶 `media`（由 `storage.sql` 创建）。
5. 确认 `letters` 与 `cat_messages` 只允许服务端访问（执行升级脚本后生效）。
6. 可选：在 **Authentication → Providers** 中无需开启任何登录方式，本项目不使用 Supabase Auth。

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

脚本按 L1 代码、L2 依赖、L2.5 校验（可选）、L3 构建、L4 进程、L5 对外逐层校验；任一层失败都会立即退出，并打印日志入口、上一版 `.output` 与回滚命令。数据存放在 Supabase，脚本不会备份或修改云端数据。

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
- [ ] 未解锁停留在首页时，Network 中没有 Supabase REST/Realtime 请求。
- [ ] 导航栏「🔒 锁定」后回到封面，再进需要重新输入暗号。
- [ ] 连续输入错误暗号 5 次后第 6 次返回 429；15 分钟后恢复。
- [ ] 首次解锁会要求选择身份；刷新后不再询问。
- [ ] 两套主题切换正常，按钮与状态色随主题变化。
- [ ] 各页面新增 / 编辑 / 删除正常。
- [ ] 两个浏览器（或手机 + 电脑）同时打开，留言 / 图片 / 备忘录等能实时同步。
- [ ] 上传图片后公链可访问，删除记录后 Storage 文件也被清理。
- [ ] 信件：发件人可读写自己的信；收件人未到期只看到标题，到期后可读。
- [ ] 用 anon key 直接请求 `letters` / `cat_messages` 被拒绝。
- [ ] `/calendar` 与 `/push` 可直接访问（导航中隐藏属预期）。
- [ ] 小猫对话能返回内容，刷新后显示最近 100 条；未配置时显示兜底提示。
- [ ] `npm run build`、`npm run typecheck`、`npm run test`、`npm run lint` 全部通过。

## 排障

| 现象 | 排查方向 |
|------|----------|
| 输入正确暗号仍无法进入 | 生产是否 HTTPS；`NUXT_PASSPHRASE` 是否有空格；反向代理是否丢弃 `Set-Cookie` |
| 第 6 次输入返回 429 | 正常限流；等待 15 分钟，或重启 Nitro 进程清空内存计数 |
| 一直 401 / 每次都要重新解锁 | `NUXT_AUTH_SECRET` 是否在多次部署间变化；Cookie 是否被代理过滤 |
| 信件 / 小猫 / 删除图片返回 500「缺少 SUPABASE_SERVICE_ROLE_KEY」 | 配置服务端 `SUPABASE_SERVICE_ROLE_KEY` 并重新部署 |
| 信件列表为空或 403 | 检查 `letters` 的 anon 策略是否已撤销、service key 是否有效、身份是否为 `you`/`npy` |
| 修改暗号后老设备仍能进 | 正常现象：Cookie 不绑定暗号。轮换 `NUXT_AUTH_SECRET` 才会全部失效 |
| 数据能读但实时不同步 | 表是否加入 publication；Supabase Realtime 是否启用；RLS 是否允许 select |
| 上传成功但图片打不开 | `media` 桶是否 public；`public read media` 策略是否存在 |
| 删除图片失败 | 确认 `SUPABASE_SERVICE_ROLE_KEY` 已配置，且 Storage 的 anon delete 策略已移除 |
| 小猫一直「睡着了」 | 服务端日志；`NUXT_CAT_API_KEY` / `BASE` / `MODEL` 是否正确；上游是否超时 |
| 日历天气获取失败 | `ipapi.co` 限流或浏览器定位被拒；`open-meteo.com` 是否可访问；30 分钟缓存是否命中 |
| 构建失败提示 `#app-manifest` | 已通过 `experimental.appManifest: false` 关闭；确认配置未被改回 |
| 内页 SSR 一直重定向 | Nitro `/api/status` 是否可达；反向代理是否阻止内部请求转发 Cookie |

## 日志与监控

- Nitro 侧错误大多返回给前端兜底文案；小猫接口会 `console.error` 上游与数据库错误，其他接口可按需补充日志。
- Supabase 控制台可查看 API 日志、慢查询和 Storage 使用量。
- 项目没有错误上报（Sentry 等），故障主要靠人工发现。
