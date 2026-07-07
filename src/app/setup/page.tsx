'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiSend } from '@/lib/api';
import { AlertCircle, Loader2, Lock, MapPin, ShieldCheck, KeyRound } from 'lucide-react';

type SetupStatus = {
  configured: boolean;
  setupTokenRequired: boolean;
};

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadySet, setAlreadySet] = useState<boolean | null>(null);
  const [setupTokenRequired, setSetupTokenRequired] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiGet<{ loggedIn: boolean }>('/api/auth/session')
      .then((data) => {
        if (data.loggedIn) {
          router.replace('/admin');
          return null;
        }
        return apiGet<SetupStatus>('/api/auth/setup');
      })
      .then((status) => {
        if (status) {
          setAlreadySet(status.configured);
          setSetupTokenRequired(Boolean(status.setupTokenRequired));
        }
        setChecking(false);
      })
      .catch(() => {
        setAlreadySet(false);
        setSetupTokenRequired(false);
        setChecking(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (setupTokenRequired && !setupToken.trim()) {
      setError('请输入初始化口令');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要 6 个字符');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await apiSend('/api/auth/setup', 'POST', { password, confirmPassword, setupToken });
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置失败');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="auth-shell">
        <div className="paper-panel px-6 py-5 text-sm workbench-hard-edge" style={{ color: 'var(--muted)' }}>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--primary)' }} />
            检测系统状态...
          </div>
        </div>
      </div>
    );
  }

  if (alreadySet) {
    return (
      <div className="auth-shell">
        <div className="auth-card text-center">
          <div className="paper-panel mx-auto max-w-md p-8 workbench-hard-edge">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border" style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
              <ShieldCheck className="h-8 w-8" aria-hidden="true" />
            </div>
            <div className="display-label">Admin Setup</div>
            <h1 className="mt-3 text-3xl" style={{ color: 'var(--ink)' }}>密码已设置</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>管理密码已经存在，直接登录即可进入后台。</p>
            <a href="/auth/login" className="primary-button mt-6 inline-flex px-6 py-3 text-sm font-medium workbench-hard-edge">
              去登录
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border" style={{ background: 'rgba(10,75,63,0.08)', borderColor: 'var(--border-strong)' }}>
            <MapPin className="h-8 w-8" style={{ color: 'var(--primary)' }} />
          </div>
          <div className="display-label">Admin Setup</div>
          <h1 className="mt-3 text-3xl" style={{ color: 'var(--ink)' }}>设置管理密码</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            {setupTokenRequired ? '首次使用时需先输入部署者提供的初始化口令。' : '首次使用时完成初始化。'}
          </p>
        </div>

        <div className="paper-panel mx-auto max-w-md p-7 workbench-hard-edge">
          <form onSubmit={handleSubmit} className="space-y-4">
            {setupTokenRequired && (
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--muted)' }}>初始化口令</label>
                <div className="relative">
                  <KeyRound aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
                  <input
                    type="password"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    placeholder="输入部署者提供的口令"
                    autoComplete="one-time-code"
                    required
                    className="w-full px-11 py-3 text-sm outline-none transition workbench-hard-edge workbench-field"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--muted)' }}>管理密码</label>
              <div className="relative">
                <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 个字符"
                  autoComplete="new-password"
                  required
                  className="w-full px-11 py-3 text-sm outline-none transition workbench-hard-edge workbench-field"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--muted)' }}>确认密码</label>
              <div className="relative">
                <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                  required
                  className="w-full px-11 py-3 text-sm outline-none transition workbench-hard-edge workbench-field"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm workbench-hard-edge" style={{ color: 'var(--danger)', background: 'rgba(185,87,73,0.08)', border: '1px solid rgba(185,87,73,0.16)' }}>
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="primary-button flex w-full items-center justify-center gap-2 py-3 font-medium disabled:opacity-40 workbench-hard-edge">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  设置中...
                </span>
              ) : '设置密码'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
            已有密码？
            {' '}
            <a href="/auth/login" style={{ color: 'var(--primary)' }}>去登录</a>
          </p>
        </div>
      </div>
    </div>
  );
}
