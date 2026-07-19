-- ============================================================
-- Forus 「回忆日记」
-- 用法：Supabase SQL Editor 粘贴运行
-- ============================================================

create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  -- 写下这段回忆的人（'you' / 'npy'）
  owner text not null,
  -- 回忆实际发生的日期；用于「那年今日」
  happened_on date not null,
  title text not null default '',
  content text not null,
  mood text not null default '🤍',
  -- 可选封面图，可填 Supabase Storage 公链或外部链接
  image_url text,
  created_at timestamptz default now()
);

create index if not exists diaries_happened_on_idx
  on public.diaries (happened_on desc);
create index if not exists diaries_owner_happened_on_idx
  on public.diaries (owner, happened_on desc);

-- 当前站点仍使用暗号门 + 匿名客户端访问；后续安全阶段会迁移至服务端 API 并收紧此策略。
alter table public.diaries enable row level security;
drop policy if exists "anon all diaries" on public.diaries;
create policy "anon all diaries" on public.diaries for all to anon using (true) with check (true);

alter publication supabase_realtime add table public.diaries;
