'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DEFAULT_LAND_FIELD_TEMPLATES } from '@/lib/constants';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, nickname: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    router.push('/dashboard');
    return { error: null };
  }, [router]);

  const signUpWithEmail = useCallback(async (email: string, password: string, nickname: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });
    if (error) return { error: error.message };

    // 应用层兜底：注册成功后确保用户有带土地出让数据模板的默认地图
    if (data.user) {
      try {
        const { data: existingMaps, error: mapError } = await supabase
          .from('maps')
          .select('id')
          .eq('user_id', data.user.id)
          .limit(1);
        if (!mapError && (!existingMaps || existingMaps.length === 0)) {
          await supabase
            .from('maps')
            .insert({
              user_id: data.user.id,
              name: '土地出让数据',
              description: '李沧区土地出让标注地图',
              center: [120.43, 36.16],
              zoom: 13,
              field_templates: DEFAULT_LAND_FIELD_TEMPLATES,
            });
        }
      } catch {
        // 静默忽略，不影响注册
      }
    }

    // 不直接跳转，让 RegisterForm 控制流程
    // 如果 session 存在，说明邮箱确认已关闭，用户已自动登录
    const needsConfirmation = !data.session;
    if (!needsConfirmation) {
      router.push('/dashboard');
    }
    return { error: null, needsConfirmation };
  }, [router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
