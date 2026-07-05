'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';
import { Loader2 } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminEditor from './AdminEditor';

function AdminContent() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const mapId = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('mapId');

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
  return <AdminContent />;
}
