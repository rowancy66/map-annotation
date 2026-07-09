'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, LogIn, MapPinned, Shield } from 'lucide-react';
import { apiGet } from '@/lib/api';

type SetupStatus = {
  configured: boolean;
  setupTokenRequired: boolean;
};

export default function LoginForm({ redirectTo = '/admin' }: { redirectTo?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetupLink, setShowSetupLink] = useState(false);

  useEffect(() => {
    let active = true;

    apiGet<{ loggedIn: boolean }>('/api/auth/session')
      .then((data) => {
        if (!active) return;
        if (data.loggedIn) {
          router.replace(redirectTo);
          return;
        }
        return apiGet<SetupStatus>('/api/auth/setup');
      })
      .then((status) => {
        if (!active || !status) return;
        setShowSetupLink(!status.configured);
      })
      .catch(() => {
        if (!active) return;
        setShowSetupLink(false);
      });

    return () => {
      active = false;
    };
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
                <div className="flex h-10 w-10 items-center justify-center border border-[var(--border-default)] bg-[var(--bg-subtle)] rounded-[var(--radius-md)] text-[var(--primary-default)]">
                  <MapPinned className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Kanyon Maps</div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Admin Access</div>
                </div>
              </div>
            </div>

            <div className="login-stage-main">
              <div className="login-stage-block">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Map Administration</div>
                <h1 className="mt-3 text-[28px] font-semibold leading-[1.04] text-[var(--text-primary)]">地图管理后台</h1>
              </div>

              <div className="login-stage-ledger">
                <div>目录</div>
                <div>标注</div>
                <div>权限</div>
              </div>
            </div>
          </div>

          <div className="login-form-panel">
            <div className="w-full max-w-sm border border-[var(--border-subtle)] p-7 bg-[var(--surface-primary)] rounded-[var(--radius-xl)] shadow-[var(--shadow-floating)]">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">管理员登录</div>
                  <h2 className="mt-2 text-[24px] font-semibold text-[var(--text-primary)]">后台入口</h2>
                </div>
                <div className="flex h-9 w-9 items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-subtle)] rounded-[var(--radius-md)] text-[var(--primary-default)]">
                  <Shield className="h-4 w-4" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">管理密码</label>
                  <div className="relative">
                    <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="输入密码"
                      required
                      className="w-full px-11 py-3 text-sm outline-none transition rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus:shadow-[0_0_0_1px_var(--accent-default)]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 border border-[var(--danger-bg)] p-3 text-sm rounded-[var(--radius-md)] text-[var(--danger-text)] bg-[var(--danger-bg)]">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="primary-button flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium disabled:opacity-40 rounded-[var(--radius-md)]">
                  <LogIn aria-hidden="true" className="h-3.5 w-3.5" />
                  {loading ? '登录中...' : '登录'}
                </button>
              </form>

              {showSetupLink && (
                <p className="mt-6 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-secondary)]">
                  首次使用？
                  {' '}
                  <a href="/setup" className="text-[var(--primary-default)] hover:text-[var(--primary-hover)]">设置管理密码</a>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
