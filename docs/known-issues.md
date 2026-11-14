# 已知问题与优化项

> 记录当前代码审查发现的问题。优先级：**P0** 安全/数据风险，**P1** 明确缺陷，**P2** 性能/健壮性/体验，**P3** 清理项。
> 状态：`[ ]` 待处理，`[x]` 已修复。
>
> 2026-11-14：已按 `docs/archive/261114/` 的方案执行完毕；「默认暗号 / 默认签名密钥」一项按要求跳过。

## P0 — 安全 / 数据

- [ ] **生产环境缺少变量时回退到默认暗号与默认签名密钥**（按要求跳过）
  `nuxt.config.ts:9-10` 中 `passphrase` 回退 `'622'`、`authSecret` 回退 `'forus-dev-secret-change-me'`。部署时漏配环境变量会导致任意人可解锁，且可伪造 Cookie。
  **建议**：去掉默认值；生产环境检测到缺失时直接抛错，或至少在启动日志中大声警告。

- [x] **数据库无真实访问控制（已收口敏感表）**
  `letters` 与 `cat_messages` 已撤销 anon 权限，只允许服务端 service_role 访问；Storage 删除/改写也走服务端。其余表（notes / media / memos / likes 等）仍保留 anon 直连以维持 Realtime，属于显式取舍。
  **剩余风险**：`media` 仍为公开读；其余表被 anon key 读取。详见 [security.md](./security.md)。

## P1 — 明确缺陷

- [x] **喜欢页在只读 Tab 仍可通过拖拽 / 箭头修改条目**
  `pages/likes.vue` 的 `onDrop` 与 `flip` 没有检查 `isPartnerView`，切到自己 Tab（只读）时仍能改 `kind`，与「只能维护对方喜好档案」的页面规则冲突。
  **处理**：拖拽与箭头增加 `isPartnerView` 守卫，非对方 Tab 不渲染箭头按钮。

- [x] **小猫按钮的拖动处理器未定义**
  `components/CatChat.vue:46` 绑定 `@pointerdown="onPointerDown"`，但脚本里没有该函数。点击不会报错，但也完全不起作用；同时专用 composable `composables/useDraggable.ts` 没有任何引用。
  **建议**：要么 `import { useDraggable }` 并接上 `style` / `onPointerDown`，要么删掉该绑定和 `useDraggable.ts`。

- [x] **小猫历史只取最旧的 100 条**
  `composables/useCat.ts:27-30` 先 `order('created_at', { ascending: true })` 再 `.limit(100)`，得到的是最早 100 条。超过 100 条后，刷新页面看到的永远是旧对话，新消息不显示。
  **建议**：改为 `ascending: false` + `limit(100)`，取回后再 `reverse()`。

- [x] **删除图片留言不会清理 Storage 文件**
  `composables/useNotes.ts:50-52` 只删除 `notes` 行；图片消息的 `image_url` 指向 Storage，文件会永久残留。
  **建议**：删除前解析 url，调用 `supabase.storage.from('media').remove([path])`（可复用 `useMedia` 里的 `extractStoragePath`）。

- [x] **首页未解锁时仍会拉取数据并建立实时连接**
  `pages/index.vue:68` 的主界面始终渲染（只是透明/被封面盖住），`NoteWall` / `MediaWall` 在 `onMounted` 就会查询 Supabase 并订阅频道。封面并没有真正阻止数据请求。
  **建议**：给主界面内容加 `v-if="entered"`（或在 `NoteWall`/`MediaWall` 外层加 `v-if`），解锁后再挂载。

- [x] **文档与实际代码不一致**
  - 根 `README.md` 曾描述不存在的日记页面与建表脚本；
  - `AGENTS.md` 曾称所有 composable 都是模块级单例（实际只有 `usePassphrase` / `useIdentity` / `useTheme` / `useToday` / `useCover` 是）；
  - `AGENTS.md` 曾把小猫配置项写成不存在的字段名，实际是 `catApiBase` / `catApiKey` / `catModel`。
  **建议**：以本目录文档为准，修正上述三处。

## P2 — 性能 / 健壮性 / 体验

- [x] **`useMedia()` 被当作上传工具复用，产生多余订阅**
  `components/NoteWall.vue:9` 只想要 `uploadFile`，但 `useMedia` 在 `onMounted` 会拉取全量 `media` 并订阅表格。首页同时存在 `NoteWall` 和 `MediaWall`，于是 `media` 表被订阅两次、重复拉取。
  **建议**：把上传逻辑抽成独立的 `utils/uploadMedia.ts` 或让 `useMedia({ subscribe: false })` 可配置。

- [x] **解锁 Guard 每次导航都请求一次 `/api/status`**
  `middleware/unlocked.ts:9-12`。客户端路由切换频繁时会重复请求。
  **建议**：复用 `usePassphrase()` 的模块级 `unlocked` / `ready` / `inflight`，只在本进程首次导航时请求。

- [x] **封面阶段有两套全屏 Canvas 动画**
  `layouts/default.vue:17-18` 始终渲染背景 Canvas，`components/CurtainIntro.vue:75` 在未解锁时又渲染一个交互版 `MeteorCanvas`。星空主题下同时跑两个 `requestAnimationFrame` 循环。
  **建议**：封面显示时暂停/卸载布局层 Canvas。

- [x] **「在一起天数」存在两种口径**
  `components/TogetherCard.vue:103` 显示 `togetherDuration().days`（起始日当天为 0），而 `utils/date.ts:11` 的 `daysSince` 返回含今天的天数（起始日当天为 1），整百天判断用的也是后者。两处展示可能差 1 天。
  **建议**：统一口径，或在 `TogetherCard` 中使用 `togetherDays()`。

- [x] **时间线删除缺少确认**
  `components/TimelineCompact.vue:75` 直接调用 `removeMilestone`，与其他页面的 `confirm()` 风格不一致，容易误删。
  **建议**：加二次确认。

- [x] **多数写操作静默失败**
  `useNotes.addText`、`useGoals.addGoal`、`useMemo.addMemo`、`usePushbacks.addPushback` 等都不检查 `error`，网络/RLS 失败时用户无感知，输入内容也没了。
  **建议**：统一检查 `error` 并 `throw`，由页面 `try/catch` 提示。

- [x] **`/api/unlock` 无速率限制**
  可被脚本暴力尝试暗号。
  **建议**：内存级失败计数（IP + 时间窗）或平台层限流。

- [x] **小猫接口的 `history` 未做角色白名单**
  `server/api/cat.post.ts:36` 直接透传客户端数组。恶意客户端可塞入 `role: 'system'` 等消息影响模型行为。虽然攻击者需要已解锁 Cookie，仍建议只保留 `user` / `assistant`。
  **建议**：`history.filter((m) => m.role === 'user' || m.role === 'assistant')`。

- [x] **上游 AI 请求没有超时与日志**
  `server/api/cat.post.ts:91-113`：请求可能长时间挂起；`catch (err)` 未使用也未记录。
  **建议**：`$fetch` 增加 `timeout`，并 `console.error` / 接入日志。

- [x] **天气每次打开日历都会重新定位**
  `composables/useWeather.ts:52`（ipapi.co）匿名额度有限，且每次进入页面都请求；同时把访问者 IP 暴露给第三方。
  **建议**：结果缓存到 `sessionStorage`（例如 30 分钟），并把失败态与重试入口分开。

- [x] **`todayCelebration()` 只在 setup 时计算一次**
  `layouts/default.vue:8`、`components/TogetherCard.vue:10`、`pages/calendar.vue:18-19` 都在初始化时取 `new Date()`。页面跨过午夜或 SSR/客户端时区不同会显示旧日期，甚至产生 hydration 警告。
  **建议**：用响应式「今天」或在 `onMounted` 后计算。

- [x] **无 test / lint / typecheck**
  `package.json` 只有 `build`。类型错误只能靠 Nuxt 构建暴露。
  **建议**：至少加 `vue-tsc --noEmit` 与 ESLint；改认证/SQL 时人工回归清单见 [deployment.md](./deployment.md)。

- [x] **SQL 脚本不可安全重跑**
  `schema.sql:53-55` 的 `alter publication ... add table`、`:60-61` 的初始插入、`pages-tables.sql:35-37` 的 policy、`storage.sql:18` 的 policy 都会在第二次执行时报错或产生重复数据。详见 [database.md](./database.md#脚本约定与注意事项)。
  **建议**：publication 用 `do $$ ... exception when duplicate_object ... $$` 包裹；插入用 `where not exists`；policy 先 `drop`。

## P3 — 清理项

- [x] `components/PushWall.vue` 已删除（`/push` 自己实现了列表）。
- [x] `composables/useDraggable.ts` 已删除（小猫拖动绑定一并移除）。
- [x] `@vueuse/motion` 已从依赖中移除。
- [x] `data/site.ts` 的 `nextAnniversary` / `nextAnniversaryLabel` / `curtainHint` 已删除。
- [x] `assets/css/main.css` 的旧封面样式（`.curtain-soft` / `.sunbeam` / `.sun-rays` / `.dust`）已删除。
- [x] `useTheme` 增加模块级初始化标记，只 apply 一次。
- [x] 小猫对话共享同一份历史：已确认为有意设计，并在文档中说明。
- [x] 时间格式化收敛到 `utils/time.ts`。
- [x] `marked.parse()` 改为类型收窄，不再直接断言字符串。
- [x] 主题色已变量化为 `accent` / `accent-soft` / `positive` / `negative` / `warning`，随 `data-theme` 切换。

## 执行结果

1. P0：敏感表收口已完成；默认暗号/默认签名密钥按用户要求跳过。
2. P1：小猫历史、图片留言清理、首页延迟挂载、CatChat 拖动遗留、文档同步全部完成。
3. P2：Guard 缓存、`useMedia` 订阅拆分、天数口径、错误提示、SQL 幂等、限流、测试/类型检查/Lint 全部完成。
4. P3：死代码、未用依赖、旧样式与配色变量化全部完成。

2026-11-14 复查补充：

- 喜欢页只读 Tab 的拖拽 / 箭头越权修改已修复（P1）。
- `docs/architecture.md`、`docs/features.md`、`docs/database.md`、`README.md`、`AGENTS.md` 已按当前代码重新对齐（接口数、页面数、SSR 封面、`PushWall`、时间线确认、Storage 策略等）。
