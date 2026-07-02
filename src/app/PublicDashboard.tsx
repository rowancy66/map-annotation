'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { MapProject } from '@/lib/types';
import { MapPin, LogIn, Clock, Layers, Loader2 } from 'lucide-react';

interface MapListItem extends MapProject {
  annotation_count: number;
}

export default function PublicDashboard() {
  const router = useRouter();
  const [maps, setMaps] = useState<MapListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      apiGet<{ maps: MapListItem[] }>('/api/maps')
        .then((data) => {
          if (active) setMaps(data.maps);
        })
        .catch(() => {
          if (active) setMaps([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
    };
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const thumbGradients = [
    'linear-gradient(135deg, #e8f0ec 0%, #d1dfd8 50%, #b8cec3 100%)',
    'linear-gradient(135deg, #f0ece8 0%, #ddd5cc 50%, #c8beb2 100%)',
    'linear-gradient(135deg, #e8ecf0 0%, #d1d8df 50%, #b8c3ce 100%)',
    'linear-gradient(135deg, #ece8f0 0%, #d8d1df 50%, #c3b8ce 100%)',
    'linear-gradient(135deg, #f0ece8 0%, #dfd8d1 50%, #cec3b8 100%)',
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* 顶栏 */}
      <header className="h-14 flex items-center justify-between px-6" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'var(--primary)' }}>
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>地图管理</h1>
        </div>
        <a
          href="/admin"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
          style={{ color: 'var(--primary)', border: '1px solid var(--primary)', background: 'var(--primary-light)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,71,53,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--primary-light)'; }}
        >
          <LogIn className="w-3.5 h-3.5" />
          后台管理
        </a>
      </header>

      {/* 主体 */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>所有地图</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>共 {maps.length} 张地图</p>
          </div>
        </div>

        {/* 地图卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {maps.map((map, idx) => (
            <div
              key={map.id}
              onClick={() => router.push(`/map/${map.id}`)}
              className="bg-white rounded-xl border overflow-hidden cursor-pointer transition-all duration-250"
              style={{ borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(26,71,53,0.12)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {/* 缩略图区域 */}
              <div className="h-36 flex items-center justify-center relative" style={{ background: thumbGradients[idx % thumbGradients.length] }}>
                <div className="text-center">
                  <MapPin className="w-10 h-10 mx-auto mb-1" style={{ color: 'var(--primary)', opacity: 0.25 }} />
                  <p className="text-xs font-mono" style={{ color: 'var(--faint)' }}>{map.annotation_count} 个标注</p>
                </div>
                <div className="absolute top-0 right-0 px-2.5 py-1 text-xs font-medium rounded-bl-xl" style={{ background: 'rgba(26,71,53,0.7)', color: 'white' }}>
                  {map.annotation_count} 条
                </div>
              </div>

              {/* 信息区域 */}
              <div className="p-4">
                <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>{map.name}</h3>
                {map.description && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{map.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--faint)' }}>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {map.annotation_count} 条
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(map.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* 空状态 */}
          {maps.length === 0 && (
            <div className="col-span-full text-center py-16">
              <MapPin className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--border)' }} />
              <p style={{ color: 'var(--faint)' }}>暂无地图</p>
            </div>
          )}
        </div>
      </main>

      {/* Deerflow 署名 */}
      <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer"
         className="fixed bottom-4 right-4 text-[10px] tracking-widest uppercase transition-colors duration-300"
         style={{ color: 'rgba(107,114,128,0.3)' }}>
        Deerflow
      </a>
    </div>
  );
}
