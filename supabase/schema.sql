-- ============================================================
-- Forus 数据库初始化脚本（共用暗号方案：允许匿名读写）
-- 用法：Supabase 后台 SQL Editor → 粘贴全部 → Run
-- ============================================================

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  type text not null default 'daily',
  emoji text default '🤍',
  created_at timestamptz default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  text text not null,
  created_at timestamptz default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'image',
  url text not null,
  title text,
  date date,
  created_at timestamptz default now()
);

-- ============================================================
-- 行级安全：允许匿名(anon)读写（前端用暗号挡人，数据库放开）
-- ============================================================
alter table public.milestones enable row level security;
alter table public.notes      enable row level security;
alter table public.media      enable row level security;

-- 先清理可能存在的旧策略，避免重复报错
drop policy if exists "auth read milestones"  on public.milestones;
drop policy if exists "auth write milestones" on public.milestones;
drop policy if exists "auth read notes"  on public.notes;
drop policy if exists "auth write notes" on public.notes;
drop policy if exists "auth read media"  on public.media;
drop policy if exists "auth write media" on public.media;

create policy "anon all milestones" on public.milestones for all to anon using (true) with check (true);
create policy "anon all notes"      on public.notes      for all to anon using (true) with check (true);
create policy "anon all media"      on public.media      for all to anon using (true) with check (true);

-- ============================================================
-- 实时同步
-- ============================================================
alter publication supabase_realtime add table public.milestones;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.media;

-- ============================================================
-- 初始数据：我们在一起（昨天）
-- ============================================================
insert into public.milestones (title, date, type, emoji)
values ('我们在一起', '2026-06-22', 'anniversary', '🤍');
