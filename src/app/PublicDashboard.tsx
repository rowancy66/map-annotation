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
    apiGet<{ maps: MapListItem[] }>('/api/maps')
      .then((data) => setMaps(data.maps))
      .catch(() => setMaps([]))
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#f2eee8' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#78a587' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f2eee8' }}>
      {/* 顶栏 */}
      <header className="h-14 flex items-center justify-between px-6" style={{ background: '#faf8f4', borderBottom: '1px solid rgba(150,175,155,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded" style={{ background: '#78a587' }}>
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-semibold" style={{ color: '#3a403c' }}>地图标注平台</h1>
        </div>
        <a
          href="/admin"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
          style={{ color: '#78a587', border: '1px solid rgba(120,165,135,0.2)', background: 'rgba(120,165,135,0.06)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(120,165,135,0.12)'; e.currentTarget.style.borderColor = 'rgba(120,165,135,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(120,165,135,0.06)'; e.currentTarget.style.borderColor = 'rgba(120,165,135,0.2)'; }}
        >
          <LogIn className="w-3.5 h-3.5" />
          后台管理
        </a>
      </header>

      {/* 主体 */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold" style={{ color: '#3a403c' }}>所有地图</h2>
          <p className="text-sm mt-1" style={{ color: '#8a928c' }}>共 {maps.length} 张地图</p>
        </div>

        {/* 地图卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {maps.map((map) => (
            <div
              key={map.id}
              onClick={() => router.push(`/map/${map.id}`)}
              className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
              style={{ borderColor: '#e0e4dc' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#78a587'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0e4dc'; }}
            >
              {/* 缩略图区域 */}
              <div className="h-36 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f2eee8 0%, #ece7e0 100%)' }}>
                <div className="text-center">
                  <MapPin className="w-10 h-10 mx-auto mb-1" style={{ color: '#78a587', opacity: 0.3 }} />
                  <p className="text-xs font-mono" style={{ color: '#aab2ac' }}>{map.annotation_count} 个标注</p>
                </div>
              </div>

              {/* 信息区域 */}
              <div className="p-4">
                <h3 className="font-semibold text-sm truncate" style={{ color: '#3a403c' }}>{map.name}</h3>
                {map.description && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: '#8a928c' }}>{map.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: '#8a928c' }}>
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
              <MapPin className="w-12 h-12 mx-auto mb-3" style={{ color: '#d0d4ce' }} />
              <p style={{ color: '#aab2ac' }}>暂无地图</p>
            </div>
          )}
        </div>
      </main>

      {/* Deerflow 署名 */}
      <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer"
         className="fixed bottom-4 right-4 text-[10px] tracking-widest uppercase transition-colors duration-300"
         style={{ color: 'rgba(140,130,115,0.4)' }}>
        Deerflow
      </a>
    </div>
  );
}