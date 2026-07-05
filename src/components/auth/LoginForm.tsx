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
          <div className="login-stage hidden lg:flex lg:flex-col lg:justify-between lg:px-10 lg:py-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border" style={{ borderColor: 'var(--border-strong)', background: 'rgba(10,75,63,0.08)' }}>
                  <MapPinned className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Kanyon Maps</div>
              </div>
              <div className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>Admin Access</div>
            </div>

            <div className="max-w-2xl">
              <div className="grid grid-cols-[88px_minmax(0,1fr)] border-y" style={{ borderColor: 'var(--border)' }}>
                <div className="border-r px-4 py-5 text-[11px] font-medium uppercase tracking-[0.12em]" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>
                  01
                </div>
                <div className="px-6 py-5">
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>Map Administration</div>
                  <h1 className="mt-2 text-[32px] font-semibold leading-[1.08]" style={{ color: 'var(--ink)' }}>地图管理后台</h1>
                  <p className="mt-3 max-w-lg text-sm leading-6" style={{ color: 'var(--muted)' }}>
                    地图、标注、字段配置统一在同一套工作台内完成。
                  </p>
                </div>
              </div>
            </div>

            <div className="grid max-w-2xl grid-cols-3 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>
              <div className="border-r px-4 py-4" style={{ borderColor: 'var(--border)' }}>地图目录</div>
              <div className="border-r px-4 py-4" style={{ borderColor: 'var(--border)' }}>标注编辑</div>
              <div className="px-4 py-4">权限入口</div>
            </div>
          </div>

          <div className="login-form-panel">
            <div className="w-full max-w-sm border p-8" style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}>
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>管理员登录</div>
                  <h2 className="mt-2 text-[26px] font-semibold" style={{ color: 'var(--ink)' }}>后台入口</h2>
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

                <button type="submit" disabled={loading} className="primary-button flex w-full items-center justify-center gap-2 py-3 font-medium disabled:opacity-40 workbench-hard-edge">
                  <LogIn aria-hidden="true" className="h-4 w-4" />
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
