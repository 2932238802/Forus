-- ============================================================
-- Forus 备忘录升级：分人 + 评论
-- 用法：Supabase SQL Editor 粘贴运行
-- ============================================================

-- 1) memos 加归属字段 owner（身份 key：'you' / 'npy'）
alter table public.memos
  add column if not exists owner text not null default 'npy';

-- 旧数据（升级前已存在的）全部归「在野」(npy)
update public.memos set owner = 'npy' where owner is null or owner = '';

-- 2) 备忘录评论表
create table if not exists public.memo_comments (
  id uuid primary key default gen_random_uuid(),
  memo_id uuid not null references public.memos(id) on delete cascade,
  -- 评论者身份 key（'you' / 'npy'）
  author text not null,
  text text not null,
  created_at timestamptz default now()
);

create index if not exists memo_comments_memo_idx
  on public.memo_comments (memo_id, created_at asc);

-- RLS：允许匿名读写（与其他表一致）
alter table public.memo_comments enable row level security;

drop policy if exists "anon all memo_comments" on public.memo_comments;
create policy "anon all memo_comments" on public.memo_comments for all to anon using (true) with check (true);

-- 实时同步
alter publication supabase_realtime add table public.memo_comments;
