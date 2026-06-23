-- ============================================================
-- Forus 升级：留言墙支持图片（聊天气泡式）
-- 用法：SQL Editor 粘贴运行（若字段已存在会自动跳过）
-- ============================================================

alter table public.notes add column if not exists kind text not null default 'text';
alter table public.notes add column if not exists image_url text;

-- text 字段允许为空（发纯图片时可不带文字）
alter table public.notes alter column text drop not null;
