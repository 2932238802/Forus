# 03 · 小猫 AI 修复与服务端化

- 优先级：P1
- 类型：缺陷修复 / 安全 / 健壮性
- 依赖：02（复用 `requireUnlocked`、`adminRest`）
- 影响文件：`server/api/cat.post.ts`、`server/api/cat-messages.get.ts`、`composables/useCat.ts`、`components/CatChat.vue`、`supabase/cat.sql`

## 问题

1. `composables/useCat.ts:27-30` 先升序再 `limit(100)`，拿到的是**最旧** 100 条；超过 100 条后刷新看不到新对话。
2. `components/CatChat.vue:46` 绑定了未定义的 `onPointerDown`，拖动功能实际不存在。
3. `cat_messages` 表允许 anon 读写，小猫对话可被 anon key 直接读取。
4. `/api/cat` 直接信任客户端传来的 `history`，理论上可注入 `role: 'system'` 等消息。
5. 上游 AI 请求没有超时，`catch` 里也没有日志，故障难排查。
6. 客户端先写用户消息、再等服务端，保存顺序不保证。

## 方案

### 1. 服务端持久化

新增 `server/api/cat-messages.get.ts`

- `requireUnlocked(event)`。
- 用 `adminRest` 查询 `cat_messages?select=*&order=created_at.desc&limit=100`，再 `reverse()` 返回。
- 返回 `{ ok: true, messages }`。

改造 `server/api/cat.post.ts`

- 鉴权改用 `requireUnlocked(event)`。
- 请求体只接受 `{ message: string }`，不再接受 `history`；长度限制 1–500。
- 服务端自行读取最近 10 条历史：
  `cat_messages?select=role,content&order=created_at.desc&limit=10` → `reverse()`。
  这样彻底消除 role 注入。
- 先写入用户消息（`role: 'user'`），再调用上游；成功后写入 `role: 'assistant'`。
- 上游 `$fetch` 增加 `timeout: 20000`。
- `catch` 中 `console.error('[cat]', err)`，仍然返回友好文案。
- 数据库读写失败不应阻断 AI 回复：查询历史失败时用空历史继续；写入失败时记录日志。

### 2. 前端改造

`composables/useCat.ts`

- 删除 `useSupabaseClient`、`mapRow`、`saveMessage`。
- `fetchHistory()` 改为 `$fetch('/api/cat-messages')`，映射为本地 `CatMessage[]`。
- `send(text)`：
  1. 本地 push 用户消息；
  2. `$fetch('/api/cat', { method: 'POST', body: { message: msg } })`；
  3. 本地 push 回复；
  4. 失败时 push 兜底文案。
- `onMounted(fetchHistory)` 保留。
- 加注释说明：小猫对话是**共享**的，不区分身份（产品设计如此，本次不拆）。

`components/CatChat.vue`

- 删除 `@pointerdown="onPointerDown"`；`useDraggable.ts` 在编号 12 中删除。
- 如果未来确实需要拖动，再单独接入 `useDraggable`，并同步处理面板位置；本批次不做。

### 3. 数据库迁移

新增 `supabase/upgrade-cat-service.sql`：

```sql
alter table public.cat_messages enable row level security;

drop policy if exists "anon all cat_messages" on public.cat_messages;
revoke select, insert, update, delete on public.cat_messages from anon;

do $$
begin
  alter publication supabase_realtime drop table public.cat_messages;
exception
  when undefined_object then null;
end $$;
```

同时修改 `supabase/cat.sql`（全新安装）：不再创建 `anon all cat_messages` 策略。

## 验收标准

- [ ] 用 anon key 直接请求 `cat_messages` 返回空/权限错误。
- [ ] 小猫按钮可正常打开、发送、回复。
- [ ] 新增第 101 条消息后刷新，列表展示的是**最近** 100 条。
- [ ] 请求体里塞 `history` 不再影响服务端行为。
- [ ] 断开网络或上游超时，20 秒内返回友好提示，服务端有错误日志。
- [ ] 页面源码中不再有未定义的 `onPointerDown`。

## 风险与回滚

- 小猫对话从客户端直连改为服务端中转，缺少 Realtime（原本也未使用）。
- 服务端写入失败时，本地仍会显示本轮对话；刷新后以数据库为准。
- 回滚：恢复 anon 策略，`useCat` 切回 Supabase client。
