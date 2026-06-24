'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isLoggedIn: boolean;
  loading: boolean;
  login: (password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    apiGet<{ loggedIn: boolean }>('/api/auth/session')
      .then((data) => {
        if (!active) return;
        setIsLoggedIn(data.loggedIn);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setIsLoggedIn(false);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (password: string) => {
    try {
      const result = await apiSend<{ loggedIn: boolean }>('/api/auth/login', 'POST', { password });
      setIsLoggedIn(result.loggedIn);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : '登录失败' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiSend('/api/auth/logout', 'POST');
    } finally {
      setIsLoggedIn(false);
      router.push('/admin');
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, login, logout }}>
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