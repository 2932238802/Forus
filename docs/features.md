# 功能说明

按页面/功能列出实际行为、数据表与关键实现文件。除信件、小猫对话和 Storage 删除走 Nitro 服务端外，其余数据通过前端 Supabase client 直接读写（RLS 允许匿名），实时同步只在标注的模块启用。

## 1. 封面与解锁（首页 `/`）

**文件**：`pages/index.vue`、`components/CurtainIntro.vue`

- 首页不经过路由守卫（`middleware/unlocked.ts` 明确放行 `/`），而是先渲染封面。
- 封面显示 `siteConfig.curtainGreeting`（「你好，是啟艳公主么」），点击进入。
- `usePassphrase().refresh()` 请求 `GET /api/status`：
  - 已解锁 → 直接进入主界面；
  - 未解锁 → 弹出暗号输入框，`POST /api/unlock`，成功后服务端下发 HttpOnly Cookie。
- 暗号通过后，如果本设备从未选过身份，会要求选择「LosAngelous / 在野」；选择结果写入 `localStorage.forus_identity`。
- 封面关闭后主界面淡入；**未解锁时主界面整体不挂载**，不会拉取留言 / 图片 / 小猫历史，也不会建立 Realtime 订阅。

## 2. 首页宫格

**文件**：`pages/index.vue`、`components/FoldCard.vue`

- 桌面端（≥768px）三栏宫格，卡片强制展开；
- 移动端纵向堆叠，卡片可折叠。
- 首页包含：在一起天数、时间线、留言墙、图片墙。
- 未解锁时整块内容不挂载；解锁后才拉取数据并建立 Realtime 订阅。
- 特殊日子（周年 / 生日 / 整百天）首次进入会播放一次彩带动画（`components/Celebration.vue`），当天只自动播放一次；天数卡片上的徽章可点击重播。

## 3. 在一起天数与「想你了」

**文件**：`components/TogetherCard.vue`、`utils/date.ts`、`composables/usePokes.ts`、`components/PokeAlert.vue`

- 每秒刷新「在一起 X 天 HH:MM:SS」，起点为 `siteConfig.startDate`。
- 自动计算下一个未到的周年，展示剩余天数。
- 「想 TA 了」按钮：向 `pokes` 表插入一条 `who_from → who_to` 的记录，3 秒冷却。
- 对方下次进入首页时，`PokeAlert` 查询 `who_to = 我 AND seen = false`，弹窗提示并一次性标记已读。
- 注意：poke **没有**实时订阅，只有进入首页或封面解锁事件时检查一次。

## 4. 时间线

**文件**：`components/TimelineCompact.vue`、`composables/useMilestones.ts`

- 数据表 `milestones`，按 `date` 升序。
- 支持新增 / 编辑 / 删除节点，图标从预设 emoji 中选择。
- 删除前弹出二次确认。

## 5. 留言墙 / 聊天

**文件**：`components/NoteWall.vue`、`composables/useNotes.ts`

- 数据表 `notes`，时间正序展示，新消息自动滚到底。
- 支持纯文字与图片消息；图片先经 `utils/image.ts` 压缩，再上传到 Storage `media` 桶。
- 消息气泡根据 `author` 是否等于 `siteConfig.you` 决定左右与颜色。
- 删除任意消息无身份校验（前端只检查按钮可见性）；删除图片消息时会同时清理 Storage 文件。
- 上传逻辑由 `useMediaUpload` 提供，不再额外订阅 `media` 表。
- 实时同步：订阅 `notes` 表全事件，任何变更后重新拉全量。

## 6. 图片 / 视频墙

**文件**：`components/MediaWall.vue`、`composables/useMedia.ts`

- 数据表 `media`，支持外链 URL 或上传文件。
- 图片上传前压缩（长边 ≤1920、JPEG 质量 0.85；GIF 跳过）；视频原样上传；文件名使用 UUID。
- 编辑时若替换了文件，会顺带删除旧 Storage 文件；删除记录时也会清理对应文件。
- **Storage 删除 / 改写权限已收口**：匿名只能上传与公开读，删除/改写通过 `POST /api/media/delete`（service_role）。
- 内置 Lightbox：桌面支持 `←` / `→` / `Esc`，移动端支持左右滑动。
- 实时同步：订阅 `media` 表。

> 注意：页面标题叫「图片墙」，但列表实际是竖向卡片列表，不是瀑布流。

## 7. 备忘录（`/memo`）

**文件**：`pages/memo.vue`、`composables/useMemo.ts`、`composables/useMemoComments.ts`

- 数据表 `memos` + `memo_comments`。
- 顶部可切换「在野的 / LosAngelous 的」；默认看自己。
- **只有看自己的列表时**可以新增、勾选完成、编辑、删除；看对方的列表只读。
- 每条备忘录支持评论，双方都能评论；评论只能由作者本人删除（前端判断）。
- 实时同步：两个表各自订阅。

## 8. 目标（`/goals`）

**文件**：`pages/goals.vue`、`composables/useGoals.ts`

- 数据表 `goals`，双人共享，无归属。
- 新增 / 勾选完成 / 删除；右上角进度环显示完成比例。
- 实时同步：订阅 `goals` 表。

## 9. 喜欢与不喜欢（`/likes`）

**文件**：`pages/likes.vue`、`composables/useLikes.ts`

- 数据表 `likes`，字段 `owner`（`you` / `npy`）、`kind`（`like` / `dislike`）、`category`。
- 分类：食物 / 行为 / 物品 / 其他。
- 页面语义是「**我维护我眼中 TA 的喜好档案**」：切换到对方 Tab 才能增删，切到自己 Tab 只读。
- 桌面可拖拽卡片在「喜欢 / 不喜欢」两栏间移动；移动端用箭头按钮翻转。
- 实时同步：订阅 `likes` 表。

## 10. Adore!!（`/adore`）

**文件**：`pages/adore.vue`、`composables/useAdores.ts`

- 数据表 `adores`，记录「对方让我心动的理由」。
- 同样只能维护对方名下的条目；支持行内编辑、删除。
- 实时同步：订阅 `adores` 表。

## 11. 需要改进的地方（`/dislikes`）

**文件**：`pages/dislikes.vue`、`composables/useDislikes.ts`

- 数据表 `dislikes`，记录希望对方改进的点；对方改正后由记录者删除。
- 只能维护对方名下条目。
- 实时同步：订阅 `dislikes` 表。

## 12. 给未来的信（`/letters`）

**文件**：`pages/letters.vue`、`composables/useLetters.ts`

- 数据表 `letters`：`who_from`、`who_to`、`title`、`content`、`unlock_date`。
- **读写全部走 Nitro `/api/letters`**（service_role），anon key 无法直接读取该表。
- 写信时可指定未来开启日期；收件人只有在 `unlock_date` 当天及之后才能展开阅读。
- 列表接口对未到期收件信只返回标题/日期，正文为 `null`；到期后打开时再取完整内容。
- 写信人始终能回看自己写的信；未到期的信仍可重新编辑或撤回（删除）。
- 服务端会再次校验发件人、到期时间与日期格式；身份由已解锁设备声明。
- 信件不使用 Realtime。

## 13. 日历（`/calendar`，导航隐藏）

**文件**：`pages/calendar.vue`、`composables/useCalendar.ts`、`composables/useWeather.ts`

- 月历视图，支持翻月、回到今天、键盘 `↑ ↓ ← →` 切换选中日。
- 右侧详情：公历 / 农历 / 干支 / 宜忌（`lunar-javascript`）。
- **仅选中今天时**显示实时天气：先用 `ipapi.co` 按 IP 定位城市，已授权浏览器定位时再取精确坐标，最后请求 `open-meteo.com`。
- 天气结果缓存到 `sessionStorage` 30 分钟，期间不会重复请求；卡片上有「刷新」与失败「重试」。
- 每天可写一条 Markdown 备注（`calendar_marks`，`date` 唯一）；留空保存等于删除。
- 实时同步：订阅 `calendar_marks` 表。
- 该页不在导航栏中，需直接访问 `/calendar`。

## 14. 又推又推（`/push`，导航隐藏）

**文件**：`pages/push.vue`、`composables/usePushbacks.ts`

- 数据表 `pushbacks`：记录对方说反话、推开自己的瞬间（文字 + 可选备注）。
- 只有身份为 `you`（LosAngelous）时能新增 / 编辑 / 删除；`npy` 只能查看。
- 该页不在导航栏中，需直接访问 `/push`。
- 列表由 `pages/push.vue` 自身渲染；早期 `PushWall.vue` 已删除。

## 15. 尚锦（小猫 AI）

**文件**：`components/CatChat.vue`、`composables/useCat.ts`、`server/api/cat.post.ts`、`server/api/cat-messages.get.ts`、`server/utils/cat-brain.ts`

- 右下角浮动猫按钮。
- 选择过身份后可见；对话历史存 `cat_messages` 表（**全局共享，不区分身份**）。
- `GET /api/cat-messages` 返回最近 100 条（时间正序）。
- `POST /api/cat` 只接收 `{ message }`：服务端校验解锁 Cookie、限制 500 字、从数据库读取最近 10 条历史、组装上下文、调用 OpenAI 兼容接口（20 秒超时），并持久化用户与小猫的消息。
- 人设、称呼、关键词规则都在 `server/utils/cat-brain.ts` 中，可直接编辑。
- `cat_messages` 已撤销 anon 权限，只允许服务端访问。
- 对话请求会把消息内容发送给外部 AI 服务商；API Key 只在服务端。

## 16. 主题

**文件**：`composables/useTheme.ts`、`components/ThemeSwitcher.vue`、`layouts/default.vue`、`assets/css/main.css`

- 两套主题：`star`（星空流星）与 `sakura`（樱花飘落）。
- 通过 `<html data-theme="...">` + CSS 变量切换；樱花主题额外叠加 `public/sakura-bg.webp`。
- 语义色 `accent` / `accent-soft` / `positive` / `negative` / `warning` 映射到 CSS 变量，按钮、标签和状态色都会跟随主题。
- 背景 Canvas 随主题切换：`MeteorCanvas` 或 `SakuraCanvas`；封面显示时布局层 Canvas 会暂停，避免双动画循环。
- 未提供根据系统 `prefers-color-scheme` 自动切换，默认星空。

## 17. 庆祝与生日氛围

**文件**：`utils/date.ts`、`components/Celebration.vue`、`components/BirthdayAtmosphere.vue`

- 优先级：周年 > 农历生日（在野，农历六月初六）> 公历生日（LosAngelous）> 整百天。
- 首页自动播放彩带动画，`forus_celebrated` 记录当天 key，避免刷新重播。
- 在野生日的**当天**，全站显示气球与彩纸氛围（仅视觉，不拦截点击）。
- LosAngelous 生日目前只有首页彩蛋，没有全站氛围装饰。
