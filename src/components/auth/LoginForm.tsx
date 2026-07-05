'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, LogIn, MapPinned, Shield } from 'lucide-react';
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
      <div className="auth-card">
        <div className="login-grid">
          <div className="login-stage hidden lg:flex lg:flex-col">
            <div className="login-stage-top">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border" style={{ borderColor: 'var(--border-strong)', background: 'rgba(10,75,63,0.06)' }}>
                  <MapPinned className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Kanyon Maps</div>
                  <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>Admin Access</div>
                </div>
              </div>
            </div>

            <div className="login-stage-main">
              <div className="login-stage-block">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>Map Administration</div>
                <h1 className="mt-3 text-[28px] font-semibold leading-[1.04]" style={{ color: 'var(--ink)' }}>地图管理后台</h1>
              </div>

              <div className="login-stage-ledger">
                <div>目录</div>
                <div>标注</div>
                <div>权限</div>
              </div>
            </div>
          </div>

          <div className="login-form-panel">
            <div className="w-full max-w-sm border p-7" style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}>
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>管理员登录</div>
                  <h2 className="mt-2 text-[24px] font-semibold" style={{ color: 'var(--ink)' }}>后台入口</h2>
                </div>
                <div className="flex h-9 w-9 items-center justify-center border" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
                  <Shield className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                </div>
              </div>

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
                      placeholder="输入密码"
                      required
                      className="w-full px-11 py-3 text-sm outline-none transition workbench-hard-edge workbench-field"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 border p-3 text-sm" style={{ color: 'var(--danger)', background: 'rgba(185,87,73,0.08)', borderColor: 'rgba(185,87,73,0.16)' }}>
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="primary-button flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium disabled:opacity-40 workbench-hard-edge">
                  <LogIn aria-hidden="true" className="h-3.5 w-3.5" />
                  {loading ? '登录中...' : '登录'}
                </button>
              </form>

              <p className="mt-6 border-t pt-4 text-sm" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
                首次使用？
                {' '}
                <a href="/setup" style={{ color: 'var(--primary)' }}>设置管理密码</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
