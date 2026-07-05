'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { MapProject } from '@/lib/types';
import { ArrowUpRight, Clock, Layers, Loader2, LogIn, MapPinned, ScrollText } from 'lucide-react';

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
    'linear-gradient(135deg, #f3ede3 0%, #e7dccb 55%, #d9c6ac 100%)',
    'linear-gradient(135deg, #f4f0e8 0%, #e5e0d5 55%, #d5ccc0 100%)',
    'linear-gradient(135deg, #eef1f0 0%, #dde4df 55%, #c8d2cb 100%)',
    'linear-gradient(135deg, #f0ece6 0%, #e4ddd3 55%, #cdbfae 100%)',
    'linear-gradient(135deg, #edf0f1 0%, #dce1e4 55%, #c6ced4 100%)',
  ];

  const totalAnnotations = maps.reduce((sum, map) => sum + map.annotation_count, 0);
  const featuredMaps = maps.slice(0, 2);
  const latestUpdatedAt = maps[0]?.updated_at;
  const hasMaps = maps.length > 0;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-frame">
        <header className="admin-strip">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="admin-strip-mark">
                <MapPinned className="h-4 w-4" />
              </div>
              <div>
                <div className="display-label">Public Access</div>
                <h1 className="text-[16px] leading-none" style={{ color: 'var(--ink)' }}>地图目录</h1>
              </div>
            </div>
            <a href="/admin" className="ghost-button inline-flex items-center gap-2 self-start px-3 py-1.5 text-[11px] font-semibold workbench-hard-edge md:self-auto">
              <LogIn className="h-3 w-3" />
              后台管理
            </a>
          </div>
        </header>

        <main className="pt-4">
          <section className={`grid gap-4 ${hasMaps ? 'lg:grid-cols-[1.28fr_0.72fr]' : ''}`}>
            <div className="paper-card border p-4">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>Public Directory</div>
                  <h2 className="mt-1.5 text-[15px] leading-none" style={{ color: 'var(--ink)' }}>公开地图</h2>
                </div>
                <div className="min-w-[172px] border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>最后更新</div>
                  <div className="mt-2 text-[15px] leading-tight" style={{ color: 'var(--ink)' }}>
                    {latestUpdatedAt ? formatTime(latestUpdatedAt) : '暂无记录'}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-px" style={{ background: 'var(--border)' }}>
                <div className="px-3 py-3" style={{ background: 'var(--surface-strong)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>地图数量</div>
                  <div className="mt-2 text-[24px] leading-none" style={{ color: 'var(--ink)' }}>{maps.length}</div>
                </div>
                <div className="px-3 py-3" style={{ background: 'var(--surface-strong)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>标注总数</div>
                  <div className="mt-2 text-[24px] leading-none" style={{ color: 'var(--ink)' }}>{totalAnnotations}</div>
                </div>
                <div className="px-3 py-3" style={{ background: 'var(--surface-strong)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>近期活跃</div>
                  <div className="mt-2 text-[24px] leading-none" style={{ color: 'var(--ink)' }}>{featuredMaps.length}</div>
                </div>
              </div>
            </div>

            {hasMaps && (
              <div className="public-feature-list">
                {featuredMaps.map((map, idx) => (
                  <div key={map.id} className="public-feature-row">
                    <div className="public-feature-kicker">最近更新 {String(idx + 1).padStart(2, '0')}</div>
                    <h3 className="text-[16px] leading-tight" style={{ color: 'var(--ink)' }}>{map.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-5" style={{ color: 'var(--muted)' }}>
                      {map.description || '公开地图项目，适合快速浏览主要标注与更新内容。'}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2 text-[10px] font-semibold tracking-[0.14em]" style={{ color: 'var(--faint)' }}>
                      <span>{map.annotation_count} 个标注</span>
                      <span>更新于 {new Date(map.updated_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between gap-4">
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>全部地图</h3>
              <div className="hidden px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] md:block" style={{ background: 'var(--surface-muted)', color: 'var(--faint)', border: '1px solid var(--border)' }}>
                共 {maps.length} 张
              </div>
            </div>

            <div className="public-map-grid">
              {maps.map((map, idx) => (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => router.push(`/map/${map.id}`)}
                  className="public-map-card group"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="public-map-card-top">
                    <div className="public-map-index">{String(idx + 1).padStart(2, '0')}</div>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: 'rgba(23,23,23,0.55)' }} />
                  </div>
                  <div className="public-map-card-thumb" style={{ background: thumbGradients[idx % thumbGradients.length] }}>
                    <MapPinned className="h-5 w-5" style={{ color: 'rgba(31,52,45,0.32)' }} />
                  </div>
                  <div className="public-map-main">
                    <h4 className="line-clamp-1 text-[16px] leading-tight" style={{ color: 'var(--ink)' }}>{map.name}</h4>
                    <p className="mt-1 line-clamp-2 text-[12px]" style={{ color: 'var(--muted)' }}>
                      {map.description || '整理后的地图项目'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="h-3 w-3" />
                        {map.annotation_count} 条
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatTime(map.updated_at)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {maps.length === 0 && (
                <div className="paper-card col-span-full px-6 py-14 text-center">
                  <ScrollText className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--faint)' }} />
                  <p className="text-lg" style={{ color: 'var(--muted)' }}>暂无地图</p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
