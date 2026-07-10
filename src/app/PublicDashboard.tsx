'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { MapProject } from '@/lib/types';
import { ArrowUpRight, Layers, Loader2, LogIn, MapPinned, ScrollText } from 'lucide-react';

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
    return () => { active = false; };
  }, []);

  const thumbGradients = [
    'linear-gradient(135deg, #f0ebe4 0%, #e5ddd2 58%, #d9cec0 100%)',
    'linear-gradient(135deg, #e8ede6 0%, #dbe3d8 58%, #cbd7c6 100%)',
    'linear-gradient(135deg, #ece8e8 0%, #e3dedc 58%, #d7d0cc 100%)',
    'linear-gradient(135deg, #eceae4 0%, #e0d9ce 58%, #d2c9bb 100%)',
    'linear-gradient(135deg, #e5e3de 0%, #d7d4ce 58%, #c7c2ba 100%)',
  ];

  const totalAnnotations = maps.reduce((sum, map) => sum + map.annotation_count, 0);
  const featuredMaps = maps.slice(0, 2);
  const hasMaps = maps.length > 0;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-default)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="sticky top-0 z-50 h-14 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)]"
            style={{ background: 'var(--primary-default)', color: 'var(--text-inverse)' }}
          >
            <MapPinned className="w-4 h-4" />
          </div>
          <span className="font-semibold text-[15px] text-[var(--text-primary)] truncate">MapMark 公开地图</span>
        </div>
        <a
          href="/admin"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          后台管理
        </a>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <section className={`grid gap-4 ${hasMaps ? 'lg:grid-cols-[1.28fr_0.72fr]' : ''}`}>
          <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Public Directory</div>
                <h2 className="mt-1.5 text-[15px] leading-none text-[var(--text-primary)]">公开地图</h2>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-px bg-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
              <div className="px-3 py-3 bg-[var(--surface-primary)]">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">地图数量</div>
                <div className="mt-2 text-[24px] leading-none text-[var(--text-primary)]">{maps.length}</div>
              </div>
              <div className="px-3 py-3 bg-[var(--surface-primary)]">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">标注总数</div>
                <div className="mt-2 text-[24px] leading-none text-[var(--text-primary)]">{totalAnnotations}</div>
              </div>
              <div className="px-3 py-3 bg-[var(--surface-primary)]">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">近期活跃</div>
                <div className="mt-2 text-[24px] leading-none text-[var(--text-primary)]">{featuredMaps.length}</div>
              </div>
            </div>
          </div>

          {hasMaps && (
            <div className="grid gap-px border border-[var(--border-subtle)] bg-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden">
              {featuredMaps.map((map, idx) => (
                <div key={map.id} className="bg-[var(--surface-primary)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)] mb-2">最近更新 {String(idx + 1).padStart(2, '0')}</div>
                  <h3 className="text-[16px] leading-tight text-[var(--text-primary)]">{map.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                    {map.description || '公开地图项目，适合快速浏览主要标注与更新内容。'}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2 text-[10px] font-semibold tracking-[0.14em] text-[var(--text-tertiary)]">
                    <span>{map.annotation_count} 个标注</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">全部地图</h3>
            <div className="hidden px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] md:block bg-[var(--surface-secondary)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
              共 {maps.length} 张
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maps.map((map, idx) => (
              <button
                key={map.id}
                type="button"
                onClick={() => router.push(`/map/${map.id}`)}
                className="group flex flex-col min-h-[220px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-left rounded-[var(--radius-lg)] overflow-hidden transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-default)]"
              >
                <div className="flex items-center justify-between px-3.5 pt-3">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-[var(--text-tertiary)]">{String(idx + 1).padStart(2, '0')}</div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-[var(--text-tertiary)]" />
                </div>
                <div
                  className="flex items-center justify-center min-h-[104px] mx-3.5 mt-2.5 border border-[var(--border-subtle)] rounded-[var(--radius-md)]"
                  style={{ background: thumbGradients[idx % thumbGradients.length] }}
                >
                  <MapPinned className="h-5 w-5 text-[rgba(80,60,40,0.32)]" />
                </div>
                <div className="p-3.5 flex-1">
                  <h4 className="line-clamp-1 text-[16px] leading-tight text-[var(--text-primary)]">{map.name}</h4>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[var(--text-secondary)]">
                    {map.description || '整理后的地图项目'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3 w-3" />
                      {map.annotation_count} 条
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {maps.length === 0 && (
              <div className="col-span-full px-6 py-14 text-center bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
                <ScrollText className="mx-auto mb-4 h-12 w-12 text-[var(--text-tertiary)]" />
                <p className="text-lg text-[var(--text-secondary)]">暂无地图</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
