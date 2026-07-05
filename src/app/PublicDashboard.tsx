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
                <h1 className="text-[22px] leading-none" style={{ color: 'var(--ink)' }}>地图目录</h1>
              </div>
            </div>
            <a href="/admin" className="ghost-button inline-flex items-center gap-2 self-start px-4 py-2 text-xs font-semibold workbench-hard-edge md:self-auto">
              <LogIn className="h-3.5 w-3.5" />
              后台管理
            </a>
          </div>
        </header>

        <main className="pt-5">
          <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="paper-card border p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>Public Directory</div>
                  <h2 className="mt-2 text-[18px] leading-none" style={{ color: 'var(--ink)' }}>公开地图</h2>
                </div>
                <div className="min-w-[180px] border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>最后更新</div>
                  <div className="mt-2 text-lg leading-tight" style={{ color: 'var(--ink)' }}>
                    {latestUpdatedAt ? formatTime(latestUpdatedAt) : '暂无记录'}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-px md:grid-cols-3" style={{ background: 'var(--border)' }}>
                <div className="px-4 py-4" style={{ background: 'var(--surface-strong)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>地图数量</div>
                  <div className="mt-2 text-[28px] leading-none" style={{ color: 'var(--ink)' }}>{maps.length}</div>
                </div>
                <div className="px-4 py-4" style={{ background: 'var(--surface-strong)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>标注总数</div>
                  <div className="mt-2 text-[28px] leading-none" style={{ color: 'var(--ink)' }}>{totalAnnotations}</div>
                </div>
                <div className="px-4 py-4" style={{ background: 'var(--surface-strong)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>近期活跃</div>
                  <div className="mt-2 text-[28px] leading-none" style={{ color: 'var(--ink)' }}>{featuredMaps.length}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {featuredMaps.map((map, idx) => (
                <div key={map.id} className="paper-card p-5">
                  <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--faint)' }}>最近更新 {String(idx + 1).padStart(2, '0')}</div>
                  <h3 className="text-2xl leading-tight" style={{ color: 'var(--ink)' }}>{map.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                    {map.description || '公开地图项目，适合快速浏览主要标注与更新内容。'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold tracking-[0.14em]" style={{ color: 'var(--faint)' }}>
                    <span>{map.annotation_count} 个标注</span>
                    <span>更新于 {new Date(map.updated_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h3 className="text-[18px] font-semibold" style={{ color: 'var(--ink)' }}>全部地图</h3>
              <div className="hidden px-4 py-2 text-xs font-semibold tracking-[0.12em] md:block" style={{ background: 'var(--surface-muted)', color: 'var(--faint)', border: '1px solid var(--border)' }}>
                共 {maps.length} 张
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {maps.map((map, idx) => (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => router.push(`/map/${map.id}`)}
                  className="paper-card group overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="relative h-44 p-5" style={{ background: thumbGradients[idx % thumbGradients.length] }}>
                    <div className="absolute inset-[14px] border" style={{ borderColor: 'rgba(32,32,32,0.08)' }} />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ background: 'rgba(255,255,255,0.48)', color: 'var(--faint)', border: '1px solid rgba(32,32,32,0.08)' }}>
                          编号 {String(idx + 1).padStart(2, '0')}
                        </span>
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: 'rgba(23,23,23,0.55)' }} />
                      </div>
                      <div>
                        <MapPinned className="mb-3 h-10 w-10" style={{ color: 'rgba(31,52,45,0.28)' }} />
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'rgba(23,23,23,0.5)' }}>
                          {map.annotation_count} 个标注
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="line-clamp-1 text-2xl leading-tight" style={{ color: 'var(--ink)' }}>{map.name}</h4>
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                      {map.description || '整理后的地图项目，包含公开标注、位置说明与阅览信息。'}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1" style={{ background: 'rgba(23,23,23,0.04)' }}>
                        <Layers className="h-3.5 w-3.5" />
                        {map.annotation_count} 条
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1" style={{ background: 'rgba(23,23,23,0.04)' }}>
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(map.updated_at)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {maps.length === 0 && (
                <div className="paper-card col-span-full px-6 py-20 text-center">
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
