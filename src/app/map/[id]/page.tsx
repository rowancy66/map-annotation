'use client';

import { useState, useCallback, useMemo, use } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMapData } from '@/hooks/useMapData';
import InfoCard from '@/components/map/InfoCard';
import { Annotation } from '@/lib/types';
import { Loader2, LogIn, Search, X, ChevronLeft, ChevronRight, ArrowLeft, MapPin } from 'lucide-react';

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

  const filteredAnnotations = useMemo(() => {
    if (!searchQuery.trim()) return annotations;
    const q = searchQuery.toLowerCase();
    return annotations.filter((a) =>
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q))
    );
  }, [annotations, searchQuery]);

  const fieldNameMap = useMemo(() => {
    const m = new Map<string, string>();
    mapProject?.field_templates?.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [mapProject]);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation);
  }, []);

  const groupColorMap = useMemo(() => new Map<string, string>(), []);

  if (loading) {
    return (
      <div className="h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
        <div className="h-12 shrink-0" style={{ background: 'var(--primary)' }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
            <div className="w-40 h-4 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* 顶部栏 */}
      <header className="h-12 shrink-0 flex items-center justify-between px-4 z-50"
        style={{ background: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 px-2 py-1 rounded transition"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs">返回</span>
          </Link>
          <div className="flex items-center justify-center w-7 h-7 rounded" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-sm font-semibold tracking-wide" style={{ color: 'white' }}>
            {mapProject?.name || '地图标注平台'}
          </h1>
        </div>
        <Link
          href="/admin"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
          style={{ color: 'white', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        >
          <LogIn className="w-3.5 h-3.5" />
          后台管理
        </Link>
      </header>

      {/* 主体 */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 侧边栏 */}
        <div
          className={`absolute left-0 top-0 bottom-0 z-40 transition-all duration-300 ${
            sidebarOpen ? 'w-80' : 'w-0'
          } overflow-hidden`}
          style={{ borderRight: sidebarOpen ? '1px solid var(--border)' : 'none' }}
        >
          <div className="w-80 h-full flex flex-col" style={{ background: '#fafbfc' }}>
            {/* 侧边栏头部 */}
            <div className="px-4 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>标注列表</h2>
              <span className="text-xs font-mono" style={{ color: 'var(--faint)' }}>{annotations.length} 个</span>
            </div>

            {/* 搜索 */}
            <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--faint)' }} aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索编号、位置..."
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-lg outline-none transition"
                  style={{ border: '1px solid var(--border)', background: 'white', color: 'var(--ink)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,71,53,0.08)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} aria-label="清除搜索"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 transition"
                    style={{ color: 'var(--faint)' }}>
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs mt-1" style={{ color: 'var(--faint)' }}>找到 {filteredAnnotations.length} 条结果</p>
              )}
            </div>

            {/* 标注列表 */}
            <div className="flex-1 overflow-y-auto">
              {filteredAnnotations.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--faint)' }}>
                  <div className="text-2xl mb-2 opacity-30">🗺️</div>
                  {searchQuery ? '没有找到匹配的标注' : '暂无标注'}
                </div>
              ) : (
                <div>
                  {filteredAnnotations.map((anno) => (
                    <div
                      key={anno.id}
                      onClick={() => handleAnnotationClick(anno)}
                      className="cursor-pointer transition-all duration-150"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: selectedAnnotation?.id === anno.id ? 'var(--primary-light)' : 'transparent',
                        borderLeft: selectedAnnotation?.id === anno.id ? '3px solid var(--primary)' : '3px solid transparent',
                      }}
                    >
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{
                            background: anno.type === 'point' ? '#c0392b' :
                                        anno.type === 'line' ? '#2c6fbb' :
                                        anno.type === 'text' ? '#d4954e' : '#1a4735'
                          }} />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium truncate block" style={{ color: 'var(--ink)' }}>
                              {anno.name || '未命名'}
                            </span>
                            {anno.description && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{anno.description}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0" style={{
                            background: anno.type === 'point' ? 'rgba(192,57,43,0.08)' :
                                        anno.type === 'line' ? 'rgba(44,111,187,0.08)' :
                                        anno.type === 'text' ? 'rgba(212,148,78,0.08)' : 'rgba(26,71,53,0.08)',
                            color: anno.type === 'point' ? '#c0392b' :
                                   anno.type === 'line' ? '#2c6fbb' :
                                   anno.type === 'text' ? '#d4954e' : '#1a4735'
                          }}>
                            {anno.type === 'point' ? '点' : anno.type === 'line' ? '线' : anno.type === 'text' ? '文字' : '面'}
                          </span>
                        </div>
                        {anno.type === 'point' && anno.custom_fields.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2" style={{ marginLeft: '1.25rem' }}>
                            {anno.custom_fields.slice(0, 3).map((cf) => {
                              const name = fieldNameMap.get(cf.fieldId);
                              if (!name || cf.value == null) return null;
                              return (
                                <span key={cf.fieldId} className="px-2 py-0.5 rounded text-[10px] font-medium"
                                  style={{ background: 'var(--primary-light)', color: 'var(--muted)' }}>
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

        {/* 侧边栏开关 */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
          className="absolute top-3 z-40 shadow-md rounded-r-xl p-1.5 border border-l-0 transition-all duration-200"
          style={{
            left: sidebarOpen ? '320px' : '0',
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          {sidebarOpen
            ? <ChevronLeft className="w-4 h-4" style={{ color: 'var(--muted)' }} aria-hidden="true" />
            : <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} aria-hidden="true" />}
        </button>

        {/* 地图区域 */}
        <div className="flex-1 relative">
          <MapView
            annotations={annotations}
            onAnnotationClick={handleAnnotationClick}
            drawMode="none"
            onDrawModeChange={() => {}}
            selectedAnnotation={selectedAnnotation}
            editable={false}
          />

          {/* InfoCard */}
          <div className="absolute right-4 top-20 z-[1000]">
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

          {/* 底部提示 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[999] text-xs px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            点击标注查看详情 · 右键拖动地图
          </div>

          {/* Deerflow */}
          <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer"
             className="absolute bottom-3 right-3 z-[9999] text-[9px] tracking-widest uppercase transition-colors duration-300"
             style={{ color: 'rgba(107,114,128,0.3)' }}>
            Deerflow
          </a>
        </div>
      </div>
    </div>
  );
}