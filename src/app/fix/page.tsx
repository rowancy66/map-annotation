'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Wrench, CheckCircle2, AlertCircle, Copy, ExternalLink, Loader2, ArrowRight } from 'lucide-react';

const FIX_SQL = `-- ============================================
-- 修复 "Database error saving new user" 问题
-- ============================================

-- 1. 删除有问题的旧触发器和函数
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. 使用正确的 SECURITY DEFINER 配置重新创建函数
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

-- 3. 重新创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

export default function FixPage() {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'error'>('none');

  const copySQL = () => {
    navigator.clipboard.writeText(FIX_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const testSignup = async () => {
    setTesting(true);
    setTestResult('none');
    try {
      const testEmail = `test-verify-${Date.now()}@example.com`;
      const { error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'Test123456!',
      });
      if (error) {
        setTestResult('error');
      } else {
        setTestResult('success');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">修复注册问题</h1>
          <p className="text-gray-500">
            当前错误：<code className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-sm">Database error saving new user</code>
          </p>
          <p className="text-gray-400 text-sm mt-2">
            原因：数据库触发器配置有误，需要更新 <code>handle_new_user</code> 函数
          </p>
        </div>

        {/* 步骤 */}
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">打开 Supabase SQL 编辑器</h3>
                <p className="text-sm text-gray-500 mb-3">在 Supabase 控制台中打开 SQL 编辑器</p>
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
                <h3 className="font-semibold text-gray-900 mb-1">复制并执行修复 SQL</h3>
                <p className="text-sm text-gray-500 mb-3">
                  将下方 SQL 复制到 SQL 编辑器中，然后点击 <strong>Run</strong> 执行
                </p>
                <button
                  onClick={copySQL}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制到剪贴板！' : '复制 SQL'}
                </button>
                <div className="mt-3 bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-72 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{FIX_SQL}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">验证修复</h3>
                <p className="text-sm text-gray-500 mb-3">
                  SQL 执行成功后，点击下方按钮测试注册功能
                </p>
                <button
                  onClick={testSignup}
                  disabled={testing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {testing ? '测试中...' : '测试注册'}
                </button>
                {testResult === 'success' && (
                  <div className="mt-3 flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">注册成功！问题已修复。</span>
                    <a href="/auth/register" className="text-blue-600 underline text-sm ml-2">去注册</a>
                  </div>
                )}
                {testResult === 'error' && (
                  <div className="mt-3 flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">注册仍然失败，请确认 SQL 已正确执行</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h4 className="font-semibold text-yellow-800 mb-1">修复原理</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 旧触发器缺少 <code>SET search_path = &apos;&apos;</code> 配置，导致 RLS 安全检查异常</li>
            <li>• 旧函数未使用 <code>public.</code> schema 前缀引用表</li>
            <li>• 新增 <code>EXCEPTION WHEN OTHERS</code> 异常处理，确保地图创建失败不阻塞注册</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
