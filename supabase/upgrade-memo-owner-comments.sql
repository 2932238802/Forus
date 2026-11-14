-- ============================================================
-- Forus 备忘录升级：分人 + 评论
-- 用法：Supabase SQL Editor 粘贴运行
-- 说明：本脚本可重复执行；数据回填用 schema_migrations 标记，只执行一次。
-- ============================================================

create table if not exists public.schema_migrations (
  name text primary key,
  applied_at timestamptz default now()
);

-- 1) memos 加归属字段 owner（身份 key：'you' / 'npy'）
alter table public.memos
  add column if not exists owner text not null default 'npy';

-- 2) 一次性数据回填：旧数据全部归「在野」(npy)
do $$
begin
  if not exists (
    select 1 from public.schema_migrations
    where name = '2026-11-14-memo-owner'
  ) then
    update public.memos set owner = 'npy' where owner is null or owner = '';
    insert into public.schema_migrations (name)
    values ('2026-11-14-memo-owner');
  end if;
end $$;

-- 3) 备忘录评论表
create table if not exists public.memo_comments (
  id uuid primary key default gen_random_uuid(),
  memo_id uuid not null references public.memos(id) on delete cascade,
  -- 评论者身份 key（'you' / 'npy'）
  author text not null,
  text text not null,
  created_at timestamptz default now()
);

create index if not exists memo_comments_memo_idx
  on public.memo_comments (memo_id, created_at asc);

-- RLS：允许匿名读写（与其他表一致）
alter table public.memo_comments enable row level security;

drop policy if exists "anon all memo_comments" on public.memo_comments;
create policy "anon all memo_comments" on public.memo_comments for all to anon using (true) with check (true);

-- 实时同步（可重复执行）
do $$
begin
  alter publication supabase_realtime add table public.memo_comments;
exception when duplicate_object then null;
end $$;
