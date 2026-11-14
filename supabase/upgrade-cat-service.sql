-- ============================================================
-- Forus 小猫对话服务端收口
-- 用法：在已有环境执行一次；全新安装直接用 cat.sql 即可。
-- 作用：撤销 cat_messages 的匿名读写权限，只允许 service_role（Nitro）访问。
-- ============================================================

alter table public.cat_messages enable row level security;

drop policy if exists "anon all cat_messages" on public.cat_messages;
revoke select, insert, update, delete on public.cat_messages from anon;

-- 对话由服务端持久化，不再需要实时广播
do $$
begin
  alter publication supabase_realtime drop table public.cat_messages;
exception
  when undefined_object then null;
end $$;
