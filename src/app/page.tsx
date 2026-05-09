'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMapData } from '@/hooks/useMapData';
import InfoCard from '@/components/map/InfoCard';
import { Annotation } from '@/lib/types';
import { Loader2, LogIn, MapPinned, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-400">加载地图数据...</p>
      </div>
    </div>
  ),
});

export default function PublicMapPage() {
  const { mapProject, annotations, loading } = useMapData(null);
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

  const fieldTemplateMap = useMemo(() => {
    const map = new Map<string, Annotation['custom_fields'][0]>();
    if (mapProject?.field_templates) {
      mapProject.field_templates.forEach((t) => {
        map.set(t.id, { fieldId: t.id, value: null });
      });
    }
    return map;
  }, [mapProject]);

  const annotationCount = useMemo(() => ({
    point: annotations.filter((a) => a.type === 'point').length,
    line: annotations.filter((a) => a.type === 'line').length,
    polygon: annotations.filter((a) => a.type === 'polygon').length,
  }), [annotations]);

  const fieldNameMap = useMemo(() => {
    const m = new Map<string, string>();
    mapProject?.field_templates?.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [mapProject]);

  const fieldSortOrderMap = useMemo(() => {
    const m = new Map<string, number>();
    mapProject?.field_templates?.forEach((t) => m.set(t.id, t.sort_order ?? 0));
    return m;
  }, [mapProject]);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="h-12 bg-white/80 border-b border-gray-100 shrink-0" />
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
    <div className="h-screen flex flex-col">
      {/* 顶部栏 */}
      <header className="h-12 bg-white/70 backdrop-blur-xl border-b border-white/30 shadow-sm flex items-center justify-between px-4 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-200">
            <MapPinned className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-sm font-semibold text-gray-900">
            {mapProject?.name || '地图标注平台'}
          </h1>
        </div>
        <Link
          href="/admin"
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-gray-500 hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <LogIn className="w-4 h-4" aria-hidden="true" />
          后台管理
        </Link>
      </header>

      {/* 主体 */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 侧边栏 */}
        <div
          className={`absolute left-0 top-0 bottom-0 z-40 bg-white/95 backdrop-blur-sm border-r border-gray-100 shadow-lg shadow-gray-200/30 transition-all duration-300 ${
            sidebarOpen ? 'w-80' : 'w-0'
          } overflow-hidden`}
        >
          <div className="w-80 h-full flex flex-col">
            {/* 侧边栏头部 */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-transparent to-blue-50/30">
              <h2 className="text-sm font-semibold text-gray-900">标注列表</h2>
              <span className="text-xs text-gray-400 font-mono">{annotations.length} 个</span>
            </div>

            {/* 搜索 */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索编号、位置..."
                  className="w-full pl-9 pr-8 py-2 bg-gray-50/80 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="清除搜索"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-gray-400 mt-1">找到 {filteredAnnotations.length} 条结果</p>
              )}
            </div>

            {/* 标注列表 */}
            <div className="flex-1 overflow-y-auto">
              {filteredAnnotations.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  <div className="text-3xl mb-3 opacity-30">📍</div>
                  {searchQuery ? '没有找到匹配的标注' : '暂无标注'}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredAnnotations.map((anno) => (
                    <div
                      key={anno.id}
                      onClick={() => handleAnnotationClick(anno)}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50/50 transition-all duration-150 cursor-pointer border-l-2 ${
                        selectedAnnotation?.id === anno.id
                          ? 'bg-blue-50/70 border-l-blue-500 shadow-sm'
                          : 'border-l-transparent hover:border-l-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          anno.type === 'point' ? 'bg-red-500 shadow-sm shadow-red-200' :
                          anno.type === 'line' ? 'bg-blue-500 shadow-sm shadow-blue-200' : 'bg-purple-500 shadow-sm shadow-purple-200'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-gray-900 truncate block">
                            {anno.name || '未命名'}
                          </span>
                          {anno.description && (
                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{anno.description}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          anno.type === 'point' ? 'bg-red-50 text-red-600' :
                          anno.type === 'line' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                        }`}>
                          {anno.type === 'point' ? '点' : anno.type === 'line' ? '线' : '面'}
                        </span>
                      </div>
                      {anno.type === 'point' && anno.custom_fields.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pl-9">
                          {[...anno.custom_fields]
                            .sort((a, b) => (fieldSortOrderMap.get(a.fieldId) ?? 0) - (fieldSortOrderMap.get(b.fieldId) ?? 0))
                            .filter(cf => fieldNameMap.get(cf.fieldId) !== '成交总价')
                            .filter(cf => cf.value != null)
                            .slice(0, 3)
                            .map((cf) => {
                            const name = fieldNameMap.get(cf.fieldId);
                            if (!name) return null;
                            return (
                              <span key={cf.fieldId} className="px-1.5 py-0.5 bg-gray-100/80 text-gray-500 rounded text-[10px]">
                                {name}: {String(cf.value)}
                              </span>
                            );
                          })}
                        </div>
                      )}
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
          className="absolute top-3 z-40 bg-white/90 backdrop-blur shadow-md rounded-r-xl p-1.5 border border-l-0 border-gray-100 hover:bg-gray-50 transition-all duration-200 hover:scale-105"
          style={{ left: sidebarOpen ? '320px' : '0' }}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-gray-500" aria-hidden="true" /> : <ChevronRight className="w-4 h-4 text-gray-500" aria-hidden="true" />}
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
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-white/70 backdrop-blur-md text-gray-400 px-4 py-2 rounded-xl shadow-lg border border-white/40 text-xs">
            点击标注查看详情 · 右键拖动地图
          </div>

          {/* Deerflow 署名 */}
          <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer"
             className="fixed bottom-3 right-3 z-[9999] text-[9px] text-gray-300/50 hover:text-gray-500/80 transition-colors duration-300 tracking-widest uppercase">
            Deerflow
          </a>
        </div>
      </div>
    </div>
  );
}
