-- ============================================================
-- Forus 日历备注
-- 用法：Supabase SQL Editor 粘贴运行
-- ============================================================

create table if not exists public.calendar_marks (
  id uuid primary key default gen_random_uuid(),
  -- 日期 YYYY-MM-DD，一天一条备注（唯一）
  date date not null unique,
  text text not null default '',
  created_at timestamptz default now()
);

create index if not exists calendar_marks_date_idx on public.calendar_marks (date);

-- RLS：允许匿名读写（与其他表一致）
alter table public.calendar_marks enable row level security;
drop policy if exists "anon all calendar_marks" on public.calendar_marks;
create policy "anon all calendar_marks" on public.calendar_marks for all to anon using (true) with check (true);

-- 实时同步（新表，直接添加）
alter publication supabase_realtime add table public.calendar_marks;
