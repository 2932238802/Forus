# 01 · SQL 脚本幂等化

- 优先级：P2（运维健壮性）
- 类型：数据库脚本
- 依赖：无
- 影响文件：`supabase/*.sql`

## 问题

当前脚本不能安全重跑：

1. `alter publication supabase_realtime add table ...` 在表已加入时会报 `duplicate_object`，导致脚本中断。
2. `schema.sql` 末尾无条件插入「我们在一起」，每执行一次多一条。
3. `pages-tables.sql` 的 `create policy` 没有先 `drop`，第二次执行报「policy already exists」。
4. `storage.sql` 只 drop 了旧的 `auth *` 策略名，新的 `anon *` 策略重跑会冲突。
5. `upgrade-likes-category.sql` 的数据迁移没有执行标记，重跑可能把人工调整过的分类再次覆盖。

## 方案

### 1. 引入迁移标记表

在 `schema.sql` 开头创建：

```sql
create table if not exists public.schema_migrations (
  name text primary key,
  applied_at timestamptz default now()
);
```

一次性数据迁移（种子数据、旧 owner 迁移、分类预填）用 `do $$ ... $$` + 标记包裹，只执行一次。

### 2. publication 安全添加

所有 `alter publication ... add table` 改为幂等写法：

```sql
do $$
begin
  alter publication supabase_realtime add table public.notes;
exception
  when duplicate_object then null;
end $$;
```

涉及的脚本：`schema.sql`、`pages-tables.sql`、`adores.sql`、`dislikes.sql`、`letters.sql`、`pokes.sql`、`calendar.sql`、`pushbacks.sql`、`cat.sql`、`upgrade-memo-owner-comments.sql`。

### 3. 种子数据幂等

`schema.sql` 的初始里程碑改为：

```sql
insert into public.milestones (title, date, type, emoji)
select '我们在一起', '2026-06-22', 'anniversary', '🤍'
where not exists (
  select 1 from public.milestones
  where title = '我们在一起' and date = '2026-06-22'
);
```

### 4. policy 统一先 drop

`pages-tables.sql`、`storage.sql` 为每个 `create policy` 补对应的 `drop policy if exists`。
`storage.sql` 额外 drop 当前的 `anon upload/update/delete media` 三个策略名。

### 5. 一次性迁移加标记

- `upgrade-likes-category.sql` 的 owner 迁移与关键词预分类包进 `if not exists (select 1 from schema_migrations where name = '2026-likes-category')`。
- `upgrade-memo-owner-comments.sql` 的旧数据 owner 回填同样加标记。
- 新增迁移统一使用 `YYYYMMDD-描述` 命名，插入 `schema_migrations` 后提交。

## 验收标准

- [ ] 在全新 Supabase 项目中按 `docs/database.md` 顺序执行全部脚本，无报错。
- [ ] 在同一个项目中**再执行一遍**全部脚本，无报错、无重复里程碑、无策略冲突。
- [ ] `storage.sql` 重跑不报策略已存在。
- [ ] `docs/database.md` 的「已知的脚本坑」章节同步更新或删除。

## 风险与回滚

- 只改 SQL 文本，不影响现有数据；已部署环境重跑时可先备份。
- `do $$ ... exception when duplicate_object` 需要 Supabase SQL Editor 支持（Postgres 标准语法，支持）。
- 如果已有环境缺少 `schema_migrations`，脚本会先创建，不影响旧表。
