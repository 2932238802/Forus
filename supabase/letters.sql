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

-- RLS：默认拒绝所有匿名访问。
-- 信件只通过服务端 /api/letters 使用 service_role key 读写。
alter table public.letters enable row level security;

-- 显式撤销 anon 权限（即使旧环境残留策略也一并清理）
drop policy if exists "anon all letters" on public.letters;
revoke select, insert, update, delete on public.letters from anon;

-- 信件通过服务端读写，不加入 Realtime publication。
