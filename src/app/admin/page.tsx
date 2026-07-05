'use client';

import { Suspense } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminEditor from './AdminEditor';

function AdminContent() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const mapId = searchParams.get('mapId');

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
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
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
