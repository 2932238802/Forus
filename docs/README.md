# Forus 文档

> 属于两个人的私密站点：Nuxt 3 + Supabase，输入共用暗号后进入，记录在一起的时间、照片、留言和种种小事。

本目录是项目的**主文档**。根目录的 `README.md` 面向首次运行，`AGENTS.md` 面向编码代理；这里补充架构、数据、安全与运维细节。

## 文档索引

| 文档 | 内容 |
|------|------|
| [features.md](./features.md) | 全部功能、页面行为与隐藏页面说明 |
| [architecture.md](./architecture.md) | 技术栈、目录结构、鉴权与数据流 |
| [database.md](./database.md) | Supabase 表结构、SQL 执行顺序、Storage 与实时同步 |
| [security.md](./security.md) | 暗号认证、威胁模型、剩余风险与加固清单 |
| [deployment.md](./deployment.md) | 环境变量、Supabase/Vercel 部署与排障 |
| [known-issues.md](./known-issues.md) | 已发现的问题、优化项与修复优先级 |

## 快速开始

```bash
npm install
cp .env.example .env   # 填入 Supabase 与暗号相关变量
npm run dev            # http://localhost:3000
```

首次进入需要：

1. 在 Supabase SQL Editor 按顺序执行 `supabase/` 下的脚本（顺序见 [database.md](./database.md)）。
2. 在 `.env` 中配置 `SUPABASE_URL`、`SUPABASE_KEY`、`NUXT_PASSPHRASE`、`NUXT_AUTH_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`。
3. 可选：配置 `NUXT_CAT_API_*` 启用「尚锦」小猫 AI。

## 技术栈

- **Nuxt 3 / Vue 3 / TypeScript**，SSR + 客户端组件混合
- **Tailwind CSS**，自定义主题变量（星空 / 樱花）
- **Supabase**：Postgres + Row Level Security + Storage + Realtime
- **lunar-javascript**：农历生日与黄历
- **marked**：日历备注的 Markdown 渲染
- **DeepSeek / OpenAI 兼容接口**：小猫 AI（仅服务端持有 Key）

## 页面一览

导航栏（`components/NavBar.vue`）目前只挂了前 7 个页面；`/calendar` 与 `/push` 是**刻意隐藏**的页面，知道地址即可访问（最近提交「隐藏日历 以及 又推 又推」）。

| 路由 | 页面标题 | 导航可见 | 需要解锁 |
|------|----------|:--------:|:--------:|
| `/` | 首页（封面 + 宫格） | ✅ | 封面本身可见 |
| `/memo` | 备忘录 | ✅ | ✅ |
| `/goals` | !TARGET! | ✅ | ✅ |
| `/likes` | Like And Unlike | ✅ | ✅ |
| `/adore` | Adore!! | ✅ | ✅ |
| `/dislikes` | 需要改进的地方 | ✅ | ✅ |
| `/letters` | 给未来的信 | ✅ | ✅ |
| `/calendar` | Calendar（月历 / 黄历 / 天气 / 备注） | ❌ 隐藏 | ✅ |
| `/push` | 又推又推 | ❌ 隐藏 | ✅ |

## 本机存储（localStorage）

这些键都只存在浏览器本地，不是安全凭证：

| Key | 作用 | 写入位置 |
|-----|------|----------|
| `forus_identity` | 本设备身份：`you`（LosAngelous）或 `npy`（在野） | `useIdentity` |
| `forus_theme` | 主题：`star`（星空流星）或 `sakura`（樱花飘落） | `useTheme` |
| `forus_celebrated` | 当天已播放过的庆祝彩蛋标识 | `pages/index.vue` |

## 验证方式

```bash
npm run build       # 构建
npm run typecheck   # 类型检查（nuxt typecheck / vue-tsc）
npm run test        # Vitest 单元测试
npm run lint        # ESLint
```

提交前四项都应通过；改动了 SQL 或认证逻辑时，请人工走一遍「锁定 → 封面 → 暗号 → 选身份」流程。
