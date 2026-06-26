-- ============================================================
-- Forus 「给未来的信」
-- 用法：Supabase SQL Editor 粘贴运行
-- ============================================================

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  -- 写信人 / 收信人 身份 key（'you' / 'npy'）
  who_from text not null,
  who_to text not null,
  title text not null default '',
  content text not null,
  -- 解锁日期（这天 00:00 之后收信人可拆）
  unlock_date date not null,
  created_at timestamptz default now()
);

create index if not exists letters_to_idx
  on public.letters (who_to, unlock_date);

-- RLS：允许匿名读写（与其他表一致，前端用暗号挡人）
-- 注意：内容是否可见由前端按 unlock_date + 身份控制
alter table public.letters enable row level security;

drop policy if exists "anon all letters" on public.letters;
create policy "anon all letters" on public.letters for all to anon using (true) with check (true);

-- 实时同步（新表，直接添加即可）
alter publication supabase_realtime add table public.letters;
