'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMapData } from '@/hooks/useMapData';
import InfoCard from '@/components/map/InfoCard';
import { Annotation } from '@/lib/types';
import { Loader2, LogIn, MapPinned } from 'lucide-react';

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

      {/* 地图区域 */}
      <div className="flex-1 relative">
        <MapView
          annotations={annotations}
          onAnnotationClick={handleAnnotationClick}
          drawMode="none"
          onDrawModeChange={() => {}}
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
      </div>
    </div>
  );
}
