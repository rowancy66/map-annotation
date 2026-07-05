'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function MapPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="paper-panel workbench-hard-edge px-6 py-5">
        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
          跳转到地图目录...
        </div>
      </div>
    </div>
  );
}
