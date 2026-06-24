'use client';

import Link from 'next/link';
import { Wrench, CheckCircle2 } from 'lucide-react';

export default function FixPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wrench className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">旧的 Supabase 修复页已退役</h1>
        <p className="text-gray-500 mb-6">
          这个项目现在使用 Turso + 站内登录体系，原来的 Supabase 触发器修复步骤已经不再需要。
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              如果你是来处理注册失败问题，现在应该直接测试 `/auth/register`。注册成功后会自动写入 Turso。
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/auth/register" className="px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
            去注册
          </Link>
          <Link href="/auth/login" className="px-5 py-3 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition">
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
}
