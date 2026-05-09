'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Mail, Lock, User, UserPlus, CheckCircle2 } from 'lucide-react';

export default function RegisterForm() {
  const { signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('密码至少需要 6 个字符');
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUpWithEmail(email, password, nickname);
    if (error) {
      if (error.includes('already registered')) {
        setError('该邮箱已被注册');
      } else {
        setError(error);
      }
    } else if (needsConfirmation) {
      setRegisteredEmail(email);
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0e1a]">
      {/* 格线纹理 */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      {/* 光晕 */}
      <div className="absolute top-1/4 -left-48 w-[30rem] h-[30rem] bg-amber-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-48 w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-sm relative animate-fade-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/90 to-amber-600/90 text-white mb-5 shadow-lg shadow-amber-500/20 animate-float backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3" fill="white" stroke="none"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">创建账号</h1>
          <p className="text-white/40 mt-2 text-sm font-light">注册后即可开始使用地图标注</p>
        </div>

        {success ? (
          <div className="relative animate-fade-slide-up">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 blur-[1px]" />
            <div className="relative bg-[#111627]/90 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-white/90 mb-2">注册成功！</h2>
              <p className="text-white/50 mb-4 text-sm">
                确认邮件已发送至 <strong className="text-white/70">{registeredEmail}</strong>
              </p>
              <p className="text-white/30 text-sm mb-6">请前往邮箱点击确认链接，然后即可登录</p>
              <a
                href="/auth/login"
                className="inline-flex px-6 py-2.5 bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-[#0a0e1a] rounded-xl font-semibold hover:from-amber-400 hover:to-amber-500 transition-all duration-300 shadow-lg shadow-amber-500/20"
              >
                去登录
              </a>
            </div>
          </div>
        ) : (
        <div className="relative">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 blur-[1px]" />
          <div className="relative bg-[#111627]/90 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 tracking-wide">昵称</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400/70 transition-colors duration-300" aria-hidden="true" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="输入昵称…"
                    autoComplete="name"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-white/20 focus:border-amber-500/40 focus:bg-white/[0.06] focus:ring-0 outline-none transition-all duration-300 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 tracking-wide">邮箱</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400/70 transition-colors duration-300" aria-hidden="true" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-white/20 focus:border-amber-500/40 focus:bg-white/[0.06] focus:ring-0 outline-none transition-all duration-300 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 tracking-wide">密码</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400/70 transition-colors duration-300" aria-hidden="true" />
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

              {error && (
                <div className="text-red-400/90 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl backdrop-blur-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-[#0a0e1a] rounded-xl font-semibold tracking-wide hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    注册中...
                  </span>
                ) : '注册'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/30">
              已有账号？{' '}
              <a href="/auth/login" className="text-amber-400/80 hover:text-amber-300 font-medium transition-colors duration-200">
                登录
              </a>
            </p>
          </div>
        </div>
        )}

        {/* Deerflow 署名 */}
        <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer"
           className="fixed bottom-4 right-4 text-[10px] text-white/15 hover:text-white/30 transition-colors duration-300 tracking-widest uppercase">
          Deerflow
        </a>
      </div>
    </div>
  );
}
