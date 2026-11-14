# 数据库与存储

当前生产数据在**自建 Postgres**（`forus-db`，Postgres 17），通过 PostgREST 暴露 REST；浏览器使用 `forus_app` JWT，服务端敏感数据使用 `forus_service` JWT。`letters` 与 `cat_messages` 只允许 `forus_service` 访问。本地上传文件在 `/opt/forus/uploads`，通过 `/uploads/` 提供。

`supabase/` 下的 SQL 是历史 Supabase 初始化脚本（含 anon 策略、Storage、publication），保留作表结构参考；**不要**原样执行到自建库。当前环境的角色/JWT/GRANT、导入与备份步骤见 [迁移方案](./archive/261114/16-Supabase迁移自建数据库-开工方案.md)。

脚本已做幂等处理：publication 添加/移除、policy 创建、种子数据都可重复执行；一次性数据迁移记录在 `public.schema_migrations`。

## 自建环境角色

| 角色 | 属性 | 权限 |
|---|---|---|
| `authenticator` | LOGIN NOINHERIT | 供 PostgREST 连接并 SET ROLE |
| `forus_app` | NOLOGIN | 12 张业务表 CRUD；`letters` / `cat_messages` 无权限 |
| `forus_service` | NOLOGIN BYPASSRLS | 全部 15 张表 CRUD；仅服务端使用 |
| `forus_noaccess` | NOLOGIN | 无权限，PostgREST `PGRST_DB_ANON_ROLE` |

本地 RLS 关闭；权限由 GRANT 控制。若以后启用 RLS，需要为 `forus_app` 补 `for all to forus_app using (true) with check (true)` 策略。

## SQL 执行顺序（历史 Supabase 脚本，仅供参考）

> 以下顺序只适用于当时的 Supabase 云端项目；自建环境不要照跑。自建库当前通过角色 + GRANT 控制权限。

首次部署请**严格按顺序**执行（脚本之间存在依赖）：

| 顺序 | 脚本 | 作用 | 前置依赖 |
|:---:|------|------|----------|
| 1 | `schema.sql` | `milestones` / `notes` / `media` + RLS + Realtime + 初始里程碑 | — |
| 2 | `upgrade-notes.sql` | `notes` 增加 `kind`、`image_url`，允许 `text` 为空（图片消息） | 1 |
| 3 | `storage.sql` | 创建公开 `media` 桶、匿名上传策略与公开读策略 | — |
| 4 | `pages-tables.sql` | `memos` / `goals` / `likes` + RLS + Realtime | — |
| 5 | `upgrade-likes.sql` | `likes` 增加 `kind`（`like` / `dislike`） | 4 |
| 6 | `upgrade-likes-category.sql` | `likes` 增加 `category`，迁移旧 owner 显示名，按关键词预分类 | 5 |
| 7 | `upgrade-memo-owner-comments.sql` | `memos` 增加 `owner`；创建 `memo_comments` | 4 |
| 8 | `adores.sql` | `adores` | — |
| 9 | `dislikes.sql` | `dislikes` | — |
| 10 | `letters.sql` | `letters` | — |
| 11 | `pokes.sql` | `pokes` | — |
| 12 | `calendar.sql` | `calendar_marks` | — |
| 13 | `pushbacks.sql` | `pushbacks` | — |
| 14 | `cat.sql` | `cat_messages` | — |

> `upgrade-likes-category.sql` 会执行 `update public.likes ...`，必须在 `pages-tables.sql` 创建 `likes` 之后运行。
> 仓库中没有回忆日记相关的建表脚本；该功能未实现。

### 已有环境的服务端收口升级

以下脚本用于已经按旧版本初始化过的数据库，按需各执行一次；全新安装不需要（`letters.sql` / `cat.sql` / `storage.sql` 已包含最新策略）：

| 脚本 | 作用 |
|------|------|
| `upgrade-letters-service.sql` | 撤销 `letters` 的 anon 权限，移出 Realtime |
| `upgrade-cat-service.sql` | 撤销 `cat_messages` 的 anon 权限，移出 Realtime |
| `upgrade-storage-write-lockdown.sql` | 删除 Storage 的 `anon update/delete` 策略 |

执行后需要配置 `SUPABASE_SERVICE_ROLE_KEY`，否则信件 / 小猫 / Storage 删除接口会返回 500。

## 表结构

### `milestones` — 时间线

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | uuid PK | `gen_random_uuid()` |
| `title` | text not null | 节点名称 |
| `date` | date not null | 日期 |
| `type` | text not null default `'daily'` | `anniversary` / `travel` / `daily` / `special`（前端类型） |
| `emoji` | text default `'🤍'` | 图标 |
| `created_at` | timestamptz default now() | |

### `notes` — 留言墙

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | uuid PK | |
| `author` | text not null | 显示名（`LosAngelous` / `在野`），不是身份 key |
| `text` | text | 初始 not null；`upgrade-notes.sql` 已放开 |
| `kind` | text not null default `'text'` | `text` / `image` |
| `image_url` | text | 图片消息地址 |
| `created_at` | timestamptz | |

### `media` — 图片/视频墙

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | uuid PK | |
| `kind` | text not null default `'image'` | `image` / `video` |
| `url` | text not null | 公链或外链 |
| `title` | text | |
| `date` | date | |
| `created_at` | timestamptz | |

### `memos` / `memo_comments` — 备忘录

`memos`：

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | uuid PK | |
| `text` | text not null | |
| `done` | boolean not null default false | |
| `owner` | text not null default `'npy'` | 由 `upgrade-memo-owner-comments.sql` 添加 |
| `created_at` | timestamptz | |

`memo_comments`：

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | uuid PK | |
| `memo_id` | uuid not null | `references memos(id) on delete cascade` |
| `author` | text not null | `you` / `npy` |
| `text` | text not null | |
| `created_at` | timestamptz | |

### `goals` — 目标

`id`、`title`、`done`、`created_at`。无归属，双人共享。

### `likes` — 喜欢 / 不喜欢

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | uuid PK | |
| `owner` | text not null | 初始为显示名；升级后迁移为 `you` / `npy` |
| `kind` | text not null default `'like'` | `like` / `dislike`（`upgrade-likes.sql`） |
| `category` | text not null default `'other'` | `food` / `behavior` / `thing` / `other`（`upgrade-likes-category.sql`） |
| `text` | text not null | |
| `created_at` | timestamptz | |

### `adores` — Adore!!

`id`、`owner`（`you` / `npy`）、`text`、`created_at`。索引 `(owner, created_at)`。

### `dislikes` — 需要改进的地方

`id`、`owner`、`text`、`created_at`。索引 `(owner, created_at)`。

### `letters` — 给未来的信

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | uuid PK | |
| `who_from` | text not null | `you` / `npy` |
| `who_to` | text not null | `you` / `npy` |
| `title` | text not null default `''` | |
| `content` | text not null | |
| `unlock_date` | date not null | 这天的 00:00 后可拆 |
| `created_at` | timestamptz | |

索引：`(who_to, unlock_date)`。

### `pokes` — 想你了

`id`、`who_from`、`who_to`、`message`（默认 `''`，暂未使用）、`seen`（默认 false）、`created_at`。
索引：`(who_to, seen, created_at desc)`。

### `calendar_marks` — 日历备注

`id`、`date`（**unique**）、`text`（默认 `''`）、`created_at`。一天一条。

### `pushbacks` — 又推又推

`id`、`text`、`note`、`owner`（默认 `'you'`）、`created_at`。

### `cat_messages` — 小猫对话历史

`id`、`role`（`user` / `assistant`）、`content`、`created_at`。索引 `created_at asc`。
不区分身份，两端共享同一份对话。

## Row Level Security

当前自建库中 15 张表的 `relrowsecurity` 均为 `false`，也没有 policy；访问控制由角色 + GRANT 完成：

- `forus_app`：12 张业务表 SELECT/INSERT/UPDATE/DELETE；
- `forus_service`：全部表 CRUD（BYPASSRLS）；
- `letters` / `cat_messages` 不授予 `forus_app`，浏览器直连返回 403。

历史 Supabase 脚本中的 `create policy ... to anon` 仅用于当时的云端项目；如果以后在自建库重新启用 RLS，必须为 `forus_app` 建对应策略，否则 GRANT 之后仍看不到行。

风险见 [security.md](./security.md)。

## Storage / 本地上传

- 生产文件目录：`/opt/forus/uploads`（容器内 `/data/uploads`，由 compose 挂载）。
- 上传：`POST /api/upload`，扩展名白名单（jpg/jpeg/png/webp/gif/mp4/webm/mov），25MB 上限，UUID 文件名。
- 删除：`POST /api/media/delete`，只允许删除上传目录内的文件，带路径穿越防护。
- URL：`/uploads/<uuid>.<ext>`；历史 Supabase 公链在迁移时已改写，`utils/storage.ts` 仍兼容旧前缀以便解析。
- 公开读；nginx 对 `/uploads/` 加 `nosniff` 与 CSP `sandbox`。

## 实时 / 轮询

前端已移除 Supabase Realtime，改为 `composables/usePolling.ts`：挂载时拉取、30 秒轮询、页面隐藏跳过、回前台立即刷新；每个写操作成功后本地 `fetchAll()`。

涉及表：`milestones`、`notes`、`media`、`memos`、`memo_comments`、`goals`、`likes`、`adores`、`dislikes`、`calendar_marks`、`pushbacks`。`pokes` 由 `PokeAlert` / `TogetherCard` 自己的定时器轮询；`letters` 与 `cat_messages` 走服务端接口。

## 脚本约定与注意事项

脚本已针对重跑做过处理，但仍需注意：

1. **publication 添加/移除**都用 `do $$ ... exception ... $$` 包裹，重复执行不会中断。
2. **`schema.sql` 的初始里程碑**使用 `where not exists`，不会重复插入。
3. **所有 policy 创建前都有 `drop policy if exists`**，包括 `pages-tables.sql` 与 `storage.sql`。
4. **一次性数据迁移**（likes owner 迁移与分类预填、memos owner 回填）记录在 `public.schema_migrations`；不要手动删除这些记录，否则重跑会再次覆盖人工调整过的数据。
5. **`upgrade-likes-category.sql` 依赖 `likes` 已存在**，必须在 `pages-tables.sql` 之后运行。
6. **旧数据 owner**：`likes` 升级前可能存的是显示名「在野 / LosAngelous」，迁移在 `upgrade-likes-category.sql`；`memos` 旧数据全部归 `npy`。
7. **服务端收口脚本**（`upgrade-letters-service.sql` / `upgrade-cat-service.sql`）会撤销 anon 权限；执行前请确认已配置 `SUPABASE_SERVICE_ROLE_KEY`，否则相关页面会不可用。
8. **Storage 公开读**仍然保留；如果希望完全私有化，需要改为服务端签名 URL，属于后续可选改造。

## 重置数据库

项目没有 migration 框架。自建环境彻底重建的做法：

1. 从最近备份恢复：`zcat /opt/backup/forus-*.sql.gz | docker exec -i forus-db psql -U postgres -d forus`；
2. 重新执行角色/GRANT（见迁移方案 P1.2）；
3. 文件从 `/opt/backup/forus-uploads-*.tar.gz` 恢复到 `/opt/forus/uploads`。

删除表时注意 `memo_comments.memo_id` 的外键级联，先删 `memos` 会连带删除评论。
