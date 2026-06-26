-- ============================================================
-- Forus 「想你了」信箱（异步模式：对方下次访问时弹出）
-- 用法：Supabase SQL Editor 粘贴运行
-- ============================================================

create table if not exists public.pokes (
  id uuid primary key default gen_random_uuid(),
  -- 谁戳的（身份 key：'you' / 'npy'）
  who_from text not null,
  -- 戳给谁（身份 key：'you' / 'npy'）
  who_to text not null,
  -- 可选附言（暂留扩展，目前为空）
  message text default '',
  -- 对方是否已看过
  seen boolean not null default false,
  created_at timestamptz default now()
);

-- 加速「查我的未读」
create index if not exists pokes_to_unseen_idx
  on public.pokes (who_to, seen, created_at desc);

-- RLS：允许匿名读写（与其他表一致，前端用暗号挡人）
alter table public.pokes enable row level security;

drop policy if exists "anon all pokes" on public.pokes;
create policy "anon all pokes" on public.pokes for all to anon using (true) with check (true);

-- 实时同步（可选：开启后将来也能实时收到）
alter publication supabase_realtime add table public.pokes;
