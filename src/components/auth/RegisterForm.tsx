'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Mail, Lock, User, UserPlus, CheckCircle2, MapPin } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50/80">
      {/* 装饰性光晕 */}
      <div className="absolute top-0 -left-32 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-gradient-to-br from-indigo-100/30 to-pink-100/20 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative animate-fade-slide-up">
        {/* Logo & 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-200/50 animate-float">
            <MapPin className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">创建账号</h1>
          <p className="text-gray-400 mt-1.5 text-sm">注册后即可开始使用地图标注</p>
        </div>

        {/* 注册表单 / 成功提示 */}
        {success ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/60 border border-white/60 p-7 text-center animate-fade-slide-up">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">注册成功！</h2>
            <p className="text-gray-600 mb-4">
              确认邮件已发送至 <strong>{registeredEmail}</strong>
            </p>
            <p className="text-gray-400 text-sm mb-6">
              请前往邮箱点击确认链接，然后即可登录
            </p>
            <a
              href="/auth/login"
              className="inline-flex px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-200/50 btn-glow"
            >
              去登录
            </a>
          </div>
        ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/60 border border-white/60 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">昵称</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="输入昵称…"
                  autoComplete="name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 个字符…"
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50/80 backdrop-blur border border-red-100 p-3 rounded-xl animate-fade-in">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-blue-200/50 btn-glow"
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

          <p className="mt-6 text-center text-sm text-gray-400">
            已有账号？{' '}
            <a href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition">
              登录
            </a>
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
