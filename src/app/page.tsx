'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase.from('maps').select('id').limit(1);
        if (error) {
          // 数据库未初始化，跳转设置页
          window.location.href = '/setup';
        } else {
          // 数据库已就绪，跳转登录
          window.location.href = '/auth/login';
        }
      } catch {
        window.location.href = '/setup';
      }
      setRedirecting(false);
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}
