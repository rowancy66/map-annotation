'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { Lock, LogIn, AlertCircle } from 'lucide-react';
import { apiGet } from '@/lib/api';

export default function LoginForm({ redirectTo = '/admin' }: { redirectTo?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    apiGet<{ loggedIn: boolean }>('/api/auth/session').then((data) => {
      if (data.loggedIn) {
        router.replace(redirectTo);
      }
    }).catch(() => {});
  }, [redirectTo, router]);

  // 检测是否已设置管理密码
  useEffect(() => {
    fetch('/api/auth/setup', { method: 'HEAD' }).then((res) => {
      setNeedsSetup(res.status === 404 || res.status === 405);
    }).catch(() => setNeedsSetup(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await login(password);
    if (error) {
      setError(error === '密码错误' ? '密码错误' : error);
    } else {
      router.push(redirectTo);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#0a0e0c' }}>
      {/* 装饰性格线背景 */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(120,165,135,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      {/* 渐变光晕 */}
      <div className="absolute top-1/4 -left-48 w-[30rem] h-[30rem] rounded-full blur-[120px]" style={{ background: 'rgba(120,165,135,0.06)' }} />
      <div className="absolute bottom-1/4 -right-48 w-[30rem] h-[30rem] rounded-full blur-[120px]" style={{ background: 'rgba(120,165,135,0.04)' }} />
      <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full blur-[80px]" style={{ background: 'rgba(120,165,135,0.03)' }} />

      <div className="w-full max-w-sm relative animate-fade-slide-up">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 animate-float backdrop-blur-sm shadow-lg" style={{ background: 'linear-gradient(135deg, #78a587, #5a8a70)', boxShadow: '0 8px 32px rgba(120,165,135,0.15)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-white">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3" fill="white" stroke="none"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>地图标注平台</h1>
          <p className="mt-2 text-sm font-light" style={{ color: 'rgba(120,165,135,0.4)' }}>管理员登录</p>
        </div>

        {/* 卡片 */}
        <div className="relative">
          <div className="absolute -inset-[1px] rounded-2xl blur-[1px]" style={{ background: 'linear-gradient(180deg, rgba(120,165,135,0.08), rgba(120,165,135,0.02))' }} />
          <div className="relative rounded-2xl backdrop-blur-xl border p-7" style={{ background: 'rgba(13,17,14,0.85)', borderColor: 'rgba(120,165,135,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 tracking-wide" style={{ color: 'rgba(120,165,135,0.5)' }}>管理密码</label>
                <div className="relative group">
                  <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300" style={{ color: 'rgba(120,165,135,0.15)' }} />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入管理密码…"
                    required
                    className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm outline-none transition-all duration-300 shadow-sm"
                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(120,165,135,0.06)', color: 'rgba(255,255,255,0.85)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(120,165,135,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(120,165,135,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm p-3 rounded-xl backdrop-blur-sm flex items-center gap-2" style={{ color: 'rgba(192,128,128,0.9)', background: 'rgba(192,128,128,0.08)', border: '1px solid rgba(192,128,128,0.12)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #78a587, #5a8a70)', color: '#0a0e0c', boxShadow: '0 8px 32px rgba(120,165,135,0.15)' }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #8ab8a0, #6a9a80)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #78a587, #5a8a70)'; }}
              >
                <LogIn aria-hidden="true" className="w-4 h-4" />
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    登录中...
                  </span>
                ) : '登录'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: 'rgba(120,165,135,0.25)' }}>
              首次使用？{' '}
              <a href="/setup" className="font-medium transition-colors duration-200" style={{ color: 'rgba(120,165,135,0.6)' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(120,165,135,0.8)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(120,165,135,0.6)'; }}>
                设置管理密码
              </a>
            </p>
          </div>
        </div>

        {/* Deerflow 署名 */}
        <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer"
           className="fixed bottom-4 right-4 text-[10px] tracking-widest uppercase transition-colors duration-300" style={{ color: 'rgba(120,165,135,0.1)' }}>
          Deerflow
        </a>
      </div>
    </div>
  );
}