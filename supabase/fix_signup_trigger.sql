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
--   - EXCEPTION 块确保地图创建失败不阻塞注册
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.maps (user_id, name, description)
  VALUES (NEW.id, '我的地图', '默认地图项目');
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
