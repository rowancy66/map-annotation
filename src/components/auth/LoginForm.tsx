'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, LogIn, MapPin } from 'lucide-react';
import { apiGet } from '@/lib/api';

export default function LoginForm({ redirectTo = '/admin' }: { redirectTo?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<{ loggedIn: boolean }>('/api/auth/session')
      .then((data) => {
        if (data.loggedIn) {
          router.replace(redirectTo);
        }
      })
      .catch(() => {});
  }, [redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: loginError } = await login(password);
    if (loginError) {
      setError(loginError === '密码错误' ? '密码错误' : loginError);
    } else {
      router.push(redirectTo);
    }
    setLoading(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card animate-fade-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--primary)', boxShadow: '0 18px 42px rgba(31, 52, 45, 0.18)' }}>
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <div className="display-label">Admin Atlas</div>
          <h1 className="mt-3 text-3xl" style={{ color: 'var(--ink)' }}>管理登录</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>进入地图目录后台，继续维护项目与标注。</p>
        </div>

        <div className="paper-panel rounded-[28px] p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--muted)' }}>管理密码</label>
              <div className="relative">
                <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入管理密码"
                  required
                  className="w-full rounded-2xl px-11 py-3 text-sm outline-none transition"
                  style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(31, 52, 45, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl p-3 text-sm" style={{ color: 'var(--danger)', background: 'rgba(185,87,73,0.08)', border: '1px solid rgba(185,87,73,0.16)' }}>
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="primary-button flex w-full items-center justify-center gap-2 rounded-full py-3 font-medium disabled:opacity-40">
              <LogIn aria-hidden="true" className="h-4 w-4" />
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
            首次使用？
            {' '}
            <a href="/setup" style={{ color: 'var(--primary)' }}>设置管理密码</a>
          </p>
        </div>
      </div>
    </div>
  );
}
