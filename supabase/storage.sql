-- ============================================================
-- Forus Storage 配置（共用暗号方案：允许匿名上传/读取）
-- 用法：SQL Editor 粘贴运行
-- ============================================================

-- 创建公开存储桶 media
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- 清理旧策略
drop policy if exists "auth upload media" on storage.objects;
drop policy if exists "auth update media" on storage.objects;
drop policy if exists "auth delete media" on storage.objects;
drop policy if exists "public read media" on storage.objects;

-- 匿名可上传 / 改 / 删 media 桶
create policy "anon upload media"
  on storage.objects for insert to anon
  with check (bucket_id = 'media');

create policy "anon update media"
  on storage.objects for update to anon
  using (bucket_id = 'media');

create policy "anon delete media"
  on storage.objects for delete to anon
  using (bucket_id = 'media');

-- 任何人可读（图片要能显示）
create policy "public read media"
  on storage.objects for select to public
  using (bucket_id = 'media');
