'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiSend } from '@/lib/api';
import { AlertCircle, Loader2, Lock, MapPin, ShieldCheck } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadySet, setAlreadySet] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.loggedIn) {
          router.replace('/admin');
          return;
        }
        return fetch('/api/auth/setup', { method: 'HEAD' });
      })
      .then((res) => {
        if (res) {
          setAlreadySet(res.status === 405);
        }
        setChecking(false);
      })
      .catch(() => {
        setAlreadySet(false);
        setChecking(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      await apiSend('/api/auth/setup', 'POST', { password, confirmPassword });
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
        <div className="paper-panel rounded-[28px] px-6 py-5 text-sm" style={{ color: 'var(--muted)' }}>
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
        <div className="auth-card text-center animate-fade-slide-up">
          <div className="paper-panel rounded-[28px] p-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <ShieldCheck className="h-8 w-8" aria-hidden="true" />
            </div>
            <div className="display-label">Admin Atlas</div>
            <h1 className="mt-3 text-3xl" style={{ color: 'var(--ink)' }}>密码已设置</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>管理密码已经存在，直接登录即可进入后台。</p>
            <a href="/auth/login" className="primary-button mt-6 inline-flex rounded-full px-6 py-3 text-sm font-medium">
              去登录
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card animate-fade-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--primary)', boxShadow: '0 18px 42px rgba(31, 52, 45, 0.18)' }}>
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <div className="display-label">Admin Atlas</div>
          <h1 className="mt-3 text-3xl" style={{ color: 'var(--ink)' }}>设置管理密码</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>首次使用时完成初始化，之后可直接登录后台。</p>
        </div>

        <div className="paper-panel rounded-[28px] p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full rounded-2xl px-11 py-3 text-sm outline-none transition"
                  style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid var(--border)', color: 'var(--ink)' }}
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
                  className="w-full rounded-2xl px-11 py-3 text-sm outline-none transition"
                  style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid var(--border)', color: 'var(--ink)' }}
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
