-- ============================================================
-- Forus 小猫 AI 对话历史
-- 用法：Supabase SQL Editor 粘贴运行
-- ============================================================

create table if not exists public.cat_messages (
  id uuid primary key default gen_random_uuid(),
  -- 角色：'user'（在野说的）/ 'assistant'（小猫说的）
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists cat_messages_time_idx
  on public.cat_messages (created_at asc);

-- RLS：允许匿名读写（与其他表一致）
alter table public.cat_messages enable row level security;

drop policy if exists "anon all cat_messages" on public.cat_messages;
create policy "anon all cat_messages" on public.cat_messages for all to anon using (true) with check (true);

-- 实时同步（新表，直接添加）
alter publication supabase_realtime add table public.cat_messages;
