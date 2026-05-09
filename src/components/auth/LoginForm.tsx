'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm({ redirectTo = '/admin' }: LoginFormProps) {
  const { signInWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailNotConfirmed(false);
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    if (error) {
      if (error === 'Email not confirmed') {
        setEmailNotConfirmed(true);
        setError('');
      } else {
        setError(error === 'Invalid login credentials' ? '邮箱或密码错误' : error);
      }
    } else {
      router.push(redirectTo);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0e1a]">
      {/* 装饰性格线背景 */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      {/* 渐变光晕 */}
      <div className="absolute top-1/4 -left-48 w-[30rem] h-[30rem] bg-amber-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-48 w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-amber-400/5 rounded-full blur-[80px]" />

      <div className="w-full max-w-sm relative animate-fade-slide-up">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/90 to-amber-600/90 text-white mb-5 shadow-lg shadow-amber-500/20 animate-float backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3" fill="white" stroke="none"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">地图标注平台</h1>
          <p className="text-white/40 mt-2 text-sm font-light">登录以管理你的地图标注</p>
        </div>

        {/* 卡片 */}
        <div className="relative">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 blur-[1px]" />
          <div className="relative bg-[#111627]/90 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 tracking-wide">邮箱</label>
                <div className="relative group">
                  <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400/70 transition-colors duration-300" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-white/20 focus:border-amber-500/40 focus:bg-white/[0.06] focus:ring-0 outline-none transition-all duration-300 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 tracking-wide">密码</label>
                <div className="relative group">
                  <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400/70 transition-colors duration-300" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码…"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-white/20 focus:border-amber-500/40 focus:bg-white/[0.06] focus:ring-0 outline-none transition-all duration-300 shadow-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-400/90 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl backdrop-blur-sm">{error}</div>
              )}

              {emailNotConfirmed && (
                <div className="text-amber-300/90 text-sm bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl backdrop-blur-sm">
                  <p className="font-medium mb-1 text-amber-200">邮箱尚未确认</p>
                  <p className="text-amber-300/70 mb-2">请前往注册邮箱点击确认链接后再登录。</p>
                  <p className="text-amber-400/50 text-xs">
                    没有收到邮件？检查垃圾邮件，或在
                    <a href="https://supabase.com/dashboard/project/dybmtnyiiynfgjzzeljt/auth/users"
                       target="_blank" rel="noopener noreferrer"
                       className="text-amber-400/80 underline mx-1 hover:text-amber-300">Supabase 控制台</a>
                    手动确认用户。
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-[#0a0e1a] rounded-xl font-semibold tracking-wide hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
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

            <p className="mt-6 text-center text-sm text-white/30">
              还没有账号？{' '}
              <a href="/auth/register" className="text-amber-400/80 hover:text-amber-300 font-medium transition-colors duration-200">
                注册
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
