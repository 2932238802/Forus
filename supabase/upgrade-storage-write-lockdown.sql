-- ============================================================
-- Forus Storage 写权限收口
-- 用法：在已有环境执行一次。
-- 作用：匿名只能上传，删除/改写改由服务端 /api/media/delete（service_role）完成。
-- ============================================================

drop policy if exists "anon update media" on storage.objects;
drop policy if exists "anon delete media" on storage.objects;

-- 保留：
--   anon upload media  —— 浏览器直接上传大文件
--   public read media  —— 图片公链可显示
