'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database, CheckCircle2, AlertCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';

export default function SetupPage() {
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'not_initialized'>('checking');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    try {
      const { error } = await supabase.from('maps').select('id').limit(1);
      if (error) {
        setDbStatus('not_initialized');
      } else {
        setDbStatus('ready');
      }
    } catch {
      setDbStatus('not_initialized');
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (dbStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (dbStatus === 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">数据库已就绪</h1>
          <p className="text-gray-500 mb-6">所有表已创建，可以开始使用</p>
          <a
            href="/auth/login"
            className="inline-flex px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            进入应用
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* 标题 */}
        <div className="text-center mb-8">
          <Database className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">数据库初始化</h1>
          <p className="text-gray-500">首次使用需要初始化数据库，只需一步操作</p>
        </div>

        {/* 步骤 */}
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">打开 Supabase SQL 编辑器</h3>
                <p className="text-sm text-gray-500 mb-3">点击下方按钮，在 Supabase 控制台打开 SQL 编辑器</p>
                <a
                  href="https://supabase.com/dashboard/project/dybmtnyiiynfgjzzeljt/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  打开 SQL 编辑器
                </a>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">复制并执行以下 SQL</h3>
                <p className="text-sm text-gray-500 mb-3">将下方 SQL 复制到 SQL 编辑器中，然后点击 "Run" 执行</p>
                <button
                  onClick={copySQL}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制 SQL'}
                </button>
                <div className="mt-3 bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
                  <pre>{MIGRATION_SQL}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">验证并开始使用</h3>
                <p className="text-sm text-gray-500 mb-3">SQL 执行成功后，点击下方按钮验证数据库</p>
                <button
                  onClick={checkDatabase}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  验证数据库
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MIGRATION_SQL = `-- 地图标注平台 - 初始化数据库 Schema

-- 1. 地图项目表
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

-- 2. 标注表
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

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_maps_user_id ON maps(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_map_id ON annotations(map_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);

-- 4. RLS（行级安全策略）
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maps" ON maps
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own maps" ON maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maps" ON maps
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maps" ON maps
  FOR DELETE USING (auth.uid() = user_id);

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

-- 5. 自动更新 updated_at 触发器
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

-- 6. 新用户注册时自动创建默认地图
-- 关键：SECURITY DEFINER SET search_path = '' 绕过 RLS
-- 异常处理确保地图创建失败不阻塞注册
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
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;
