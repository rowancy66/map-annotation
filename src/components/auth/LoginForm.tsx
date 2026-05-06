'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function LoginForm() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    if (error) {
      setError(error === 'Invalid login credentials' ? '邮箱或密码错误' : error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* Logo & 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">地图标注平台</h1>
          <p className="text-gray-500 mt-2">登录以管理你的地图标注</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  required
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 微信登录 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">或</span>
              </div>
            </div>

            <button
              onClick={() => {
                // 微信登录需要配置 AppID，此处为入口
                alert('微信登录需要在微信开放平台注册应用并配置 AppID 后方可使用。请参考 .env.local.example 进行配置。');
              }}
              className="mt-4 w-full py-2.5 bg-[#07C160] text-white rounded-lg font-medium hover:bg-[#06AD56] transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.11.24-.245 0-.06-.024-.118-.04-.177l-.325-1.233a.492.492 0 0 1 .177-.554C23.016 18.842 24 17.08 24 15.109c0-3.407-3.159-6.199-7.062-6.251zM14.53 13.39c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.544.434-.983.97-.983zm4.844 0c.535 0 .969.44.969.983a.976.976 0 0 1-.97.983.976.976 0 0 1-.968-.983c0-.544.434-.983.969-.983z" />
              </svg>
              微信登录
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            还没有账号？{' '}
            <a href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium">
              注册
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
