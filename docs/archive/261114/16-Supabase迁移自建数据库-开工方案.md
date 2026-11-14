# Forus 迁移：Supabase 云端 → 自建 Postgres（开工方案 v2）

- 日期：2026-11-14（v2 完善于同日）
- 状态：**已完成切源**（2026-11-14；P0–P5 完成，P6 进入一周观察期）
- 目标：家站数据与图片全部落在自有服务器 `47.111.175.191`，不再依赖 Supabase 云
- 相关目录：服务器 `/opt/forus`、本机 WSL `~/LosAngelous/Forus`
- 最终验收：**断开 Supabase 后，整站功能仍然正常**

---

## 0. 一页速览（TL;DR）

**推荐路线**：数据导出（已完成）→ 本地库对齐与角色/JWT 准备 → 代码改造（上传本地化 + 实时改轮询）→ nginx 暴露 `/db` 与 `/uploads` → 停机窗口内导入数据并切换数据源 → 验收。

**停机窗口**：约 **10–20 分钟**（只包含「停写 → 导入 → 切环境变量 → 重启 → 冒烟」）。
**总工作量**：约 1–1.5 个工作日（其中代码改造 2–3 小时，配置与验证 2–3 小时）。

与初版方案相比，v2 做了以下**关键修正**（均经代码核对）：

| # | 初版说法 | 实际情况 / 修正 |
|:--:|---|---|
| 1 | 实时订阅「约 6 处」 | **实际 11 处**：`useNotes` / `useMedia` / `useLikes` / `useAdores` / `useMemo` / `useMemoComments` / `useMilestones` / `usePushbacks` / `useCalendar` / `useGoals` / `useDislikes` |
| 2 | 实时改轮询即可 | 现有写操作**完全依赖 Realtime 回调刷新**；改成轮询后必须在每次写入成功后本地 `fetchAll()`，否则自己的操作也要等 30 秒才出现 |
| 3 | 前端改用 anon JWT，写走 3002 | 浏览器只有一个 `supabase-js` client、一把 key。`forus_anon` 只有 SELECT，按原方案**所有写操作都会失败**。推荐**单 PostgREST + 单 `forus_app` 角色**，放弃读写双实例 |
| 4 | 保留 RLS 即可 | 现有 policy 全是 `to anon`；本地 JWT 角色是 `forus_app` 时**策略不匹配**。需要为 `forus_app` 建策略，或把 JWT role 设为 `anon` |
| 5 | 服务端 service key 直连 | 本地必须把 `SUPABASE_SERVICE_ROLE_KEY` 换成**本地签发的 service JWT**，对应角色需要 `BYPASSRLS`，否则 `letters` / `cat_messages` 全部 403 |
| 6 | 上传走 `/api/upload` | 上传从「浏览器直传 Supabase」变成「经 nginx → Nitro」。nginx 默认 `client_max_body_size 1m`，**不改会 413**；h3 会把 multipart 整个读进内存，需要 25MB 上限 |
| 7 | 只改 `media.url` | **`notes.image_url` 也存 Supabase 公链**，两处都要改写 |
| 8 | — | `utils/storage.ts` 只认 Supabase 公链；改成 `/uploads/` 后删除图片会**静默跳过**，必须同步改解析逻辑 |
| 9 | — | 图片改为同源 `/uploads/` 后，上传 HTML/SVG 会带来**同源 XSS** 面；上传接口要限扩展名，nginx 要加 `nosniff` 与 CSP `sandbox` |
| 10 | — | 仓库里的 SQL 是 Supabase 专用（`anon` 角色、`supabase_realtime` publication、`storage` schema）；**不要原样灌进本地纯 Postgres**，只做结构对比和补列 |

---

## 1. 为什么做

现在家站的**真实数据在 Supabase 云**（项目 ref `jyolrotulemhiowkemst`），前端 `useDb()` → `useSupabaseClient()` 由浏览器直连云端取数。服务器本地那套 Postgres + PostgREST 只是 11-09 迁移时导入的**快照**（数据停在 11-04）。

后果：

- 每次部署都要带上 `SUPABASE_URL` / `SUPABASE_KEY`，否则启动即 500（2026-11-14 就是这么炸的）
- Supabase 免费项目会暂停；暂停后前端**全部功能立刻不可用**
- 数据不在自己手里，导出/迁移都要靠它的 API

---

## 2. 现状盘点（2026-11-14 实测）

### 2.1 数据

| 表 | 云端行数 | 本地快照行数 | 备注 |
|---|---:|---:|---|
| notes | 157 | 156 | 最新 2026-11-12 |
| likes | 93 | 93 | |
| adores | 90 | 90 | |
| calendar_marks | 89 | 89 | |
| pokes | 71 | 70 | |
| cat_messages | 56 | 56 | 服务端专用 |
| media | 26 | 26 | `url` 是完整 Supabase 公链 |
| memos | 15 | 15 | |
| goals | 10 | 10 | |
| letters | 7 | 7 | 服务端专用 |
| milestones | 6 | 5 | |
| pushbacks | 5 | 5 | |
| dislikes | 2 | 2 | |
| diaries | 1 | 1 | 代码未使用 |
| memo_comments | 1 | 1 | 外键 → `memos` |

> 本地快照与云端存在少量行数差（notes 156/157、pokes 70/71、milestones 5/6），因此 **P4 必须用「导出 JSON 的实际行数」做校验**，不能拿本地旧快照当基准。

**P0 已完成：全量导出到服务器 `/opt/backup/supabase-export/`**

- 15 张表 → `*.json`（共 196K）
- Storage 文件 → `storage/`（29 个，8.2M，清单 `storage-names.txt`）
- 导出时间：2026-11-14 20:10；**执行迁移当天必须先重跑一次导出**（见 P1.5）

### 2.2 服务器现有组件

| 组件 | 位置 | 说明 |
|---|---|---|
| `forus-db` | `127.0.0.1:5433` | postgres:17，数据目录 `/opt/forus/db` |
| `forus-rest` | `127.0.0.1:3001` | PostgREST，当前 anon role = `forus_anon`（仅 SELECT） |
| `forus-rest-write` | `127.0.0.1:3002` | PostgREST 可写，role = `forus_writer` |
| `forus-app` | `127.0.0.1:8081` | Nitro，挂载 `./.output:/app`、`./uploads:/data/uploads` |
| nginx | 443 | `forus.los-theseus.site` → `127.0.0.1:8081` |

> 服务名以实际 compose 文件为准；`update.sh` 默认查找服务名 `forus`，也兼容第一个容器。执行前用 `docker compose ps` 确认。

### 2.3 代码里的 Supabase 依赖点（精确审计）

| 文件 | 用法 | 数量 | 改造 |
|---|---|---:|---|
| `composables/useDb.ts` | `useSupabaseClient()` 统一出口 | 1 | 不改 |
| `composables/use*.ts` | `supabase.from('x').select/insert/update/delete` | **24 处** | 不改，PostgREST 兼容 |
| `composables/use*.ts` | `.channel().on('postgres_changes')` | **11 处** | **改轮询** |
| `composables/use*.ts` | `removeChannel` | 11 处 | 随订阅一起删 |
| `composables/useMediaUpload.ts` | `supabase.storage.from('media').upload()` + `getPublicUrl()` | 2 处 | **改 `/api/upload`** |
| `server/api/media/delete.post.ts` | 直连 `${url}/storage/v1/object/media` | 1 | **改本地 `unlink`** |
| `server/utils/supabase-admin.ts` | 服务端 service key 直连 PostgREST | 1 | **保留，但换本地 JWT + 内网 URL** |
| `utils/storage.ts` | 反解 Supabase 公链路径 | 1 | **增加 `/uploads/` 解析** |
| — | `rpc` / `count: 'exact'` / `head: true` | **0** | 无兼容问题 |

**11 处实时订阅的完整清单**（P2 逐个改）：

| composable | 表 | 写操作是否依赖实时回调刷新 |
|---|---|:---:|
| `useNotes` | `notes` | 是 |
| `useMedia` | `media` | 是 |
| `useLikes` | `likes` | 是 |
| `useAdores` | `adores` | 是 |
| `useMemo` | `memos` | 是 |
| `useMemoComments` | `memo_comments` | 是 |
| `useMilestones` | `milestones` | 是 |
| `usePushbacks` | `pushbacks` | 是 |
| `useCalendar` | `calendar_marks` | 是 |
| `useGoals` | `goals` | 是 |
| `useDislikes` | `dislikes` | 是 |

> `usePokes` 没有 Realtime；`PokeAlert` / `TogetherCard` 已经用 `setInterval` 自己轮询。`useCat` / `useLetters` 走服务端接口，均不受影响。

### 2.4 开工前必须确认的 8 件事

- [ ] `docker compose ps`：确认 `forus-db` / `forus-rest` / `forus-rest-write` / `forus-app` 的真实服务名与网络
- [ ] `docker exec forus-app wget -qO- http://forus-rest:3000/` 能从 app 容器访问 PostgREST（内网 URL 用服务名，**不是 `127.0.0.1`**）
- [ ] 本地 DB 名、超级用户（后文按 `forus` / `postgres` 写）
- [ ] PostgREST 版本 ≥ v11（支持 `PGRST_JWT_SECRET`；`docker inspect` 查镜像 tag）
- [ ] 本地 `public` schema 各表列是否与云端导出一致（见 P1.1）
- [ ] `/opt/forus/uploads` 是否已存在、容器写入 UID 是否有权限
- [ ] nginx 站点配置文件路径（`/etc/nginx/sites-available/forus` 或 `conf.d/forus.conf`）
- [ ] 两人都在线时间，确定 10–20 分钟停机窗口

---

## 3. 目标架构

```
浏览器（同源，无 CORS 预检）
  ├─ https://forus.los-theseus.site/db/rest/v1/*  → nginx → 127.0.0.1:3001 (PostgREST)
  ├─ https://forus.los-theseus.site/uploads/<f>   → nginx → /opt/forus/uploads 静态
  ├─ https://forus.los-theseus.site/api/*         → forus-app (Nitro)
  └─ 页面本体                                      → forus-app
```

要点：

- `SUPABASE_URL=https://forus.los-theseus.site/db`（supabase-js 会请求 `{url}/rest/v1/{table}`）
- 页面与 `/db` 同源，`apikey` / `Authorization` 头**不会触发 CORS 预检**
- **单 PostgREST 实例**即可，不再需要按 HTTP 方法分流（原因见 3.2）
- 图片统一走 `/uploads/`，`media.url` / `notes.image_url` 改成相对路径
- 服务端 `adminRest` 走 Docker 内网 `http://forus-rest:3000`，不绕公网 nginx
- 前端历史数据里的 Supabase 公链全部改写，`/storage/v1` 与 `/realtime/v1` 不再被请求

### 3.1 角色与权限模型

| 角色 | 用途 | 权限 |
|---|---|---|
| `authenticator` | PostgREST 登录角色（`NOINHERIT LOGIN`） | 仅能将身份 `SET ROLE` 成下面几种 |
| `forus_app` | 浏览器 JWT 的角色 | 12 张业务表的 SELECT/INSERT/UPDATE/DELETE；**没有** `letters` / `cat_messages` 权限 |
| `forus_service` | 服务端 service JWT | `BYPASSRLS` + 全部表读写；只放在服务端环境变量 |
| `forus_noaccess` | 未带 JWT 的请求 | 无任何权限，让匿名请求直接 401/403 |

12 张业务表：`milestones`、`notes`、`media`、`memos`、`memo_comments`、`goals`、`likes`、`adores`、`dislikes`、`pokes`、`calendar_marks`、`pushbacks`。
`letters`、`cat_messages` 保持 RLS 启用且无策略 + 撤销 `forus_app` 权限；`diaries` 代码未使用，可只导入不授权。

### 3.2 为什么放弃「读写双 PostgREST」

初版的设计是：3001 只读（`forus_anon`）、3002 可写（`forus_writer`），nginx 按方法分流。问题是：

1. `useDb()` 只返回一个 `supabase-js` client，`SUPABASE_KEY` 只有一把；无论发给哪个上游，PostgREST 都按 **JWT 里的 role** 决定权限，不按容器决定。
2. 如果浏览器用只读 JWT，写请求即使打到 3002 也会被角色权限拒绝；如果用可写 JWT，打到 3001 也能写，分流失去意义。
3. 两把 JWT 都打进浏览器就等于没有隔离；要真正隔离只能在 nginx 里按方法**替换** `Authorization`，复杂度高、收益低（能解锁页面的人本来就能写）。

因此推荐：**一个 PostgREST（3001）+ 一个 `forus_app` 角色**。`forus-rest-write` 可以停掉，或留作故障备机。安全边界改为：

- 浏览器 JWT 只能碰 12 张公开业务表；
- `letters` / `cat_messages` 只认 `forus_service`；
- 未带 JWT 的请求一律无权限。

> 如果坚持保留双实例，把 3002 停掉即可；本方案后续步骤不再依赖它。

### 3.3 与现状的差异

| 项 | 现状 | 迁移后 |
|---|---|---|
| 数据 | Supabase 云 Postgres | 本地 `forus-db` |
| 前端取数 | `https://<ref>.supabase.co/rest/v1` | `https://forus.los-theseus.site/db/rest/v1` |
| 鉴权 | Supabase anon key | 本地 HS256 JWT（`forus_app` / `forus_service`） |
| 实时 | Realtime WebSocket | 30 秒轮询 + 写后本地刷新 |
| 图片 | Supabase Storage 公链 | `/uploads/<uuid>.<ext>` 同源静态 |
| 服务端敏感数据 | service_role key | 本地 `forus_service` JWT（BYPASSRLS） |

---

## 4. 执行顺序

初版把「切数据源」放在「图片/实时改造」之前，会导致切换后上传与实时功能先坏一段时间。v2 改为：**所有代码改造和基础设施先做好并上线，停机窗口里只做数据导入 + 切环境变量**。

| 阶段 | 内容 | 是否停机 | 预计 |
|---|---|:---:|---:|
| P0 | 数据导出 | 否 | ✅ 已完成 |
| P1 | 准备：schema 对比、角色/策略、JWT、PostgREST 配置、备份 | 否 | 60–90 分钟 |
| P2 | 代码改造：上传本地化、删除本地化、URL 解析、实时改轮询、写后刷新 | 否（可先上线） | 2–3 小时 |
| P3 | nginx 暴露 `/db` 与 `/uploads`，body size、安全头 | 否（可先配置） | 30 分钟 |
| P4 | 停机窗口第 1 步：停写 → 备份 → 导入 → 改写 URL → 拷贝图片 | 是 | 5–10 分钟 |
| P5 | 停机窗口第 2 步：切环境变量 → 强制重建 → 冒烟 | 是 | 5–10 分钟 |
| P6 | 验收、文档同步、观察一周后下线云端 | 否 | 1 小时 + 观察 |

> **P2 在仍连云端时上线是安全的**：上传会写到本地 `/uploads/` 并把相对路径写进云端 `media` 行（页面在同一域名下，能正常显示）；轮询对云端同样有效。这样切数据源时不需要再等代码发布。

---

## 5. 阶段详情

### P1 准备（无停机）

#### P1.1 本地库结构对齐

本地是 11-09 的快照，云端之后可能加过列。先做列级 diff，**不要**把仓库 SQL 原样执行到本地（里面的 `to anon`、`supabase_realtime` publication、`storage.buckets` 在纯 Postgres 里会报错）。

```bash
EXPORT=/opt/backup/supabase-export
TABLES="notes likes adores calendar_marks pokes cat_messages media memos goals letters milestones pushbacks dislikes diaries memo_comments"

for t in $TABLES; do
  jq -r '.[0] // {} | keys[]' "$EXPORT/$t.json" | sort > "/tmp/cloud-$t.cols"
  docker exec forus-db psql -At -U postgres -d forus -c \
    "select column_name from information_schema.columns
     where table_schema='public' and table_name='$t' order by 1" \
    | sort > "/tmp/local-$t.cols"
  echo "== $t"
  diff -u "/tmp/local-$t.cols" "/tmp/cloud-$t.cols" || true
done
```

- 若云端有、本地没有：`alter table ... add column ...` 补上（类型从 `information_schema` 或导出值判断）。
- 若本地有、云端没有：多半是无害的旧列，保留即可；**如果它是 NOT NULL 且没有默认值，导入会失败**，需要补默认值或在导入时显式列出列名。
- 顺便核对主键类型：全部是 `uuid`，**没有 serial/identity 序列**，导入后不需要 `setval`。

再确认外键：

```sql
select conname, conrelid::regclass, confrelid::regclass
from pg_constraint where contype='f' and connamespace='public'::regnamespace;
```

预期只有 `memo_comments.memo_id → memos.id`。

**列名一致不代表能导入**，还要核对可空性与默认值。重点检查这些升级脚本带来的变化（本地快照可能停在升级前）：

| 表 | 必须满足 |
|---|---|
| `notes` | `kind` 默认 `'text'`、`image_url` 可空、**`text` 可空**（否则带图无文字的留言导入失败） |
| `memos` | `owner` 默认 `'npy'` |
| `likes` | `kind` 默认 `'like'`、`category` 默认 `'other'` |
| `pushbacks` | `note`、`owner`（默认 `'you'`） |
| `calendar_marks` | `date` 有 UNIQUE 约束 |
| `pokes` | `message` 默认 `''` |

```sql
select table_name, column_name, is_nullable, column_default, data_type
from information_schema.columns
where table_schema='public'
  and table_name in ('notes','memos','likes','pushbacks','calendar_marks','pokes')
order by table_name, ordinal_position;
```

#### P1.2 角色与权限（2026-11-14 已执行）

实测本地库：15 张表 `relrowsecurity = false`，`pg_policies` 为空——本地快照从未启用 RLS，权限完全由 GRANT 控制。因此**不需要建 RLS 策略**，只建角色 + 授权。

实际执行过的 SQL（`authenticator` 密码来自 `.env` 的 `FORUS_PGRST_PASSWORD`）：

```sql
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login password 'FORUS_PGRST_PASSWORD';
  else
    alter role authenticator with login noinherit password 'FORUS_PGRST_PASSWORD';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'forus_app') then
    create role forus_app nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'forus_service') then
    create role forus_service nologin bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'forus_noaccess') then
    create role forus_noaccess nologin;
  end if;
end $$;

alter role forus_service with bypassrls;
grant forus_app, forus_service to authenticator;
grant usage on schema public to authenticator, forus_app, forus_service;

grant select, insert, update, delete on
  public.milestones, public.notes, public.media, public.memos,
  public.memo_comments, public.goals, public.likes, public.adores,
  public.dislikes, public.pokes, public.calendar_marks, public.pushbacks
to forus_app;

grant select, insert, update, delete on all tables in schema public to forus_service;
revoke all on public.letters, public.cat_messages from forus_app;
```

结果：

| 角色 | 属性 | 权限 |
|---|---|---|
| `authenticator` | LOGIN NOINHERIT | 只能 SET ROLE |
| `forus_app` | NOLOGIN | 12 张业务表 CRUD；`letters` / `cat_messages` / `diaries` 无权限 |
| `forus_service` | NOLOGIN BYPASSRLS | 全部 15 张表 CRUD |
| `forus_noaccess` | NOLOGIN | 无任何权限，作为无 JWT 时的 anon role |

注意：

- **RLS 保持关闭**（与迁移前一致）。如果以后启用 RLS，必须为 `forus_app` 补 `for all to forus_app using (true) with check (true)` 策略，否则 GRANT 之后仍然看不到行。
- 服务器密码与签名密钥写在 `/opt/forus/.env`：`FORUS_PGRST_PASSWORD`、`FORUS_PGRST_JWT_SECRET`；两把 JWT 写在 `/opt/forus/.pg-jwt.env`（600）。
- 敏感表只给 `forus_service`；浏览器 JWT 直接访问 `letters` / `cat_messages` 返回 403。

验证角色与授权：

```sql
select rolname, rolcanlogin, rolbypassrls from pg_roles
 where rolname in ('authenticator','forus_app','forus_service','forus_noaccess');

select grantee, table_schema, table_name, privilege_type
  from information_schema.role_table_grants
 where grantee in ('forus_app','forus_service')
   and table_schema='public'
 order by grantee, table_name;
```

#### P1.3 生成两把 JWT

`PGRST_JWT_SECRET` 先生成一个 48 字节随机串（只存在服务器，不进 Git）：

```bash
openssl rand -base64 48
```

生成 JWT（不设 `exp`：永久有效；轮换 secret 即全部失效）：

```bash
export PGRST_JWT_SECRET='上一步生成的值'
node <<'NODE'
const crypto = require('node:crypto')
const secret = process.env.PGRST_JWT_SECRET
if (!secret) throw new Error('PGRST_JWT_SECRET 未设置')
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function sign(role) {
  const h = b64({ alg: 'HS256', typ: 'JWT' })
  const p = b64({ role, iss: 'forus' })
  const s = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')
  return `${h}.${p}.${s}`
}
console.log('APP_JWT=' + sign('forus_app'))
console.log('SERVICE_JWT=' + sign('forus_service'))
NODE
```

- `APP_JWT` → 浏览器 `SUPABASE_KEY`（公开，等同于现在的 anon key）
- `SERVICE_JWT` → 仅服务端 `SUPABASE_SERVICE_ROLE_KEY`
- 两把 token 都能被任何拿到的人直接访问 `/db`，所以 **service token 绝不能进前端**

#### P1.4 配置 PostgREST（3001）

在 compose 的 `forus-rest` 环境里加：

```yaml
environment:
  PGRST_DB_URI: postgres://authenticator:强密码@forus-db:5432/forus
  PGRST_DB_SCHEMAS: public
  PGRST_DB_ANON_ROLE: forus_noaccess
  PGRST_JWT_SECRET: ${PGRST_JWT_SECRET}
  PGRST_SERVER_PORT: 3001
  PGRST_LOG_LEVEL: info
```

- `PGRST_DB_ANON_ROLE=forus_noaccess`：不带 JWT 的请求无任何表权限，返回 401/403。
- 若现有容器用 `forus_anon` 作为 anon role，先改成 `forus_noaccess` 再验证。
- 重启 3001：`docker compose up -d forus-rest`（或实际服务名）。
- `forus-rest-write`（3002）可停掉；若保留，配置同样的 `PGRST_JWT_SECRET`，避免两套行为不一致。

验证（在服务器本机）：

```bash
# 把 P1.3 输出的 APP_JWT / SERVICE_JWT 填进来
APP='<APP_JWT>'
SERVICE='<SERVICE_JWT>'

# 带 app JWT：200
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "apikey: $APP" -H "Authorization: Bearer $APP" \
  'http://127.0.0.1:3001/notes?select=id&limit=1'

# 不带 JWT：401 或 403
curl -s -o /dev/null -w '%{http_code}\n' \
  'http://127.0.0.1:3001/notes?select=id&limit=1'

# app JWT 访问 letters：401/403（应被拒绝）
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "apikey: $APP" -H "Authorization: Bearer $APP" \
  'http://127.0.0.1:3001/letters?select=id&limit=1'

# service JWT 访问 letters：200
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" \
  'http://127.0.0.1:3001/letters?select=id&limit=1'
```

> 注意：PostgREST 对无权限表通常返回 `401` 或空数组 + 403，取决于版本与 RLS。以实际状态码为准，**不能是 200 + 数据**。

**2026-11-14 实测结果**：3001 / 3002 无 token → `401`；app JWT 读 `notes` → `200`；app JWT 读 `letters` / `diaries` → `403`；service JWT 读 `letters` → `200`；app JWT 插入/删除 `notes` → `201` / `204`。

#### P1.5 重新导出云端数据（迁移当天执行）

P0 的导出是 20:10 的快照；执行当天必须重跑，避免漏掉新留言/新图片。导出脚本建议固定在 `/opt/backup/supabase-export/export.sh` 并提交到私有备份（不要提交 service key）。最少要保证：

1. 15 张表全部导出为 JSON 数组；
2. `media` / `notes.image_url` 引用的 Storage 文件全部下载到 `storage/`；
3. 记录每张表的 `jq length` 与 `max(created_at)`，作为 P4 校验基准。

若原导出脚本没保存，先补一个：用云端 service key 调 `GET /rest/v1/<table>?select=*`（分页 `Range`），Storage 用 `/storage/v1/object/list/media` + `/storage/v1/object/public/media/<path>` 下载。

#### P1.6 备份与目录

```bash
# 本地库全量备份（迁移前基线；带 --clean 便于直接覆盖恢复）
docker exec forus-db pg_dump -U postgres --clean --if-exists forus | gzip \
  > /opt/backup/forus-pre-migration-$(date +%F-%H%M).sql.gz

# 上传目录
sudo mkdir -p /opt/forus/uploads
sudo chown "$(docker exec forus-app id -u):$(docker exec forus-app id -g)" /opt/forus/uploads

# 确认容器内写入路径（compose 已挂载 ./uploads:/data/uploads）
docker exec forus-app sh -c 'touch /data/uploads/.write-test && rm /data/uploads/.write-test'
```

---

### P2 代码改造（无停机，可先上线）

目标：让代码在「数据源仍是云端」时也能正常跑，这样切数据源当天不用发布。

> **先做 P3 里的 `client_max_body_size 30m`（只加这一行也行）再上线 P2**：上传从浏览器直传 Supabase 变成经 nginx → Nitro，nginx 默认 1m 会让手机照片直接 413。

#### P2.1 新增本地上传接口 `server/api/upload.post.ts`

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { requireUnlocked } from '~/server/utils/require-unlock'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'])

export default defineEventHandler(async (event) => {
  requireUnlocked(event)

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.data)
  if (!file?.data) throw createError({ statusCode: 400, statusMessage: '缺少文件' })
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '文件超过 25MB' })
  }

  const ext = (file.filename || '').split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED.has(ext)) {
    throw createError({ statusCode: 400, statusMessage: '不支持的文件类型' })
  }

  const config = useRuntimeConfig()
  const dir = String(config.uploadsDir || join(process.cwd(), '.data/uploads'))
  await mkdir(dir, { recursive: true })

  const name = `${randomUUID()}.${ext}`
  await writeFile(join(dir, name), file.data, { flag: 'wx' }) // 不覆盖已有文件
  return { ok: true, url: `/uploads/${name}`, path: name }
})
```

配套 `nuxt.config.ts`：

```ts
runtimeConfig: {
  // ...
  uploadsDir: process.env.NUXT_UPLOADS_DIR || '',
  supabaseInternalUrl: process.env.NUXT_SUPABASE_INTERNAL_URL || '',
},
```

> **P2 上线前就把 `NUXT_UPLOADS_DIR=/data/uploads` 写进 `.env` 并重建**（容器内挂载点）。否则上传会落到容器内部的 `.data/uploads`，重建即丢。此时数据源仍是云端，不影响其他功能。
> 服务器现有 compose 用的是单数 `NUXT_UPLOAD_DIR`，代码已同时兼容两种写法；不必为了改名去动 compose。

> h3 的 `readMultipartFormData` 会把整个请求读进内存（见 `node_modules/h3/dist/index.mjs`），25MB 是上限；nginx 端也要限 body。视频再大就需要改流式上传，当前两人站不需要。

#### P2.2 新增开发环境静态服务 `server/routes/uploads/[...path].get.ts`

生产由 nginx `alias` 直接服务 `/uploads/`；本地 `npm run dev` 时 Nitro 需要能读到 `.data/uploads`，否则上传后图片 404。

```ts
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { sendStream } from 'h3'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
}

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  const config = useRuntimeConfig()
  const base = resolve(String(config.uploadsDir || join(process.cwd(), '.data/uploads')))
  const target = resolve(base, path)
  if (!target.startsWith(base + sep)) throw createError({ statusCode: 400 })
  const info = await stat(target).catch(() => null)
  if (!info?.isFile()) throw createError({ statusCode: 404 })
  setHeader(event, 'Content-Type', MIME[extname(target).toLowerCase()] || 'application/octet-stream')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return sendStream(event, createReadStream(target))
})
```

> 生产环境 nginx 的 `location /uploads/` 会优先命中，不会走到这里；这个路由主要给 `npm run dev` 用。

#### P2.3 改 `server/api/media/delete.post.ts`

去掉所有 Supabase Storage 逻辑，改为本地 `unlink`：

```ts
import { unlink } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { requireUnlocked } from '~/server/utils/require-unlock'

export default defineEventHandler(async (event) => {
  requireUnlocked(event)
  const body = await readBody<{ paths?: unknown }>(event)
  const paths = Array.isArray(body.paths)
    ? body.paths
        .filter((p): p is string => typeof p === 'string')
        .map((p) => p.trim())
        .filter((p) => p && !p.includes('..') && p.length <= 512)
        .slice(0, 20)
    : []
  if (!paths.length) throw createError({ statusCode: 400, statusMessage: '没有需要删除的文件' })

  const config = useRuntimeConfig()
  const base = resolve(String(config.uploadsDir || join(process.cwd(), '.data/uploads')))
  let removed = 0
  for (const p of paths) {
    const target = resolve(base, p)
    if (!target.startsWith(base + sep)) continue
    try {
      await unlink(target)
      removed++
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err
    }
  }
  return { ok: true, removed }
})
```

#### P2.4 改 `composables/useMediaUpload.ts`

```ts
async function upload(file: File) {
  const kind = file.type.startsWith('video') ? 'video' : 'image'
  const finalFile = kind === 'image' ? await compressImage(file) : file

  const form = new FormData()
  form.append('file', finalFile, finalFile.name)
  const res = await $fetch<{ url: string; path: string }>('/api/upload', {
    method: 'POST',
    body: form,
  })
  return { url: res.url, kind, path: res.path }
}
```

`remove()` / `removeUrl()` 保持不变，但依赖 P2.5 的路径解析。

#### P2.5 改 `utils/storage.ts`

```ts
export function extractStoragePath(url: string): string | null {
  // 新：本地上传
  if (url.startsWith('/uploads/')) {
    return decodeURIComponent(url.slice('/uploads/'.length))
  }
  // 旧：Supabase 公链（历史数据改写前仍可能残留）
  const marker = '/storage/v1/object/public/media/'
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}
```

> 不要用 `url.includes('/uploads/')`，否则外链 `https://other.com/uploads/x.jpg` 会被误删。

#### P2.6 新增 `composables/usePolling.ts`

统一 30 秒轮询，页面隐藏时跳过请求、回到前台立即刷新，避免 11 个 composable 各写一套。

```ts
import { onMounted, onUnmounted } from 'vue'

export function usePolling(
  fetchAll: () => void | Promise<void>,
  interval = 30_000,
) {
  let timer: ReturnType<typeof setInterval> | null = null

  function refreshIfVisible() {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    void fetchAll()
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') void fetchAll()
  }

  onMounted(() => {
    void fetchAll()
    timer = setInterval(refreshIfVisible, interval)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    timer = null
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })
}
```

然后每个 composable：

1. 删除 `let channel`、`supabase.channel(...)`、`removeChannel`；
2. 把原来的 `onMounted(() => { fetchAll(); ...channel... })` 整段替换为 `usePolling(fetchAll)`（它内部会做首次拉取）；
3. **每个写操作成功后 `await fetchAll()`**（这是最容易漏的一步）；
4. 清理不再使用的 `onUnmounted` / `onMounted` 导入，否则 `npm run lint` 会报未使用变量。

以 `useGoals` 为例：

```ts
usePolling(fetchAll)

async function addGoal(title: string) {
  if (!title.trim()) return
  const { error } = await supabase.from('goals').insert({ title: title.trim(), done: false })
  if (error) throw error
  await fetchAll() // 不再有 Realtime，自己刷新
}
```

> 11 个文件都要做；`useNotes.removeNote` / `useMedia.removeMedia` 还要注意先完成图片清理再 `fetchAll()`。

#### P2.7 改 `server/utils/supabase-admin.ts`

容器内 `127.0.0.1` 指向 app 自己，不是宿主机。加一个内网 URL：

```ts
const config = useRuntimeConfig()
// 内网地址直接指向 PostgREST 根；公网地址才需要 Supabase 风格的 /rest/v1 前缀
const internalUrl = (config.supabaseInternalUrl as string) || ''
const url =
  internalUrl ||
  (config.public.supabase.url as string) ||
  process.env.NUXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
// ...
const restPath = internalUrl ? `/${path}` : `/rest/v1/${path}`
return await $fetch(`${url.replace(/\/$/, '')}${restPath}${query}`, { /* ... */ })
```

`.env` 里设 `NUXT_SUPABASE_INTERNAL_URL=http://forus-rest:3000`（compose 同网络的服务名，容器端口是 3000）。若服务名不同，用 `docker exec forus-app wget -qO- http://<服务名>:3000/` 先验证。

> 关键：PostgREST 的 API 根是 `/`。内网地址 `http://forus-rest:3000` 后**不能**再拼 `/rest/v1`；公网地址 `https://forus.../db` 后必须拼（由 nginx 剥成 `/`）。2026-11-14 切源时就是漏了这一点，导致信件/小猫 404。

> 也可以继续让服务端走公网 nginx（`https://forus.../db`），但会有一次 TLS 回环；内网直连更快、故障面更小。

#### P2.8 P2 验收（仍连云端时）

- [ ] `npm run build` / `typecheck` / `test` / `lint` 全过
- [ ] 上传一张图：数据库 `media.url` 变成 `/uploads/<uuid>.jpg`，页面能显示，文件落在 `/opt/forus/uploads`（或本地 `.data/uploads`）
- [ ] 删除该媒体：数据库行删除，磁盘文件消失
- [ ] 留言发图片、删留言：同上
- [ ] 同设备写操作**立即**出现在界面（验证 `fetchAll()`）
- [ ] 另一台设备 30 秒内看到变化（验证轮询）
- [ ] 浏览器 Network 中不再出现 `/storage/v1` 上传请求；`/realtime/v1` 不再有 WebSocket（P2 上线后）

---

### P3 nginx 暴露 `/db` 与 `/uploads`（无停机）

在现有 `server` 块里加三处配置。注意 `map` 只在需要按方法分流时使用；单 PostgREST 方案不需要。

```nginx
server {
    server_name forus.los-theseus.site;

    # 上传经 Nitro 转发，默认 1m 会 413
    client_max_body_size 30m;

    # PostgREST（同源，无 CORS 预检）
    # 注意：PostgREST 的 API 根是 /，supabase-js 会请求 /db/rest/v1/<table>，
    # 所以 location 必须匹配 /db/rest/v1/ 并把它整个剥掉。
    location /db/rest/v1/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
    }

    # 本地上传文件
    location /uploads/ {
        root /opt/forus;          # /uploads/x → /opt/forus/uploads/x
        try_files $uri =404;
        expires 7d;
        add_header X-Content-Type-Options nosniff;
        # 防止直接打开被上传的 SVG/HTML 在本站执行脚本
        add_header Content-Security-Policy "sandbox";
    }

    location / {
        proxy_pass http://127.0.0.1:8081;
        # ... 保留现有配置
    }
}
```

- `location /db/rest/v1/` 的 `proxy_pass` 末尾有 `/`，会把 `/db/rest/v1/notes` 改写成 `/notes`（PostgREST API 根是 `/`）。
- 服务器实际配置：`/etc/nginx/sites-enabled/los-theseus-services.conf`（`sites-available` 已同步）。改动前备份到 `/root/nginx-backups/`；不要把 `.bak` 留在 `sites-enabled`，否则会被当成第二个 server 块加载。
- 若以后仍想做「GET 走只读实例」，用 `map` 变量；**不要**在 `limit_except` 里写 `proxy_pass`（nginx 容易直接报 `proxy_pass directive is not allowed here`）：

```nginx
# http 上下文
map $request_method $forus_db_upstream {
    default http://127.0.0.1:3002;
    GET     http://127.0.0.1:3001;
    HEAD    http://127.0.0.1:3001;
}
# location /db/rest/v1/ 内
rewrite ^/db/rest/v1/(.*)$ /$1 break;
proxy_pass $forus_db_upstream;
```

配置检查与生效：

```bash
sudo nginx -t && sudo systemctl reload nginx

# 公网验证
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "apikey: $APP" -H "Authorization: Bearer $APP" \
  'https://forus.los-theseus.site/db/rest/v1/notes?select=id&limit=1'
# 期望 200；不带 token 期望 401/403
```

> P3 完成后、P5 之前，前端仍用云端 URL，所以公开 `/db` 不会立刻产生流量；可以先放着。

**2026-11-14 实测结果**：公网 `/db/rest/v1/notes` 无 token → `401`；app JWT 读 notes → `200`；app JWT 读 letters → `403`；service JWT 读 letters → `200`；公网插入/删除 notes → `201` / `204`。公网 `/uploads/<file>` → `200`，响应带 `Content-Security-Policy: sandbox`、`X-Content-Type-Options: nosniff`、`Cache-Control: max-age=604800`。

---

### P4 数据导入（维护窗口第 1 步）

#### P4.1 停写

```bash
# 1) 通知两人暂停操作
# 2) 停应用，避免窗口内新写入
docker compose stop forus-app
# 3) 可选：停 PostgREST，避免导入期间外部读写
docker compose stop forus-rest forus-rest-write
```

#### P4.2 备份

```bash
docker exec forus-db pg_dump -U postgres --clean --if-exists forus | gzip \
  > /opt/backup/forus-pre-migration-$(date +%F-%H%M).sql.gz
```

#### P4.3 导入

```bash
set -euo pipefail
EXPORT=/opt/backup/supabase-export
DB=forus-db
PG="docker exec -i $DB psql -U postgres -d forus -v ON_ERROR_STOP=1"

# 1) 清空 15 张表（memo_comments 依赖 memos，CASCADE 兜底）
$PG -c "
truncate table
  public.memo_comments, public.memos, public.milestones, public.goals,
  public.notes, public.media, public.likes, public.adores, public.dislikes,
  public.pokes, public.calendar_marks, public.pushbacks,
  public.letters, public.diaries, public.cat_messages
restart identity cascade;"

# 2) 按外键顺序导入（memos 必须在 memo_comments 之前）
#    用 pg_read_file 让 Postgres 直接读容器内 /tmp 的 JSON，
#    避免把大段 JSON 拼进 shell/SQL（pg_read_file 需要 superuser，postgres 即是）
for t in milestones goals memos memo_comments notes media likes adores \
         dislikes pokes calendar_marks pushbacks letters diaries cat_messages; do
  echo "== import $t"
  docker cp "$EXPORT/$t.json" "$DB:/tmp/$t.json"
  $PG -c "
    insert into public.$t
    select * from json_populate_recordset(
      null::public.$t,
      pg_read_file('/tmp/$t.json')::json
    );"
  docker exec "$DB" rm -f "/tmp/$t.json"
done

# 3) 统计与索引
$PG -c "analyze;"
```

> `diaries` 在代码中没有使用；若本地库根本没有这张表，把 `diaries` 从 `TRUNCATE` 列表和导入循环里去掉即可（其余 14 张表不受影响）。

> 如果执行角色不是 superuser、`pg_read_file` 被禁用，可退回 `\set` + `docker cp` 的方式：
> `psql -f /tmp/import.sql`，文件内容为 ``\set content `cat /tmp/notes.json` `` 加 `insert ... :'content'`。
> **不要**用 `psql -c "insert ... :'content'"`：`-c` 不处理 psql 自定义变量，会直接 SQL 语法错误。

#### P4.4 校验行数与最新时间

```bash
EXPORT=/opt/backup/supabase-export
TABLES="notes likes adores calendar_marks pokes cat_messages media memos goals letters milestones pushbacks dislikes diaries memo_comments"
for t in $TABLES; do
  cloud=$(jq 'length' "$EXPORT/$t.json")
  dblocal=$(docker exec forus-db psql -At -U postgres -d forus -c "select count(*) from public.$t")
  printf '%-16s cloud=%-5s local=%-5s %s\n' "$t" "$cloud" "$dblocal" \
    "$([ "$cloud" = "$dblocal" ] && echo OK || echo MISMATCH)"
done
```

再抽查时间：

```sql
select max(created_at) from public.notes;        -- 应等于云端当前最新
select max(created_at) from public.cat_messages;
select max(created_at) from public.media;
```

#### P4.5 改写图片 URL（两处！）

```sql
-- media.url
update public.media
set url = '/uploads/' || split_part(url, '/object/public/media/', 2)
where url like 'https://%supabase.co/storage/v1/object/public/media/%';

-- notes.image_url（容易漏）
update public.notes
set image_url = '/uploads/' || split_part(image_url, '/object/public/media/', 2)
where image_url like 'https://%supabase.co/storage/v1/object/public/media/%';

-- 应全部为 0
select count(*) from public.media where url like '%supabase.co%';
select count(*) from public.notes where image_url like '%supabase.co%';

-- 应等于 media 行数（外链除外）
select count(*) from public.media where url like '/uploads/%';
```

> 不要用 `^.*/media/` 这种贪婪正则：它会误伤路径里带 `/media/` 的外链；`split_part(..., '/object/public/media/', 2)` 只匹配 Supabase 存储前缀。

#### P4.6 拷贝历史图片

```bash
sudo rsync -a /opt/backup/supabase-export/storage/ /opt/forus/uploads/
sudo chown -R "$(docker exec forus-app id -u):$(docker exec forus-app id -g)" /opt/forus/uploads

# 文件数应 ≥ 29
find /opt/forus/uploads -type f | wc -l

# 若 storage-names.txt 里出现过子目录（如 a/b.jpg），确认 storage/ 保留了层级
head -5 /opt/backup/supabase-export/storage-names.txt
```

随机抽查 3 个 `media.url` 对应的文件存在：

```bash
docker exec forus-db psql -At -U postgres -d forus -c \
  "select url from public.media where url like '/uploads/%' limit 3"
# 逐个 test -f /opt/forus/uploads/<文件名>
```

#### P4.7 重载 PostgREST

```bash
docker exec forus-db psql -U postgres -d forus -c "notify pgrst, 'reload schema';"
```

重启 PostgREST（若它是停着的）：

```bash
docker compose up -d forus-rest
```

**2026-11-14 演练结果**

- 使用 `/opt/backup/supabase-export/` 的 20:07 导出导入本地库；15 表行数与导出完全一致（notes 157、likes 93、adores 90、calendar_marks 89、pokes 71、cat_messages 56、media 26、memos 15、goals 10、letters 7、milestones 6、pushbacks 5、dislikes 2、diaries 1、memo_comments 1）。
- `media.url` 改写 26 行、`notes.image_url` 改写 1 行；残留 Supabase 公链 0。
- 图片复制后 `/opt/forus/uploads` 共 30 个文件；抽查 3 张公网访问均 200。
- 导入前本地库备份：`/opt/backup/forus-pre-import-2026-11-14-2048.sql.gz`。
- 20:53 重新导出（脚本 `/opt/backup/supabase-export/export.sh`，输出 `/opt/backup/supabase-export-fresh/`）：notes 159、pokes 72、storage 30 个文件，说明 20:07 之后有新写入；最终切源必须用这份新导出。
- **最终 P5 切源前必须重新导出云端最新数据并再次导入**（两次导出间隔内的新写入不会自动同步）；再次 `TRUNCATE` 需要明确确认。

---

### P5 切换数据源（维护窗口第 2 步）

#### P5.1 改 `.env`

**先备份云端配置，再改文件**（回退时直接覆盖）：

```bash
cp /opt/forus/.env /opt/forus/.env.cloud        # 保留云端 URL / anon key / service key
cp /opt/forus/.env /opt/forus/.env.pre-pg       # 双保险
```

```dotenv
# 浏览器直连（同源）
SUPABASE_URL=https://forus.los-theseus.site/db
NUXT_PUBLIC_SUPABASE_URL=https://forus.los-theseus.site/db
SUPABASE_KEY=<APP_JWT>
NUXT_PUBLIC_SUPABASE_KEY=<APP_JWT>

# 服务端（只在 server runtime 可见）
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_JWT>
NUXT_SUPABASE_INTERNAL_URL=http://forus-rest:3000

# 本地上传目录（容器内路径；对应宿主机 /opt/forus/uploads）
# 现有 compose 用单数 NUXT_UPLOAD_DIR，代码两种都认
NUXT_UPLOADS_DIR=/data/uploads
```

#### P5.2 强制重建

环境变量变化后必须重建容器（`restart` 不一定重新读 env）：

```bash
docker compose up -d --force-recreate forus-app
docker compose logs -f --tail=100 forus-app
```

> 若用 `update.sh` 部署代码，注意它要求工作区干净；先把本次代码改动提交，再执行 `bash update.sh`。环境变量改动可单独 `force-recreate`。

#### P5.3 冒烟

```bash
APP=<APP_JWT>; SERVICE=<SERVICE_JWT>; BASE=https://forus.los-theseus.site

# 读
curl -s -o /dev/null -w 'read=%{http_code}\n' \
  -H "apikey: $APP" -H "Authorization: Bearer $APP" \
  "$BASE/db/rest/v1/notes?select=id&limit=1"

# 写（插入后拿到 id 再删）
curl -s -H "apikey: $APP" -H "Authorization: Bearer $APP" \
  -H 'Content-Type: application/json' -H 'Prefer: return=representation' \
  -d '{"author":"migration-test","kind":"text","text":"ping"}' \
  "$BASE/db/rest/v1/notes?select=id"

# 敏感表：app 拒绝，service 通过
curl -s -o /dev/null -w 'letters-app=%{http_code}\n' \
  -H "apikey: $APP" -H "Authorization: Bearer $APP" \
  "$BASE/db/rest/v1/letters?select=id&limit=1"
curl -s -o /dev/null -w 'letters-service=%{http_code}\n' \
  -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" \
  "$BASE/db/rest/v1/letters?select=id&limit=1"

# 无 token
curl -s -o /dev/null -w 'anon=%{http_code}\n' \
  "$BASE/db/rest/v1/notes?select=id&limit=1"
```

浏览器里再点一遍：解锁 → 首页 → 留言 → 图片墙 → 目标 → 备忘录 → 信件 → 小猫 → 日历。Network 中不应再出现 `*.supabase.co`。

**2026-11-14 21:00 切源记录**

- 停机窗口约 9 分钟（20:54–21:03，其中包含一次内部 URL 修复与重新部署）。
- 最终导出：`/opt/backup/supabase-export-final/`，notes 159、likes 93、adores 90、calendar_marks 89、pokes 72、cat_messages 56、media 26、memos 15、goals 10、letters 7、milestones 6、pushbacks 5、dislikes 2、diaries 1、memo_comments 1；Storage 30 个文件。
- 本地库导入后 15 表行数全部一致；`media.url` 改写 26 行、`notes.image_url` 改写 1 行，残留 Supabase 公链 0。
- 应用环境：`SUPABASE_URL=https://forus.los-theseus.site/db`、`NUXT_SUPABASE_INTERNAL_URL=http://forus-rest:3000`。
- 验证：`/api/health` 200；`/api/cat-messages` 56 条；`/api/letters?identity=you` 7 封；公网 `/db/rest/v1/notes` 159 条、`pokes` 72 条；上传/访问/删除均 200。
- 浏览器端公共配置已确认：`NUXT_PUBLIC_SUPABASE_URL=https://forus.los-theseus.site/db`，首页 HTML 中无 `supabase.co`。
- 备份：`/opt/backup/forus-pre-final-import-2026-11-14-2054.sql.gz`、`/opt/backup/forus-post-migration-2026-11-14-2103.sql.gz`、对应 uploads tar；配置备份在 `/opt/backup/forus-config/`。
- 已安装每日备份 cron（04:30 数据库、04:40 图片、04:50 清理 14 天前）。

**回退到云端**：

```bash
cp /opt/backup/forus-config/.env.pre-switch-2026-11-14-2101 /opt/forus/.env
# 同时把 docker-compose.yml 里临时加的 NUXT_SUPABASE_INTERNAL_URL 保留也无害
cd /opt/forus && docker compose up -d --force-recreate forus-app
```

**本次踩坑记录**：

- PostgREST 的 API 根是 `/`，不是 `/rest/v1`；nginx 必须匹配 `/db/rest/v1/` 并整个剥掉，`adminRest` 走内网时也不能追加 `/rest/v1`。
- 远程 heredoc 里用 `docker exec -i psql` 会吞掉脚本 stdin，导入循环会停在第一条；改用不带 `-i` 的 `docker exec`。
- `update.sh` 要求仓库目录干净；服务器上的 `.env.pre-*`、`docker-compose.yml.*` 备份要移到 `/opt/backup/forus-config/`，密钥文件加入 `.git/info/exclude`。

---

### P6 验收与收尾

#### P6.1 功能验收

- [ ] 首页 notes 157 条（以当天导出数为准），最新时间与云端一致
- [ ] 留言：文字/图片发送、删除；同设备立即显示，另一设备 30 秒内同步
- [ ] 媒体墙：历史上传 26 条全部能显示；新上传/编辑/删除正常，磁盘文件同步变化
- [ ] 留言里的历史图片（`notes.image_url`）全部能显示
- [ ] 点赞、戳一戳、日历、目标、备忘录/评论、Adore、不喜欢、信、小猫逐项过一遍
- [ ] 信件：未到期收件人看不到正文；service JWT 正常；app JWT 无法直接访问
- [ ] `/api/cat-messages` 解锁后 200，小猫能多轮对话
- [ ] 手机端打开、上传、横竖屏正常
- [ ] `/calendar`、`/push` 隐藏路由正常
- [ ] DevTools：无 `/realtime/v1` WebSocket、无 `/storage/v1` 请求、无 `supabase.co` 请求
- [ ] 上传后直接访问 `https://forus.../uploads/<file>` 能打开；带 `X-Content-Type-Options: nosniff`
- [ ] 上传一个 `.html` / `.svg` 被接口拒绝（400）
- [ ] `npm run build` / `typecheck` / `test` / `lint` 全过
- [ ] **最终验收：在 Supabase 控制台暂停项目，或在本机 hosts/DNS 屏蔽 `*.supabase.co`，整站仍正常**

#### P6.2 备份

```bash
# 迁移后基线
docker exec forus-db pg_dump -U postgres forus | gzip \
  > /opt/backup/forus-post-migration-$(date +%F-%H%M).sql.gz
sudo tar czf /opt/backup/forus-uploads-$(date +%F).tar.gz -C /opt/forus uploads
```

建议加一个每日 cron（保留 14 天）：

```cron
30 4 * * * docker exec forus-db pg_dump -U postgres forus | gzip > /opt/backup/forus-daily-$(date +\%F).sql.gz
40 4 * * * tar czf /opt/backup/forus-uploads-$(date +\%F).tar.gz -C /opt/forus uploads
```

#### P6.3 文档与代码同步

迁移完成后更新以下文件，避免后来者按旧架构排查：

- `README.md`：技术栈、环境变量、数据库初始化章节
- `AGENTS.md`：Supabase 描述、`server/utils/supabase-admin.ts`、实时/轮询、`/api/upload`
- `docs/architecture.md`：数据流图、Realtime → 轮询、Storage → 本地上传
- `docs/database.md`：新增角色/JWT、RLS 矩阵、导入/备份步骤
- `docs/security.md`：威胁模型（本地 JWT、`/db` 暴露面、上传同源 XSS）
- `docs/deployment.md`：环境变量表、nginx `/db` 与 `/uploads`、`client_max_body_size`
- `update.sh`：删掉「数据存放在 Supabase」的输出与注释
- `.env.example`：换成自建 Postgres 示例，云端配置注释保留
- `docs/archive/261114/README.md`：把 16 的状态从「待执行」改为「已完成」
- 本文档：更新第 8 节进度表

#### P6.4 观察一周后下线云端

- 稳定运行 7 天、每日备份正常后，再把 Supabase 项目暂停/删除。
- 删除前确认：导出 JSON + Storage 文件已另存（建议再打包一份到本机或对象存储）。
- 云端项目删除后，`SUPABASE_URL` 等旧值从 `.env.cloud` 移除，避免误回退到不存在的地址。

---

## 6. 回退方案

### 6.1 单阶段回退

| 阶段 | 回退动作 |
|---|---|
| P1 | 不改线上；角色/JWT 配错只影响本地验证 |
| P2 | `git revert` 代码改动 → `bash update.sh`；上传文件保留在 `/opt/forus/uploads` 不丢 |
| P3 | 注释掉 nginx `/db`、`/uploads` → `nginx -t && reload`；上传接口仍可用 |
| P4 | 用 P4.2 的 dump 恢复：先停 PostgREST/app，`zcat ... \| psql`；图片目录不动 |
| P5 | `.env` 换回 `.env.cloud` → `docker compose up -d --force-recreate forus-app` |

### 6.2 总开关

```bash
# 数据源切回云端（保留本地库不动）
cp /opt/forus/.env.cloud /opt/forus/.env
cd /opt/forus && docker compose up -d --force-recreate forus-app

# 本地库被写坏时恢复
docker compose stop forus-app forus-rest forus-rest-write
zcat /opt/backup/forus-pre-migration-*.sql.gz \
  | docker exec -i forus-db psql -U postgres -d forus
docker compose up -d forus-rest forus-app
```

> 恢复前先停 PostgREST，避免 idle 连接阻塞 `DROP/TRUNCATE`；必要时
> `select pg_terminate_backend(pid) from pg_stat_activity where datname='forus' and pid <> pg_backend_pid();`

云端项目在迁移完成并稳定一周前**不要删除**，它随时是兜底。

---

## 7. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 迁移窗口内有人写入导致数据分叉 | 新数据丢失 | 停 `forus-app` 后再导入；导入前重跑一次云端导出 |
| 灌数据出错把本地库写坏 | 站点不可用 | 先 `pg_dump`；出问题 5 分钟内恢复 |
| `forus_app` 与旧 policy `to anon` 不匹配 | 前端全部 403 | P1.2 为 `forus_app` 建策略并验证 |
| 浏览器只有一把 key，却按读写分双实例 | 所有写操作失败 | 采用单 PostgREST + `forus_app`；不要用只读 key |
| service JWT 配错/权限不足 | 信件、小猫、服务端接口 500/403 | P1.2 给 `forus_service` `BYPASSRLS` + 全表 grant；P1.4 curl 验证 |
| `adminRest` 在容器内用 `127.0.0.1` | 连到自己，接口全挂 | 用 compose 服务名 `http://forus-rest:3000` |
| nginx 默认 1m body | 图片/视频上传 413 | `client_max_body_size 30m`；接口 25MB 上限 |
| 改成轮询后自己的操作不刷新 | 体验像卡住 | 每个写操作后 `fetchAll()`；`usePolling` 回前台立即刷新 |
| 轮询请求过多 | DB/电量压力 | 30 秒 + 页面隐藏暂停；两人站可接受 |
| 历史图片没拷贝/URL 没改写 | 图片 404 | P4.5 两处 URL + P4.6 文件数校验 |
| `utils/storage.ts` 不认 `/uploads/` | 删图后文件残留 | P2.5 同时支持本地与旧 Supabase 前缀 |
| 上传 HTML/SVG 同源执行 | XSS | 扩展名白名单、`nosniff`、CSP `sandbox`；不开放 SVG |
| `/db` 公网暴露 + JWT 泄露 | 陌生人可读写公开业务表 | 与现状 anon key 等价，属可接受风险；service JWT 绝不外泄；可加 nginx `limit_req` |
| PostgREST schema cache 过期 | 新表/新列 404 | 每次 DDL 后 `notify pgrst, 'reload schema'` |
| 仓库 SQL 直接灌本地 | `anon` 角色/publication/storage schema 报错 | 只做列级 diff；本地角色与策略按 P1.2 单独执行 |
| 实时改轮询体验下降 | 非当前设备最多 30 秒延迟 | 接受；后续可上 `LISTEN/NOTIFY` + SSE |
| 回退到云端后新图片在本地 | 云端页面仍能显示（同源 `/uploads`） | P2 的改动对云端数据源同样兼容，回退不丢图 |

---

## 8. 进度记录

| 阶段 | 状态 | 完成时间 | 备注 |
|---|---|---|---|
| P0 数据导出 | ✅ 完成 | 2026-11-14 20:10 | 15 表 196K + 29 文件 8.2M，在 `/opt/backup/supabase-export/`；执行当天需重跑 |
| P1 准备（schema/角色/JWT/PostgREST） | ✅ 完成 | 2026-11-14 20:45 | 角色 + GRANT（RLS 保持关闭）；两把 JWT 在 `/opt/forus/.pg-jwt.env`；PostgREST 改为 authenticator + JWT |
| P2 代码改造（上传/删除/轮询） | ✅ 完成并部署 | 2026-11-14 20:43 | commit `050cde5`；`update.sh` 通过 L1–L5；服务器上传/删除冒烟通过 |
| P3 nginx 暴露 `/db` `/uploads` | ✅ 完成 | 2026-11-14 20:47 | `/db/rest/v1/` → 3001；`/uploads/` 静态；公网鉴权矩阵与上传冒烟通过 |
| P4 数据导入 | ✅ 完成 | 2026-11-14 21:00 | 最终导出 notes 159 / pokes 72 / storage 30；15 表行数一致；URL 与图片已本地化 |
| P5 切换数据源 | ✅ 完成 | 2026-11-14 21:03 | `.env` 指向本地 PostgREST；app 重建；cat/letters/上传验证通过；云端保留回退 |
| P6 验收与收尾 | 🟨 进行中 | | 自动化链路已验证；浏览器逐页点检、文档同步待做；云端保留一周 |

---

## 9. 决策（v2 建议默认值）

| 问题 | 建议 | 理由 |
|---|---|---|
| 停站窗口安排 | 选两人都不在线的一段，10–20 分钟 | P2/P3 已提前完成，窗口只剩导入 + 切 env |
| 实时同步 | 接受 30 秒轮询 | 两人站足够；SSE 额外半天，收益有限 |
| 写权限模型 | **单 PostgREST + 单 `forus_app` 角色** | 浏览器只有一把 key，双实例不产生真实隔离 |
| 是否保留 `forus-rest-write` | 停掉或留作备机 | 减少一套 JWT/配置漂移 |
| 云端项目何时删 | 稳定运行 7 天后 | 随时可回退 |
| 是否把全部 CRUD 收口到 Nitro | 暂不做 | 工作量大，且会失去现有直连的简单性；以后要「真正锁死」再做 |

---

## 附录 A：关键文件改动清单

**新增**

- `server/api/upload.post.ts`
- `server/routes/uploads/[...path].get.ts`
- `server/utils/uploads-dir.ts`
- `composables/usePolling.ts`
- `tests/storage.test.ts`

**修改**

- `nuxt.config.ts`（`uploadsDir`、`supabaseInternalUrl`）
- `server/api/media/delete.post.ts`
- `server/utils/supabase-admin.ts`
- `composables/useMediaUpload.ts`
- `utils/storage.ts`
- `composables/useNotes.ts`
- `composables/useMedia.ts`
- `composables/useLikes.ts`
- `composables/useAdores.ts`
- `composables/useMemo.ts`
- `composables/useMemoComments.ts`
- `composables/useMilestones.ts`
- `composables/usePushbacks.ts`
- `composables/useCalendar.ts`
- `composables/useGoals.ts`
- `composables/useDislikes.ts`
- `.env.example`（迁移后）
- `README.md` / `AGENTS.md` / `docs/*.md` / `update.sh`（P6）

## 附录 B：服务器端配置速查

```dotenv
# 浏览器
SUPABASE_URL=https://forus.los-theseus.site/db
NUXT_PUBLIC_SUPABASE_URL=https://forus.los-theseus.site/db
SUPABASE_KEY=<forus_app JWT>
NUXT_PUBLIC_SUPABASE_KEY=<forus_app JWT>

# 服务端
SUPABASE_SERVICE_ROLE_KEY=<forus_service JWT>
NUXT_SUPABASE_INTERNAL_URL=http://forus-rest:3000

# 上传
NUXT_UPLOADS_DIR=/data/uploads
```

```yaml
# forus-rest
environment:
  PGRST_DB_URI: postgres://authenticator:强密码@forus-db:5432/forus
  PGRST_DB_SCHEMAS: public
  PGRST_DB_ANON_ROLE: forus_noaccess
  PGRST_JWT_SECRET: ${PGRST_JWT_SECRET}
  PGRST_SERVER_PORT: 3001
```

## 附录 C：验证命令合集

```bash
APP=<APP_JWT>; SERVICE=<SERVICE_JWT>; BASE=https://forus.los-theseus.site

# 读
curl -s -o /dev/null -w '%{http_code}\n' -H "apikey: $APP" -H "Authorization: Bearer $APP" \
  "$BASE/db/rest/v1/notes?select=id&limit=1"

# 写（return=representation 会回传插入行）
curl -s -H "apikey: $APP" -H "Authorization: Bearer $APP" \
  -H 'Content-Type: application/json' -H 'Prefer: return=representation' \
  -d '{"author":"migration-test","kind":"text","text":"ping"}' \
  "$BASE/db/rest/v1/notes?select=id"

# 敏感表
curl -s -o /dev/null -w 'app=%{http_code}\n' -H "apikey: $APP" -H "Authorization: Bearer $APP" \
  "$BASE/db/rest/v1/letters?select=id&limit=1"
curl -s -o /dev/null -w 'service=%{http_code}\n' -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" \
  "$BASE/db/rest/v1/letters?select=id&limit=1"

# 无 token
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/db/rest/v1/notes?select=id&limit=1"

# 上传目录
curl -sI "$BASE/uploads/<uuid>.jpg" | head -20
```

---

## 附录 D：常见故障对照

| 现象 | 排查 |
|---|---|
| 页面能开，所有列表 401/403 | JWT 的 `role` 是否是 `forus_app`；`PGRST_JWT_SECRET` 是否与签发时一致；策略/GRANT 是否生效 |
| 读正常、写 403 | `forus_app` 没有 INSERT/UPDATE/DELETE grant，或没有 `for all` 策略 |
| 信件/小猫 500「缺少 SUPABASE_SERVICE_ROLE_KEY」 | `SUPABASE_SERVICE_ROLE_KEY` 是否填了 service JWT；是否误加 `NUXT_PUBLIC_` 前缀 |
| 信件/小猫 403/空 | `forus_service` 没有 `BYPASSRLS` 或表 grant；`PGRST_DB_ANON_ROLE` 配错 |
| 上传 413 | nginx `client_max_body_size`；或文件超 25MB |
| 上传 200 但图片 404 | `/opt/forus/uploads` 与容器 `/data/uploads` 是否同一挂载；nginx `root` 路径；文件名是否改写 |
| 删除记录后文件仍在 | `utils/storage.ts` 是否支持 `/uploads/`；`/api/media/delete` 是否拿到正确 paths |
| 自己操作不刷新 | 写操作后是否 `await fetchAll()` |
| 另一台设备不刷新 | 轮询是否启动；页面是否隐藏；是否有 JS 报错 |
| 图片仍是 `supabase.co` 公链 | P4.5 是否同时改了 `media.url` 与 `notes.image_url` |
| 部署后仍连云端 | 是否 `--force-recreate`；`NUXT_PUBLIC_SUPABASE_URL` 是否覆盖了旧值；浏览器缓存/Service Worker |
| 回退后新图打不开 | `/uploads` 是否仍由 nginx 服务（与数据源无关） |
