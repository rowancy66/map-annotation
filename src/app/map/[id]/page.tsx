'use client';

import { useState, useCallback, useMemo, use, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMapData } from '@/hooks/useMapData';
import InfoCard from '@/components/map/InfoCard';
import WorkbenchHeader from '@/components/map/workbench/WorkbenchHeader';
import WorkbenchSidebarToggle from '@/components/map/workbench/WorkbenchSidebarToggle';

import { Annotation } from '@/lib/types';
import { Loader2, LogIn, Search, X, ArrowLeft, MapPin, ScanSearch } from 'lucide-react';

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
  const listItemRefs = useRef(new Map<string, HTMLDivElement>());

  const filteredAnnotations = useMemo(() => {
    if (!searchQuery.trim()) return annotations;
    const q = searchQuery.toLowerCase();
    return annotations.filter((a) =>
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q))
    );
  }, [annotations, searchQuery]);

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

  useEffect(() => {
    if (!selectedAnnotation) return;
    const element = listItemRefs.current.get(selectedAnnotation.id);
    if (!element) return;
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedAnnotation, filteredAnnotations]);

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
            <>
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
            </>
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
              <div className="hidden text-[11px] font-medium uppercase tracking-[0.08em] md:block" style={{ color: 'var(--faint)' }}>
                {annotations.length} 项标注
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

        <div className="relative flex flex-1 overflow-hidden p-1.5">
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
                  <div className="mt-4 lg:hidden">
                    <div className="relative">
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
                  </div>
                  {searchQuery && (
                    <p className="mt-3 text-xs" style={{ color: 'var(--faint)' }}>找到 {filteredAnnotations.length} 条结果</p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredAnnotations.length === 0 ? (
                    <div className="border-b p-8 text-center text-sm" style={{ color: 'var(--faint)', borderColor: 'var(--border)' }}>
                      <ScanSearch className="mx-auto mb-3 h-8 w-8 opacity-40" />
                      {searchQuery ? '没有找到匹配的标注' : '暂无标注'}
                    </div>
                  ) : (
                    <div className="p-2.5">
                      {filteredAnnotations.map((anno) => (
                        <div
                          key={anno.id}
                          ref={(node) => {
                            if (node) listItemRefs.current.set(anno.id, node);
                            else listItemRefs.current.delete(anno.id);
                          }}
                        onClick={() => handleAnnotationClick(anno)}
                          className="cursor-pointer transition-all duration-200"
                          style={{
                            marginBottom: '8px',
                            background: selectedAnnotation?.id === anno.id ? 'rgba(10,75,63,0.05)' : 'var(--surface-strong)',
                            border: selectedAnnotation?.id === anno.id ? '1px solid rgba(10,75,63,0.22)' : '1px solid var(--border)',
                            boxShadow: 'none',
                            transform: selectedAnnotation?.id === anno.id ? 'translateY(-1px)' : 'translateY(0)',
                          }}
                        >
                          <div className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="h-2 w-2 shrink-0" style={{
                                background: anno.type === 'point' ? '#c0392b' :
                                  anno.type === 'line' ? '#7a6b55' :
                                    anno.type === 'text' ? '#d4954e' : '#1a4735'
                              }} />
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: selectedAnnotation?.id === anno.id ? 'var(--accent)' : 'var(--faint)' }}>
                                  {anno.id.slice(0, 8)}
                                </div>
                                <span className="text-sm font-medium truncate block" style={{ color: 'var(--ink)' }}>
                                  {anno.name || '未命名'}
                                </span>
                                {anno.description && (
                                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{anno.description}</p>
                                )}
                              </div>
                              <span className="shrink-0 px-2 py-1 text-[10px] font-medium" style={{
                                background: anno.type === 'point' ? 'rgba(192,57,43,0.08)' :
                                  anno.type === 'line' ? 'rgba(122,107,85,0.08)' :
                                    anno.type === 'text' ? 'rgba(212,148,78,0.08)' : 'rgba(26,71,53,0.08)',
                                color: anno.type === 'point' ? '#c0392b' :
                                  anno.type === 'line' ? '#7a6b55' :
                                    anno.type === 'text' ? '#d4954e' : '#1a4735'
                              }}>
                                {anno.type === 'point' ? '点' : anno.type === 'line' ? '线' : anno.type === 'text' ? '文字' : '面'}
                              </span>
                            </div>
                            {anno.type === 'point' && anno.custom_fields.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5" style={{ marginLeft: '1.25rem' }}>
                                {anno.custom_fields.slice(0, 3).map((cf) => {
                                  const name = fieldNameMap.get(cf.fieldId);
                                  if (!name || cf.value == null) return null;
                                  return (
                                    <span
                                      key={cf.fieldId}
                                      className="px-2 py-0.5 text-[10px] font-medium"
                                      style={{ background: selectedAnnotation?.id === anno.id ? 'rgba(184,155,114,0.14)' : 'rgba(23,23,23,0.04)', color: 'var(--muted)' }}
                                    >
                                      {name}: {String(cf.value)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
              showNames={mapProject?.settings.showNames !== false}
              searchOverlayClassName="left-14 sm:left-16"
            />

            <div className="absolute right-5 top-24 z-[1000]">
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
