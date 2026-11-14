-- ============================================================
-- Forus 信件服务端收口
-- 用法：在已有环境执行一次；全新安装直接用 letters.sql 即可。
-- 作用：撤销 letters 表的匿名读写权限，只允许 service_role（Nitro）访问。
-- ============================================================

alter table public.letters enable row level security;

drop policy if exists "anon all letters" on public.letters;
revoke select, insert, update, delete on public.letters from anon;

-- 信件不再需要实时广播
do $$
begin
  alter publication supabase_realtime drop table public.letters;
exception
  when undefined_object then null;
end $$;
