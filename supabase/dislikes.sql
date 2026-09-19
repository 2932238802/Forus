-- ============================================================
-- Forus 「需要改进的地方」
-- 用法：Supabase SQL Editor 粘贴运行
-- ============================================================

create table if not exists public.dislikes (
  id uuid primary key default gen_random_uuid(),
  -- 这条记录记在谁身上（'you' / 'npy'）
  owner text not null,
  -- 希望对方改进的地方
  text text not null,
  created_at timestamptz default now()
);

create index if not exists dislikes_owner_idx
  on public.dislikes (owner, created_at);

alter table public.dislikes enable row level security;

drop policy if exists "anon all dislikes" on public.dislikes;
create policy "anon all dislikes" on public.dislikes for all to anon using (true) with check (true);

alter publication supabase_realtime add table public.dislikes;
