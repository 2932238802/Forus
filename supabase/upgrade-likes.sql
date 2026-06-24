-- 升级 likes 表：增加 kind 字段（like 喜欢 / dislike 不喜欢）
alter table public.likes add column if not exists kind text not null default 'like';
