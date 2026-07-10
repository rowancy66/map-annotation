'use client';

import { useState, useCallback, useMemo, use, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMapData } from '@/hooks/useMapData';
import InfoCard from '@/components/map/InfoCard';
import AnnotationList from '@/components/map/AnnotationList';
import WorkbenchHeader from '@/components/map/workbench/WorkbenchHeader';
import WorkbenchSidebarToggle from '@/components/map/workbench/WorkbenchSidebarToggle';

import { Annotation } from '@/lib/types';
import { Loader2, LogIn, Search, X, ArrowLeft, MapPin, Tag } from 'lucide-react';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>加载地图数据...</p>
      </div>
    </div>
  ),
});

export default function PublicMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { mapProject, annotations, loading } = useMapData(false, id);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNames, setShowNames] = useState(true);

  const filteredAnnotations = useMemo(() => {
    if (!searchQuery.trim()) return annotations;
    const q = searchQuery.toLowerCase();
    return annotations.filter((a) =>
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q))
    );
  }, [annotations, searchQuery]);

  // Sync showNames from map settings once loaded
  useEffect(() => {
    if (mapProject) {
      setShowNames(mapProject.settings.showNames !== false);
    }
  }, [mapProject]);

  const annotationTypeCounts = useMemo(() => {
    return annotations.reduce(
      (counts, item) => {
        counts[item.type] += 1;
        return counts;
      },
      { point: 0, line: 0, polygon: 0, text: 0 }
    );
  }, [annotations]);

  const fieldNameMap = useMemo(() => {
    const m = new Map<string, string>();
    mapProject?.field_templates?.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [mapProject]);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
        <div className="h-12 shrink-0 border-b" style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 skeleton-shimmer" />
            <div className="w-40 h-4 skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workbench-shell">
      <div className="paper-panel workbench-frame">
        <WorkbenchHeader
          left={(
            <Link
              href="/map"
              className="ghost-button workbench-hard-edge flex items-center gap-2.5 px-2.5 py-2"
              title="返回地图页"
              aria-label="返回地图页"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="flex h-8 w-8 items-center justify-center border" style={{ background: 'rgba(10,75,63,0.08)', borderColor: 'var(--border-strong)' }}>
                <MapPin className="h-4 w-4" style={{ color: 'var(--primary)' }} aria-hidden="true" />
              </div>
              <div className="min-w-0 text-left">
                <h1 className="truncate text-[13px] font-semibold md:text-[14px]" style={{ color: 'var(--ink)' }}>
                  {mapProject?.name || '地图标注平台'}
                </h1>
                <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--faint)' }}>
                  地图浏览
                </div>
              </div>
            </Link>
          )}
          center={(
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--faint)' }} aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索名称或描述"
                className="w-full py-2.5 pl-10 pr-10 text-sm outline-none transition workbench-hard-edge workbench-field"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="清除搜索"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition"
                  style={{ color: 'var(--faint)' }}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          right={(
            <>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowNames(!showNames)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors workbench-hard-edge"
                  style={{ color: showNames ? 'var(--primary)' : 'var(--text-tertiary)' }}
                  aria-label={showNames ? '隐藏标注名称' : '显示标注名称'}
                >
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">名称</span>
                  <span
                    className="relative inline-block h-4 w-7 shrink-0 rounded-full border transition-colors duration-200"
                    style={{
                      background: showNames ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                      borderColor: showNames ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    <span
                      className="absolute top-[2px] block h-[10px] w-[10px] rounded-full bg-white transition-all duration-200 shadow-sm"
                      style={{ left: showNames ? 'calc(100% - 12px)' : '2px' }}
                    />
                  </span>
                </button>
                <div className="hidden text-[11px] font-medium uppercase tracking-[0.08em] md:block" style={{ color: 'var(--faint)' }}>
                  {annotations.length} 项标注
                </div>
              </div>
              <Link
                href={`/admin?mapId=${id}`}
                className="ghost-button workbench-hard-edge flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">后台管理</span>
              </Link>
            </>
          )}
        />

        <div className="relative flex flex-1 overflow-hidden">
          <div
            className={`relative z-30 shrink-0 overflow-hidden transition-all duration-300 ${
              sidebarOpen ? 'w-[304px] opacity-100' : 'w-0 opacity-0'
            }`}
          >
            <div className="workbench-sidebar workbench-hard-edge flex h-full w-[304px] flex-col">
              <div className="flex h-full flex-col">
                <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>标注索引</h2>
                      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                        点 {annotationTypeCounts.point} · 线 {annotationTypeCounts.line} · 面 {annotationTypeCounts.polygon}
                      </p>
                    </div>
                    <div className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>{filteredAnnotations.length} 项</div>
                  </div>
                  {searchQuery && (
                    <p className="mt-3 text-xs" style={{ color: 'var(--faint)' }}>找到 {filteredAnnotations.length} 条结果</p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  <AnnotationList
                    annotations={filteredAnnotations}
                    selectedAnnotation={selectedAnnotation}
                    onAnnotationClick={handleAnnotationClick}
                    readOnly={true}
                    fieldNameMap={fieldNameMap}
                  />
                </div>
              </div>
            </div>
          </div>

          <WorkbenchSidebarToggle
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            offset={304}
          />

          <div className="flex-1 relative min-w-0">
            <MapView
              annotations={filteredAnnotations}
              onAnnotationClick={handleAnnotationClick}
              drawMode="none"
              onDrawModeChange={() => {}}
              selectedAnnotation={selectedAnnotation}
              editable={false}
              showNames={showNames}
              searchOverlayClassName="left-14 sm:left-16"
              sidebarOpen={sidebarOpen}
            />

            <div className="absolute right-5 top-16 z-[1000]">
              {selectedAnnotation && mapProject && (
                <InfoCard
                  annotation={selectedAnnotation}
                  fieldTemplates={mapProject.field_templates}
                  onClose={() => setSelectedAnnotation(null)}
                  onSave={async (a) => a}
                  onDelete={async () => {}}
                  readOnly={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
