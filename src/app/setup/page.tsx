'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiSend } from '@/lib/api';
import { Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadySet, setAlreadySet] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // 检测是否已设置密码
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.loggedIn) {
          router.replace('/admin');
          return;
        }
        // 用 HEAD 检测 setup 端点是否存在
        return fetch('/api/auth/setup', { method: 'HEAD' });
      })
      .then((res) => {
        if (res) {
          // 如果 setup 端点返回 405，说明已存在（因为 HEAD 不支持）
          // 如果返回 200，说明可用
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="flex items-center gap-3 text-white/40 text-sm">
          <Loader2 className="animate-spin h-5 w-5" />
          检测系统状态...
        </div>
      </div>
    );
  }

  if (alreadySet) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0e1a]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-white/90 mb-2">密码已设置</h1>
          <p className="text-white/40 text-sm mb-6">管理密码已设置，请直接登录</p>
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-[#0a0e1a] rounded-xl font-semibold hover:from-amber-400 hover:to-amber-500 transition-all duration-300"
          >
            去登录
          </a>
        </div>
      </div>
    );
  }

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

      <div className="w-full max-w-sm relative animate-fade-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 animate-float backdrop-blur-sm shadow-lg" style={{ background: 'linear-gradient(135deg, #78a587, #5a8a70)', boxShadow: '0 8px 32px rgba(120,165,135,0.15)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-white">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3" fill="white" stroke="none"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">设置管理密码</h1>
          <p className="text-white/40 mt-2 text-sm font-light">首次使用，请设置管理员密码</p>
        </div>

        {/* 卡片 */}
        <div className="relative">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 blur-[1px]" />
          <div className="relative bg-[#111627]/90 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 tracking-wide">管理密码</label>
                <div className="relative group">
                  <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400/70 transition-colors duration-300" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 个字符…"
                    autoComplete="new-password"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-white/20 focus:border-amber-500/40 focus:bg-white/[0.06] focus:ring-0 outline-none transition-all duration-300 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 tracking-wide">确认密码</label>
                <div className="relative group">
                  <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400/70 transition-colors duration-300" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码…"
                    autoComplete="new-password"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-white/20 focus:border-amber-500/40 focus:bg-white/[0.06] focus:ring-0 outline-none transition-all duration-300 shadow-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-400/90 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl backdrop-blur-sm flex items-center gap-2">
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
                <ShieldCheck aria-hidden="true" className="w-4 h-4" />
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
                    设置中...
                  </span>
                ) : '设置密码'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/30">
              已有密码？{' '}
              <a href="/auth/login" className="text-amber-400/80 hover:text-amber-300 font-medium transition-colors duration-200">
                去登录
              </a>
            </p>
          </div>
        </div>

        {/* Deerflow 署名 */}
        <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer"
           className="fixed bottom-4 right-4 text-[10px] text-white/15 hover:text-white/30 transition-colors duration-300 tracking-widest uppercase">
          Deerflow
        </a>
      </div>
    </div>
  );
}