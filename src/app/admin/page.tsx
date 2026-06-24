'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  ),
});

const AdminEditor = dynamic(() => import('./AdminEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-400">加载编辑器...</p>
      </div>
    </div>
  ),
});

function AdminContent() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const mapId = searchParams.get('mapId');

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginForm redirectTo="/admin" />;
  }

  if (mapId) {
    return <AdminEditor mapId={mapId} />;
  }

  return <AdminDashboard />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}>
      <AdminContent />
    </Suspense>
  );
}