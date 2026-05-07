'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, MapPin } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50/80">
      {/* 装饰性光晕 */}
      <div className="absolute top-0 -left-32 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-gradient-to-br from-indigo-100/30 to-pink-100/20 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative animate-fade-slide-up">
        {/* Logo & 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-200/50 animate-float">
            <MapPin aria-hidden="true" className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">地图标注平台</h1>
          <p className="text-gray-400 mt-1.5 text-sm">登录以管理你的地图标注</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/60 border border-white/60 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
              <div className="relative group">
                <Mail aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <div className="relative group">
                <Lock aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码…"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50/80 backdrop-blur border border-red-100 p-3 rounded-xl animate-fade-in">{error}</div>
            )}

            {emailNotConfirmed && (
              <div className="text-amber-700 text-sm bg-amber-50/80 backdrop-blur border border-amber-200 p-4 rounded-xl animate-fade-in">
                <p className="font-medium mb-1">邮箱尚未确认</p>
                <p className="text-amber-600 mb-2">请前往注册邮箱点击确认链接后再登录。</p>
                <p className="text-amber-500 text-xs">
                  没有收到邮件？检查垃圾邮件，或在
                  <a href="https://supabase.com/dashboard/project/dybmtnyiiynfgjzzeljt/auth/users"
                     target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 underline mx-1">Supabase 控制台</a>
                  手动确认用户。
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-blue-200/50 btn-glow"
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

          <p className="mt-6 text-center text-sm text-gray-400">
            还没有账号？{' '}
            <a href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition">
              注册
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
