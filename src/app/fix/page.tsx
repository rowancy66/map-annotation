'use client';

import Link from 'next/link';
import { Wrench, CheckCircle2 } from 'lucide-react';

export default function FixPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl w-full border bg-white p-8 text-center workbench-hard-edge" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border workbench-hard-edge" style={{ background: 'rgba(10,75,63,0.08)', borderColor: 'var(--border-strong)' }}>
          <Wrench className="h-8 w-8" style={{ color: 'var(--primary)' }} />
        </div>
        <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--ink)' }}>旧的 Supabase 修复页已退役</h1>
        <p className="mb-6" style={{ color: 'var(--muted)' }}>
          这个项目现在使用 Turso + 站内登录体系，原来的 Supabase 触发器修复步骤已经不再需要。
        </p>
        <div className="mb-6 border bg-green-50 p-4 text-left workbench-hard-edge" style={{ borderColor: 'rgba(10,75,63,0.14)' }}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--primary)' }} />
            <p className="text-sm" style={{ color: '#1f513f' }}>
              如果你是来处理注册失败问题，现在应该直接测试 `/auth/register`。注册成功后会自动写入 Turso。
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/auth/register" className="px-5 py-3 font-medium text-white transition workbench-hard-edge" style={{ background: 'var(--primary)' }}>
            去注册
          </Link>
          <Link href="/auth/login" className="px-5 py-3 font-medium transition workbench-hard-edge" style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}>
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
}
