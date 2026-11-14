-- ============================================================
-- Forus 附页：备忘录 / 目标 / 喜好兴趣（匿名读写）
-- 用法：Supabase SQL Editor 粘贴运行
-- ============================================================

-- 备忘录
create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  created_at timestamptz default now()
);

-- 目标
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  done boolean not null default false,
  created_at timestamptz default now()
);

-- 喜好
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  text text not null,
  created_at timestamptz default now()
);

-- RLS：允许匿名读写
alter table public.memos enable row level security;
alter table public.goals enable row level security;
alter table public.likes enable row level security;

drop policy if exists "anon all memos" on public.memos;
drop policy if exists "anon all goals" on public.goals;
drop policy if exists "anon all likes" on public.likes;

create policy "anon all memos" on public.memos for all to anon using (true) with check (true);
create policy "anon all goals" on public.goals for all to anon using (true) with check (true);
create policy "anon all likes" on public.likes for all to anon using (true) with check (true);

-- 实时同步（可重复执行）
do $$
begin
  alter publication supabase_realtime add table public.memos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.goals;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.likes;
exception when duplicate_object then null;
end $$;
