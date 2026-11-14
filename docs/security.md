# 安全说明

> 一句话总结：**暗号保护的是界面，敏感数据保护靠服务端代理。** 12 张业务表由浏览器 `forus_app` JWT 直连本地 PostgREST；「给未来的信」与小猫对话已收口到服务端 `forus_service`。

## 认证机制

### 暗号校验

`POST /api/unlock`（`server/api/unlock.post.ts`）：

1. 读取请求体 `passphrase`；
2. 与运行时配置 `NUXT_PASSPHRASE` 比较；
3. 成功则签发 Cookie，失败返回 401（不区分「未传」与「错误」，避免信息泄露）。

暗号只存在于服务端，前端 JS 永远拿不到明文。

### 签名 Cookie

`server/utils/token.ts`：

- 格式：`<base64url(timestamp)>.<base64url(HMAC-SHA256(payload, NUXT_AUTH_SECRET))>`；
- Cookie 名：`forus_token`；
- 属性：`HttpOnly`、`SameSite=Lax`、`path=/`、生产环境 `Secure`、`maxAge = 180 天`；
- 校验时验证签名与签发时间，超过 180 天失效。

### 路由守卫

`middleware/unlocked.ts`：

- `/` 直接放行（封面所在页）；
- 其他页面在 SSR 和客户端都调用 `GET /api/status`，未解锁则 `navigateTo('/')`；
- SSR 使用 `useRequestFetch()` 转发当前请求的 Cookie。

因此未解锁者**拿不到内页的 SSR HTML**（会被 302 回首页）。但首页 HTML 始终可访问，且前端 JS 会加载。

### 身份不是权限

`forus_identity`（`localStorage`）只是「这台设备是谁」的 UI 偏好。删除或伪造它不会获得任何额外权限——因为数据层本来就没有按身份鉴权。

## 威胁模型

| 场景 | 实际结果 |
|------|----------|
| 只知道网址的陌生人 | 看到封面和问候语；输入暗号失败。首页 HTML/JS 可下载，但未解锁时不会挂载数据组件。 |
| 抓到浏览器 `forus_app` JWT 的技术型攻击者 | **可绕过暗号**，直接读写 12 张业务表（留言、照片、备忘录、目标、喜好等）。**无法读取 `letters` 与 `cat_messages`**（只授予 `forus_service`）。 |
| 拿到已解锁的设备浏览器 | Cookie 有效期 180 天，可直接进入；身份偏好也在 localStorage。 |
| 拿到 `NUXT_AUTH_SECRET` | 可自行签发合法 `forus_token`。 |
| 拿到 `SUPABASE_SERVICE_ROLE_KEY`（`forus_service` JWT） | 可绕过 RLS 访问全部数据，危害等同于数据库管理员。 |
| 拿到服务端环境变量 | 同上，并且可盗用小猫 AI 的 API Key。 |
| 拿到 `NUXT_PASSPHRASE` | 可正常解锁，但不影响已有设备。 |

## 已知弱点与风险

| 等级 | 问题 | 位置 |
|:----:|------|------|
| 🔴 高 | 生产环境未配置变量时会回退到默认暗号 `622` 和默认签名密钥。按用户要求本批次**跳过**该项，仍建议尽快处理。 | `nuxt.config.ts:9-10` |
| 🟠 中 | 除 `letters` / `cat_messages` 外，其余 12 张表由浏览器 `forus_app` JWT 直连 PostgREST；JWT 公开在页面里。 | `composables/useDb.ts` / PostgREST 角色 |
| 🟠 中 | `/uploads` 为公开读，图片/视频可直接访问；上传接口有扩展名与大小限制，但仍可被滥用占用空间。 | `server/api/upload.post.ts` / nginx |
| 🟡 低 | Cookie 不携带暗号版本；**修改 `NUXT_PASSPHRASE` 不会踢掉已解锁设备**，必须轮换 `NUXT_AUTH_SECRET`。 | `token.ts` / `unlock.post.ts` |
| 🟡 低 | 日历备注用 `v-html` + `marked` 渲染，没有净化。当前只有两个人写内容，风险可接受；若数据库被篡改可造成存储型 XSS。 | `pages/calendar.vue` |
| 🟡 低 | 小猫接口把用户消息发送给第三方 AI 服务商，存在隐私外泄面。 | `server/api/cat.post.ts` |
| 🟡 低 | 解锁限流的键来自 `X-Forwarded-For`；如果 Nitro 直接暴露、没有可信反向代理覆盖该头，攻击者可伪造 IP 绕过限流。 | `server/api/unlock.post.ts` |
| 🟡 低 | 天气功能把访问者 IP 发给 `ipapi.co`；已增加 30 分钟缓存，减少调用频率。 | `composables/useWeather.ts` |
| ⚪ 信息 | `/api/health` 公开返回部署 commit（以及可选的 version）与服务器时间，用于更新校验；不包含任何业务数据。 | `server/api/health.get.ts` |
| ⚪ 信息 | 未配置 CSP / 安全响应头；`noindex, nofollow` 已生效。 | `nuxt.config.ts` |

已处理：

- ✅ `/api/unlock` 按 IP 限流（15 分钟 5 次失败，封锁 15 分钟）。
- ✅ 暗号与签名比较改为恒定时间比较。
- ✅ 信件改为服务端接口，未到期收件信不下发正文。
- ✅ 小猫对话改为服务端持久化，客户端无法注入历史 role。
- ✅ 上传/删除改为本地文件 + 服务端接口；上传有扩展名白名单与大小限制。

## 部署前加固清单

- [ ] `.env` 中实际设置 `NUXT_PASSPHRASE`，不要使用 `622` 或任何仓库中出现过的字符串。
- [ ] `NUXT_AUTH_SECRET` 使用至少 32 字节随机值：
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] 设置 `SUPABASE_SERVICE_ROLE_KEY`（本地 `forus_service` JWT），且**只配置在服务端环境变量**，不要加 `NUXT_PUBLIC_` 前缀。
- [ ] 部署平台使用 HTTPS（否则 `Secure` Cookie 不会写入，无法解锁）。
- [ ] 应用内已有按实例的解锁限流；仍建议在反向代理 / 平台层再加全局限流。
- [ ] 不要把 `.env`、`.pg-jwt.env`、`PGRST_JWT_SECRET`、服务端日志提交到 Git。
- [ ] 定期检查 Postgres / PostgREST / nginx 日志，确认没有异常的大量读写。
- [ ] 设备丢失或怀疑泄露时，轮换 `NUXT_AUTH_SECRET` 并重新部署，使所有旧 Cookie 失效；如怀疑 service JWT 泄露，轮换 `PGRST_JWT_SECRET` 并重新签发两把 JWT。

## 如果要「真正锁死」数据

当前已完成：

- `letters` / `cat_messages` 服务端代理，`forus_app` 不可读；
- 上传/删除本地化，删除与改写走服务端。

仍可继续：

1. **其余表全部服务端代理**：读写改走 Nitro + `forus_service`，关闭浏览器直连，安全性最高；需要把轮询改成 SSE 或继续轮询。
2. **上传目录私有化**：nginx 加鉴权或改由 Nitro 校验 Cookie 后流式返回；需要把数据库中的 `/uploads/` 改为受保护路径。
3. **字段级加密**：在写入 `letters.content` 前用密码派生密钥加密；需解决密钥管理。

对二人私密站，当前风险等级是**有意识接受的取舍**；如果站点会暴露在公开互联网上，建议至少完成上面清单里的前四项。
