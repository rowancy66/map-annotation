-- 地图标注平台 - 初始化数据库 Schema
-- 执行方式：在 Supabase SQL Editor 中运行

-- ============================================
-- 1. 地图项目表
-- ============================================
CREATE TABLE IF NOT EXISTS maps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '我的地图',
  description TEXT DEFAULT '',
  center JSONB DEFAULT '[116.4074, 39.9042]'::jsonb,
  zoom INTEGER DEFAULT 12,
  field_templates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- 2. 标注表
-- ============================================
CREATE TABLE IF NOT EXISTS annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('point', 'line', 'polygon')),
  geometry JSONB NOT NULL,
  name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  style JSONB DEFAULT '{}'::jsonb,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- 3. 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_maps_user_id ON maps(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_map_id ON annotations(map_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);

-- 空间索引（使用 PostGIS 如果可用）
-- CREATE INDEX IF NOT EXISTS idx_annotations_geometry ON annotations USING GIST (geometry);

-- ============================================
-- 4. RLS（行级安全策略）
-- ============================================
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的地图
CREATE POLICY "Users can view own maps" ON maps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own maps" ON maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maps" ON maps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maps" ON maps
  FOR DELETE USING (auth.uid() = user_id);

-- 用户只能访问自己地图下的标注
CREATE POLICY "Users can view own annotations" ON annotations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM maps WHERE maps.id = annotations.map_id AND maps.user_id = auth.uid())
  );

CREATE POLICY "Users can create own annotations" ON annotations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM maps WHERE maps.id = annotations.map_id AND maps.user_id = auth.uid())
  );

CREATE POLICY "Users can update own annotations" ON annotations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM maps WHERE maps.id = annotations.map_id AND maps.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own annotations" ON annotations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM maps WHERE maps.id = annotations.map_id AND maps.user_id = auth.uid())
  );

-- ============================================
-- 5. 自动更新 updated_at 触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_maps_updated_at
  BEFORE UPDATE ON maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at
  BEFORE UPDATE ON annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. 新用户注册时自动创建默认地图（含土地出让数据字段模板）
-- ============================================
-- 注意：必须使用 SECURITY DEFINER SET search_path = '' 以绕过 RLS
-- 异常处理确保即使地图创建失败，用户注册也不会被阻塞
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
    RETURN NEW;
END;
$$;

-- 先删除旧触发器（如果存在），再创建新的
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
