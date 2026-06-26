-- ============================================================
-- Forus 喜好升级：增加分类 category（food 食物 / behavior 行为 / thing 物品 / other 其他）
-- 用法：Supabase SQL Editor 粘贴运行
-- 说明：仅新增列 + 按关键词预分类现有数据，不会删除任何记录。
-- ============================================================

-- 1) 加分类字段，默认「其他」
alter table public.likes
  add column if not exists category text not null default 'other';

-- 1.5) 迁移 owner：旧数据存的是显示名（在野 / LosAngelous），统一改成身份 key（npy / you）
update public.likes set owner = 'npy' where owner = '在野';
update public.likes set owner = 'you' where owner = 'LosAngelous';

-- 2) 按关键词自动预分类现有数据（之后可在页面拖拽微调）

-- 2.1 物品类（蜡烛 / 手链 / 收藏等）
update public.likes set category = 'thing'
where category = 'other' and (
  text like '%蜡烛%' or text like '%手链%' or text like '%收藏%' or text like '%礼物%'
);

-- 2.2 行为 / 感受类（被…的感觉、情绪、沟通相关）
update public.likes set category = 'behavior'
where category = 'other' and (
  text like '%被%' or text like '%感觉%' or text like '%善意%' or text like '%安全感%'
  or text like '%肯定%' or text like '%在意%' or text like '%偏爱%' or text like '%照顾%'
  or text like '%依赖%' or text like '%哭%' or text like '%笑%'
  or text like '%欺骗%' or text like '%背叛%' or text like '%隐瞒%' or text like '%冷暴力%'
  or text like '%消息%' or text like '%需要%' or text like '%难过%' or text like '%说%'
);

-- 2.3 食物 / 口味类（水果、菜、口味、吃喝相关）
update public.likes set category = 'food'
where category = 'other' and (
  text like '%吃%' or text like '%喝%' or text like '%牛奶%' or text like '%豆浆%'
  or text like '%茶%' or text like '%酒%' or text like '%咖啡%' or text like '%车厘子%'
  or text like '%西梅%' or text like '%苹果%' or text like '%葡萄%' or text like '%荔枝%'
  or text like '%樱桃%' or text like '%榴莲%' or text like '%凤梨%' or text like '%菠萝%'
  or text like '%李%' or text like '%桃%' or text like '%蓝莓%' or text like '%草莓%'
  or text like '%豆%' or text like '%锅包肉%' or text like '%菜%' or text like '%鸡公煲%'
  or text like '%螺蛳粉%' or text like '%蟹%' or text like '%鸭%' or text like '%海鲜%'
  or text like '%面食%' or text like '%腥%' or text like '%甜%' or text like '%酸%'
  or text like '%辣%' or text like '%苦%' or text like '%生冷%' or text like '%雪媚娘%'
  or text like '%浓油酱赤%' or text like '%红烧%' or text like '%头%' or text like '%脚%'
);

-- 完成。剩余未匹配到的仍为 'other'，可在页面里拖拽调整。
