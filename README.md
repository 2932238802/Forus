# Forus · 属于我们的时间 💙

记录我们的时间里程碑、照片、留言，以及之后的种种。

> 在野在野！

## 技术栈

- **Nuxt 3** + **Vue 3** + **TypeScript**
- **Tailwind CSS**（晴空·薄荷配色：蓝 / 白 / 青）
- **@vueuse/motion**（滚动动效）
- **Supabase**（数据库 + Storage + 实时同步）

## 已实现功能

- 🌙 **流星夜空封面**（`CurtainIntro` + `MeteorCanvas`）：点击进入，鼠标拖出彗星尾
- 🔑 **共用暗号门**：输入约定口令解锁，本设备记住；导航菜单可「🔒 锁定」
- 🏠 **首页**（`/`）：宫格布局聚合
  - 在一起天数（`TogetherCard`）
  - 时间线（`TimelineCompact`）
  - 留言墙 / 聊天（`NoteWall`，支持发文字 & 图片）
  - 图片 / 视频墙（`MediaWall`，瀑布流，支持上传/编辑/删除，图片自动压缩）
- 📝 **不能忘的事**（`/memo`）
- 🎯 **!TARGET!**（`/goals`）：双人目标 / 心愿
- 💗 **Like And Unlike**（`/likes`）：喜欢 & 不喜欢清单
- 🔄 **实时同步**：留言 / 媒体 / 里程碑通过 Supabase Realtime 多端同步

## 本地运行

```bash
# 安装依赖
npm install

# 配置环境变量（复制后填入你的 Supabase 项目）
# .env
#   SUPABASE_URL=...
#   SUPABASE_KEY=...   # publishable / anon key

# 启动开发服务器（默认 http://localhost:3000）
npm run dev
```

## 数据库初始化（Supabase）

在 Supabase 后台 → SQL Editor 依次执行 `supabase/` 下的脚本：

| 脚本 | 作用 |
|------|------|
| `schema.sql` | 基础表：milestones / notes / media + RLS + 实时同步 |
| `storage.sql` | 创建 media 存储桶及策略 |
| `pages-tables.sql` | memo / goals / likes 等页面数据表 |
| `upgrade-notes.sql` | notes 表升级（支持图片消息） |
| `upgrade-likes.sql` | likes 表升级 |

## 如何修改内容

| 文件 | 内容 |
|------|------|
| `data/site.ts` | 网站名、你们的名字、恋爱起始日、封面问候语、暗号、下一个纪念日 |
| 各页面 / 留言墙 | 内容已落库到 Supabase，直接在网页里增删改即可，无需改代码 |

### 配色

配色定义在 `tailwind.config.ts` 的 `colors` 中：

- `sky` 主蓝 `#2563EB`
- `cyan` 青 `#06B6D4`
- `mist` 浅青背景 `#ECFEFF`
- `ink` 墨蓝文字 `#0F172A`

## 安全说明 🔒

已加固为「**服务端暗号校验 + HttpOnly 签名 Cookie**」方案：

- 暗号比对在 **Nitro 服务端**（`/api/unlock`）进行，**前端 JS 永远拿不到明文暗号**。
- 校验通过后下发 **HttpOnly 签名 Cookie**（HMAC-SHA256 签名，前端 JS 偷不到、改不了、伪造不了，180 天有效）。
- 路由守卫在 **SSR 服务端**就校验 Cookie：未解锁访问任何内页会被 **302 重定向回首页**，连页面 HTML 都拿不到。
- 站点已设置 `noindex, nofollow`，不会被搜索引擎收录。

### 环境变量（`.env`）

```bash
SUPABASE_URL=...
SUPABASE_KEY=...            # publishable / anon key
NUXT_PASSPHRASE=你的暗号     # 服务端暗号，前端不可见
NUXT_AUTH_SECRET=随机长串    # Cookie 签名密钥，务必保密
```

> 生成签名密钥：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 剩余风险（可接受）

数据库 RLS 仍为 `anon` 读写（为保留 **Supabase 实时同步**）。理论上能抓到前端 anon key 的技术型攻击者可绕过暗号直连数据库。对二人私密站，此风险等级可接受；如需彻底锁死，可进一步升级为服务端 API 代理 + service_role key（会牺牲实时同步）。

## 后续规划（V3）

- [x] 服务端暗号校验 + HttpOnly 签名 Cookie（已完成）
- [ ] 数据库 RLS 彻底锁死（服务端 API 代理）
- [ ] 回忆日记 / 给未来的信
- [ ] 地图足迹 / 年度回顾
- [ ] PWA：添加到主屏幕

## 目录结构

```
Forus/
├─ pages/          页面（首页 / memo / goals / likes）
├─ components/     组件（封面、流星、导航、各内容墙）
├─ composables/    数据逻辑（Supabase 读写 + 暗号 + 主题）
├─ middleware/     路由守卫（未解锁拦截）
├─ data/           站点静态配置（site.ts）
├─ supabase/       数据库 / 存储 SQL 脚本
├─ utils/          工具（日期计算）
├─ types/          类型定义
├─ assets/css/     全局样式
└─ public/         静态资源
```
