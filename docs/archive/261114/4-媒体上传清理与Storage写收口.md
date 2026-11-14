# 04 · 媒体上传、清理与 Storage 写收口

- 优先级：P1
- 类型：缺陷修复 / 性能 / 安全
- 依赖：02（复用 `requireUnlocked`、service_role）
- 影响文件：`composables/useMedia.ts`、`composables/useNotes.ts`、`components/NoteWall.vue`、新增 `composables/useMediaUpload.ts`、`utils/storage.ts`、`server/api/media/delete.post.ts`、`supabase/storage.sql`

## 问题

1. `components/NoteWall.vue:9` 调用 `useMedia()` 只是为了拿 `uploadFile`。`useMedia` 在 `onMounted` 会拉取全量 `media` 并订阅表格，导致首页同时存在两个 `media` 订阅。
2. `composables/useNotes.ts:50-52` 删除图片留言只删数据库行，Storage 文件永久残留。
3. Storage 的 `anon update/delete` 策略允许任何拿到 anon key 的人改写或删除媒体文件。
4. 上传文件名只有 6 位随机串，熵偏低。

## 方案

### 1. 抽出纯上传/删除工具

新增 `utils/storage.ts`（Nuxt 自动导入）：

```ts
export function extractStoragePath(url: string): string | null {
  const marker = '/storage/v1/object/public/media/'
  const idx = url.indexOf(marker)
  return idx === -1 ? null : decodeURIComponent(url.slice(idx + marker.length))
}
```

新增 `composables/useMediaUpload.ts`：

- `upload(file)`：图片先 `compressImage`；路径改为 `crypto.randomUUID() + ext`；上传后返回 `{ url, kind, path }`。
- `remove(paths: string[])`：调用 `POST /api/media/delete`。
- **不注册任何 `onMounted` / Realtime**，只做工具。

### 2. 改造 `useMedia`

- 删除内部的 `extractStoragePath`，改用 `utils/storage.ts`。
- `updateItem` / `removeItem` 删除旧文件时改为调用 `useMediaUpload().remove([path])`。
- 保持自身的 Realtime 订阅（它才是图片墙的数据源）。

### 3. 图片留言清理

`useNotes.removeNote(id)`：

1. 从本地 `notes` 找到该条；
2. 删除数据库行；
3. 若是 `kind === 'image'` 且 `imageUrl` 存在，解析路径并调用 `remove([path])`；
4. Storage 删除失败只 `console.warn`，不影响主流程。

`components/NoteWall.vue`：

- 改为 `const { upload: uploadMedia } = useMediaUpload()`，不再调用 `useMedia()`。
- 发送图片仍先压缩、上传、再写 `notes`。

### 4. 服务端删除接口

新增 `server/api/media/delete.post.ts`：

- `requireUnlocked(event)`。
- body `{ paths: string[] }`，限制最多 20 个，拒绝包含 `..` 或 `/` 前缀的路径。
- 用 service_role 调 Storage：
  `DELETE {SUPABASE_URL}/storage/v1/object/media`，body `{ prefixes: paths }`。
- 返回 `{ ok: true }`。

### 5. Storage 策略收紧

新增 `supabase/upgrade-storage-write-lockdown.sql`：

```sql
-- 匿名只保留上传能力，删除/改写走服务端
drop policy if exists "anon update media" on storage.objects;
drop policy if exists "anon delete media" on storage.objects;
```

同时修改 `supabase/storage.sql`（全新安装）：只创建 `anon upload media` 与 `public read media`，不再创建 update/delete 策略。

保留的取舍：

- **公开读**：图片/视频公链仍可直接访问，这是为了让 `<img>` / `<video>` 在数据库里存 URL 的现有模型继续工作。彻底私有化需要签名 URL，列为后续可选项。
- **匿名上传**：为了不把大文件经 Nitro 中转，仍允许 anon 直接上传；文件名改为 UUID，降低枚举风险。

## 验收标准

- [ ] 首页 Network 面板中，`media` 表只有 `MediaWall` 一个 Realtime 订阅。
- [ ] 发送图片留言后删除，数据库行与 Storage 文件都消失。
- [ ] 图片墙替换文件或删除记录时，旧 Storage 文件被清理。
- [ ] 用 anon key 直接 `DELETE` Storage 对象返回权限错误；服务端 `/api/media/delete` 成功。
- [ ] 图片仍能正常显示、上传、压缩。
- [ ] 未解锁时调用删除接口返回 401。

## 风险与回滚

- 删除顺序为「先删数据库、后删文件」；文件删除失败会留下孤儿文件并记录警告，不会破坏记录。
- 回滚：恢复 `anon update/delete media` 策略，`useMedia` 切回客户端 `storage.remove`。
- 公开读的残余风险在 `docs/security.md` 中保留说明。
