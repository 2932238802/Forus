# Forus · 属于我们的时间 💙

记录我们的时间里程碑、照片、留言，以及之后的种种。

> 在野在野！

## 技术栈

- **Nuxt 3** + **Vue 3** + **TypeScript**
- **Tailwind CSS**（星空 / 樱花双主题，语义色跟随主题变量）
- **@vueuse/nuxt**
- **Supabase**（数据库 + Storage + Realtime，部分敏感数据走服务端代理）

## 已实现功能

- 🌙 **流星夜空封面**（`CurtainIntro` + `MeteorCanvas`）：点击进入，鼠标拖出彗星尾
- 🔑 **共用暗号门**：服务端校验，HttpOnly 签名 Cookie；导航菜单可「🔒 锁定」
- 🏠 **首页**（`/`）：宫格聚合
  - 在一起天数（`TogetherCard`，实时跳动 + 「想你了」）
  - 时间线（`TimelineCompact`）
  - 留言墙 / 聊天（`NoteWall`，文字 & 图片）
  - 图片 / 视频墙（`MediaWall`，列表 + Lightbox，图片自动压缩）
- 📝 **备忘录**（`/memo`）：分人、可评论
- 🎯 **!TARGET!**（`/goals`）：双人目标 / 心愿
- 💗 **Like And Unlike**（`/likes`）：喜欢 & 不喜欢清单（分类 + 拖拽）
- 💗 **Adore!!**（`/adore`）：对方的优点 / 很喜欢的地方
- 🩹 **需要改进的地方**（`/dislikes`）
- 💌 **给未来的信**（`/letters`）：到期才能拆；内容只经服务端读写
- 🗓️ **日历**（`/calendar`，导航隐藏）：农历 / 黄历 / 天气 / 每日 Markdown 备注
- 🌀 **又推又推**（`/push`，导航隐藏）：记录对方说反话、推开你的瞬间
- 🐱 **尚锦小猫 AI**：DeepSeek / OpenAI 兼容接口，服务端持有 Key
- 🔄 **实时同步**：留言 / 媒体 / 里程碑等通过 Supabase Realtime 多端同步
- 🎉 **庆祝彩蛋**：周年 / 农历生日 / 整百天；在野生日全站氛围

## 本地运行

```bash
npm install
cp .env.example .env   # 填入 Supabase 与暗号相关变量
npm run dev            # http://localhost:3000
```

验证命令：

```bash
npm run build       # 构建
npm run typecheck   # 类型检查
npm run test        # Vitest 单元测试
npm run lint        # ESLint
```

## 环境变量

```bash
SUPABASE_URL=...
SUPABASE_KEY=...                    # publishable / anon key
NUXT_PASSPHRASE=你的暗号              # 服务端暗号，前端不可见
NUXT_AUTH_SECRET=随机长串             # Cookie 签名密钥
SUPABASE_SERVICE_ROLE_KEY=...        # 仅服务端：信件 / 小猫 / Storage 删除
NUXT_CAT_API_BASE=https://wawapii.com/v1   # 可选
NUXT_CAT_API_KEY=sk-...              # 可选
NUXT_CAT_MODEL=deepseek-chat         # 可选
```

> 生成签名密钥：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

完整说明见 [docs/deployment.md](./docs/deployment.md)。

## 数据库初始化（Supabase）

在 Supabase 后台 → SQL Editor 按顺序执行 `supabase/` 下的脚本。**完整顺序、表结构与迁移说明见 [docs/database.md](./docs/database.md)**。

关键点：

- `letters` 与 `cat_messages` 已撤销 anon 权限，只允许服务端 service_role 访问。
- Storage `media` 仍为公开读，但匿名只能上传；删除/改写走 `/api/media/delete`。
- 所有脚本已做幂等处理，可以安全重跑。

## 如何修改内容

| 文件 | 内容 |
|------|------|
| `data/site.ts` | 网站名、你们的名字、恋爱起始日、封面问候语 |
| 各页面 / 留言墙 | 内容已落库到 Supabase，直接在网页里增删改即可 |
| `server/utils/cat-brain.ts` | 小猫人设、称呼、关键词触发规则 |

## 安全说明 🔒

- 暗号比对在 **Nitro 服务端**（`/api/unlock`）进行，前端 JS 永远拿不到明文暗号。
- 校验通过后下发 **HttpOnly 签名 Cookie**（HMAC-SHA256，180 天有效）。
- 内页在 SSR 阶段校验 Cookie，未解锁会被重定向回首页。
- 解锁接口有失败次数限流。
- 信件、小猫对话、Storage 删除使用服务端 `service_role`，anon key 无法直接读取/删除。
- 剩余风险：其他表仍为 anon 直连（为保留 Realtime）、`media` 为公开读。详见 [docs/security.md](./docs/security.md)。

## 后续规划

- [x] 服务端暗号校验 + HttpOnly 签名 Cookie
- [x] 给未来的信 / 日历 / 又推又推 / 小猫 AI
- [ ] 数据库 RLS 彻底锁死（服务端 API 代理全部表）
- [ ] 地图足迹 / 年度回顾
- [ ] PWA：添加到主屏幕

## 目录结构

```
Forus/
├─ docs/            项目文档（功能 / 架构 / 数据库 / 安全 / 部署 / 问题清单）
├─ update.sh        服务器一键更新脚本（L1–L5 校验）
├─ pages/           页面（含 /calendar、/push 隐藏页）
├─ components/      封面、导航、各内容墙、小猫、庆祝动画
├─ composables/     数据逻辑（Supabase 读写、身份、主题、媒体上传…）
├─ middleware/      路由守卫
├─ server/
│  ├─ api/          unlock / status / lock / health / cat / cat-messages / letters / media
│  └─ utils/        token / safe-compare / rate-limit / require-unlock / supabase-admin / letters / date / cat-brain
├─ data/            站点静态配置
├─ supabase/        数据库与存储 SQL
├─ utils/           日期、图片压缩、时间格式化、错误提示、Storage 路径
├─ types/           类型定义
├─ assets/css/      主题变量与全局样式
└─ public/          静态资源
```
