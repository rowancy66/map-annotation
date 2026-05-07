'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Mail, Lock, LogIn, MapPin } from 'lucide-react';

export default function LoginForm() {
  const { signInWithEmail } = useAuth();
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
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50/80 to-purple-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo & 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-200">
            <MapPin className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">地图标注平台</h1>
          <p className="text-gray-400 mt-1.5 text-sm">登录以管理你的地图标注</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">{error}</div>
            )}

            {emailNotConfirmed && (
              <div className="text-amber-700 text-sm bg-amber-50 border border-amber-200 p-4 rounded-xl">
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
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-blue-200"
            >
              <LogIn className="w-4 h-4" />
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            还没有账号？{' '}
            <a href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
              注册
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
