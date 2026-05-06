'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import DrawingToolbar from '@/components/map/DrawingToolbar';
import InfoCard from '@/components/map/InfoCard';
import FieldTemplateManager from '@/components/map/FieldTemplateManager';
import ImportDialog from '@/components/import/ImportDialog';
import {
  Annotation,
  DrawMode,
  AnnotationType,
  MapProject,
  FieldTemplate,
  PointStyle,
  LineStyle,
  PolygonStyle,
  CustomFieldValue,
} from '@/lib/types';
import {
  Upload,
  Download,
  LogOut,
  Settings,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import L from 'leaflet';

// 动态导入地图组件（避免 SSR 问题）
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  ),
});

export default function MapEditorPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [mapProject, setMapProject] = useState<MapProject | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // 加载地图项目和标注数据
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // 获取或创建地图项目
    let { data: maps } = await supabase
      .from('maps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    let map: MapProject;
    if (!maps || maps.length === 0) {
      // 创建默认地图
      const { data: newMap, error } = await supabase
        .from('maps')
        .insert({
          user_id: user.id,
          name: '我的地图',
          description: '',
          center: [116.4074, 39.9042],
          zoom: 12,
          field_templates: [],
        })
        .select()
        .single();

      if (error) {
        console.error('创建地图失败:', error);
        setLoading(false);
        return;
      }
      map = newMap as unknown as MapProject;
    } else {
      map = maps[0] as unknown as MapProject;
    }

    setMapProject(map);

    // 加载标注
    const { data: annos } = await supabase
      .from('annotations')
      .select('*')
      .eq('map_id', map.id)
      .order('created_at', { ascending: true });

    setAnnotations((annos as unknown as Annotation[]) || []);
    setLoading(false);
  };

  // 保存标注到 Supabase
  const saveAnnotation = async (annotation: Annotation) => {
    const { data, error } = await supabase
      .from('annotations')
      .upsert({
        id: annotation.id,
        map_id: annotation.map_id,
        type: annotation.type,
        geometry: annotation.geometry,
        name: annotation.name,
        description: annotation.description,
        style: annotation.style,
        custom_fields: annotation.custom_fields,
      })
      .select()
      .single();

    if (error) {
      console.error('保存标注失败:', error);
    }
    return data;
  };

  // 地图点击 - 添加点
  const handleMapClick = useCallback(async (latlng: L.LatLng) => {
    if (drawMode !== 'point' || !mapProject) return;

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      map_id: mapProject.id,
      type: 'point',
      geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
      name: '新标注点',
      description: '',
      style: { color: '#EF4444', icon: 'map-pin', size: 3 } as PointStyle,
      custom_fields: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = await saveAnnotation(annotation);
    setAnnotations((prev) => [...prev, saved ? (saved as unknown as Annotation) : annotation]);
    setSelectedAnnotation(saved ? (saved as unknown as Annotation) : annotation);
    setDrawMode('none');
  }, [drawMode, mapProject]);

  // 绘制完成 - 线/面
  const handleDrawComplete = useCallback(async (type: AnnotationType, latlngs: L.LatLng[]) => {
    if (!mapProject) return;

    const coordinates = latlngs.map((ll) => [ll.lng, ll.lat] as [number, number]);

    let annotation: Annotation;
    if (type === 'line') {
      annotation = {
        id: crypto.randomUUID(),
        map_id: mapProject.id,
        type: 'line',
        geometry: { type: 'LineString', coordinates },
        name: '新线路',
        description: '',
        style: { color: '#3B82F6', width: 3 } as LineStyle,
        custom_fields: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else {
      annotation = {
        id: crypto.randomUUID(),
        map_id: mapProject.id,
        type: 'polygon',
        geometry: { type: 'Polygon', coordinates },
        name: '新区域',
        description: '',
        style: { color: '#8B5CF6', fillColor: '#8B5CF6', fillOpacity: 0.3, width: 2 } as PolygonStyle,
        custom_fields: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const saved = await saveAnnotation(annotation);
    setAnnotations((prev) => [...prev, saved ? (saved as unknown as Annotation) : annotation]);
    setSelectedAnnotation(saved ? (saved as unknown as Annotation) : annotation);
  }, [mapProject]);

  // 点击标注
  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation);
  }, []);

  // 保存编辑
  const handleSaveAnnotation = useCallback(async (updated: Annotation) => {
    const saved = await saveAnnotation(updated);
    setAnnotations((prev) =>
      prev.map((a) => (a.id === updated.id ? (saved ? (saved as unknown as Annotation) : updated) : a))
    );
    setSelectedAnnotation(saved ? (saved as unknown as Annotation) : updated);
  }, []);

  // 删除标注
  const handleDeleteAnnotation = useCallback(async (id: string) => {
    await supabase.from('annotations').delete().eq('id', id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setSelectedAnnotation(null);
  }, []);

  // 批量导入
  const handleImport = useCallback(async (items: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[]) => {
    const newAnnotations: Annotation[] = items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // 批量保存到 Supabase
    const { data } = await supabase
      .from('annotations')
      .insert(newAnnotations)
      .select();

    if (data) {
      setAnnotations((prev) => [...prev, ...(data as unknown as Annotation[])]);
    } else {
      setAnnotations((prev) => [...prev, ...newAnnotations]);
    }
  }, []);

  // 导出 Excel/CSV
  const handleExport = useCallback((format: 'xlsx' | 'csv') => {
    const pointAnnotations = annotations.filter((a) => a.type === 'point');
    if (pointAnnotations.length === 0) {
      alert('没有可导出的点标注');
      return;
    }

    const templates = mapProject?.field_templates || [];

    const rows = pointAnnotations.map((a) => {
      const geom = a.geometry as { type: string; coordinates: [number, number] };
      const row: Record<string, string | number> = {
        名称: a.name,
        描述: a.description,
        经度: geom.coordinates[0],
        纬度: geom.coordinates[1],
        类型: '点',
        创建时间: a.created_at,
      };

      // 添加自定义字段
      templates.forEach((field) => {
        const val = a.custom_fields.find((cf) => cf.fieldId === field.id)?.value;
        row[field.name] = val?.toString() || '';
      });

      return row;
    });

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '标注数据');
      XLSX.writeFile(wb, `地图标注_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
    } else {
      const csv = Papa.unparse(rows);
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `地图标注_${new Date().toLocaleDateString('zh-CN')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [annotations, mapProject]);

  // 更新字段模板
  const handleFieldTemplatesChange = useCallback(async (templates: FieldTemplate[]) => {
    if (!mapProject) return;
    const updated = { ...mapProject, field_templates: templates };
    await supabase.from('maps').update({ field_templates: templates }).eq('id', mapProject.id);
    setMapProject(updated);
  }, [mapProject]);

  // 标注统计
  const annotationCount = {
    point: annotations.filter((a) => a.type === 'point').length,
    line: annotations.filter((a) => a.type === 'line').length,
    polygon: annotations.filter((a) => a.type === 'polygon').length,
  };

  // 未登录或加载中
  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部栏 */}
      <header className="h-12 bg-white border-b flex items-center justify-between px-4 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-sm font-semibold text-gray-900">
            {mapProject?.name || '地图标注平台'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* 导入 */}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="批量导入"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">导入</span>
          </button>

          {/* 导出 */}
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="导出"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">导出</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => handleExport('xlsx')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-t-lg"
              >
                导出 Excel
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-b-lg"
              >
                导出 CSV
              </button>
            </div>
          </div>

          {/* 设置 */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition ${
              showSettings ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 用户 */}
          <div className="flex items-center gap-2 pl-2 border-l">
            <span className="text-xs text-gray-500 hidden sm:inline">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 主体 */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 侧边栏 */}
        <div
          className={`absolute left-0 top-0 bottom-0 z-40 bg-white border-r transition-all duration-300 ${
            sidebarOpen ? 'w-72' : 'w-0'
          } overflow-hidden`}
        >
          <div className="w-72 h-full flex flex-col">
            {/* 侧边栏标题 */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">标注列表</h2>
              <span className="text-xs text-gray-400">{annotations.length} 个</span>
            </div>

            {/* 标注列表 */}
            <div className="flex-1 overflow-y-auto">
              {annotations.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  暂无标注<br />点击左侧工具在地图上添加
                </div>
              ) : (
                <div className="divide-y">
                  {annotations.map((anno) => (
                    <button
                      key={anno.id}
                      onClick={() => setSelectedAnnotation(anno)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition ${
                        selectedAnnotation?.id === anno.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          anno.type === 'point' ? 'bg-red-500' :
                          anno.type === 'line' ? 'bg-blue-500' : 'bg-purple-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {anno.name || '未命名'}
                        </span>
                      </div>
                      {anno.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate pl-4">{anno.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 字段模板管理 */}
            {showSettings && mapProject && (
              <div className="border-t">
                <FieldTemplateManager
                  templates={mapProject.field_templates}
                  onChange={handleFieldTemplatesChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* 侧边栏切换 */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-2 z-40 bg-white shadow rounded-r-lg p-1 border border-l-0 hover:bg-gray-50 transition"
          style={{ left: sidebarOpen ? '288px' : '0' }}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* 地图 */}
        <div className="flex-1 relative">
          <MapView
            annotations={annotations}
            onMapClick={handleMapClick}
            onMapDrawComplete={handleDrawComplete}
            onAnnotationClick={handleAnnotationClick}
            drawMode={drawMode}
            onDrawModeChange={setDrawMode}
            selectedAnnotation={selectedAnnotation}
          />

          {/* 绘制工具栏 */}
          <DrawingToolbar
            drawMode={drawMode}
            onDrawModeChange={setDrawMode}
            annotationCount={annotationCount}
          />

          {/* 信息卡片 */}
          {selectedAnnotation && mapProject && (
            <InfoCard
              annotation={selectedAnnotation}
              fieldTemplates={mapProject.field_templates}
              onClose={() => setSelectedAnnotation(null)}
              onSave={handleSaveAnnotation}
              onDelete={handleDeleteAnnotation}
            />
          )}
        </div>
      </div>

      {/* 导入对话框 */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        fieldTemplates={mapProject?.field_templates || []}
        mapId={mapProject?.id || ''}
      />
    </div>
  );
}
