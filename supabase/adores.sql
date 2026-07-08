-- ============================================================
-- Forus 「Adore!!」— 对方的优点 / 很喜欢对方的地方（用于加固喜欢）
-- 用法：Supabase SQL Editor 粘贴运行
-- ============================================================

create table if not exists public.adores (
  id uuid primary key default gen_random_uuid(),
  -- 这条优点/喜欢是「记在谁身上」的身份 key（'you' / 'npy'）
  owner text not null,
  -- 优点 / 很喜欢的地方
  text text not null,
  created_at timestamptz default now()
);

create index if not exists adores_owner_idx
  on public.adores (owner, created_at);

-- RLS：允许匿名读写（与其他表一致，前端用暗号挡人）
alter table public.adores enable row level security;

drop policy if exists "anon all adores" on public.adores;
create policy "anon all adores" on public.adores for all to anon using (true) with check (true);

-- 实时同步（新表，直接添加即可）
alter publication supabase_realtime add table public.adores;
