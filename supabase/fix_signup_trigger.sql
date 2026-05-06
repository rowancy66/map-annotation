-- ============================================
-- 修复 "Database error saving new user" 问题
-- 在 Supabase SQL Editor 中运行此脚本
-- ============================================

-- 1. 删除有问题的旧触发器和函数
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. 使用正确的 SECURITY DEFINER 配置重新创建函数
-- 关键修复：
--   - SET search_path = '' 防止搜索路径劫持
--   - 显式引用 public.maps（带 schema 前缀）
--   - 默认地图包含土地出让数据字段模板
--   - EXCEPTION 块确保地图创建失败不阻塞注册
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.maps (user_id, name, description, center, zoom, field_templates)
  VALUES (
    NEW.id,
    '土地出让数据',
    '李沧区土地出让标注地图',
    '[120.43, 36.16]'::jsonb,
    13,
    '[
      {"id":"f0000001-0001-0001-0001-000000000001","name":"面积(㎡)","type":"number","required":false,"sort_order":0},
      {"id":"f0000001-0001-0001-0001-000000000002","name":"容积率","type":"number","required":false,"sort_order":1},
      {"id":"f0000001-0001-0001-0001-000000000003","name":"成交价格(万元)","type":"number","required":false,"sort_order":2},
      {"id":"f0000001-0001-0001-0001-000000000004","name":"土地使用权人","type":"text","required":false,"sort_order":3},
      {"id":"f0000001-0001-0001-0001-000000000005","name":"合同签订日期","type":"date","required":false,"sort_order":4},
      {"id":"f0000001-0001-0001-0001-000000000006","name":"楼面地价(元/㎡)","type":"number","required":false,"sort_order":5},
      {"id":"f0000001-0001-0001-0001-000000000007","name":"主要股东","type":"text","required":false,"sort_order":6}
    ]'::jsonb
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 地图创建失败不应阻塞用户注册
    RETURN NEW;
END;
$$;

-- 3. 重新创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 验证：查询触发器是否正确创建
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
