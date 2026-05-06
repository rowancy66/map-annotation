'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { DEFAULT_LAND_FIELD_TEMPLATES } from '@/lib/constants';
import {
  Upload,
  Download,
  LogOut,
  Settings,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Trash2,
  CheckSquare,
  Square,
  X,
  Move,
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

// 导出表头顺序（对齐 Excel 模板）
const EXPORT_HEADERS = ['编号', '位置', '经度', '纬度', '面积(㎡)', '容积率', '成交价格(万元)', '土地使用权人', '合同签订日期', '楼面地价(元/㎡)', '主要股东'];

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

  // 搜索 & 批量选择
  const [searchQuery, setSearchQuery] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 加载地图项目和标注数据
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    let { data: maps } = await supabase
      .from('maps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    let map: MapProject;
    if (!maps || maps.length === 0) {
      const { data: newMap, error } = await supabase
        .from('maps')
        .insert({
          user_id: user.id,
          name: '土地出让数据',
          description: '李沧区土地出让标注地图',
          center: [120.43, 36.16],
          zoom: 13,
          field_templates: DEFAULT_LAND_FIELD_TEMPLATES,
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
      name: '',
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
    if (batchMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(annotation.id)) {
          next.delete(annotation.id);
        } else {
          next.add(annotation.id);
        }
        return next;
      });
    } else {
      setSelectedAnnotation(annotation);
    }
  }, [batchMode]);

  // 拖拽移动点位
  const handleAnnotationMove = useCallback(async (annotation: Annotation, newLatLng: L.LatLng) => {
    const updated: Annotation = {
      ...annotation,
      geometry: { type: 'Point', coordinates: [newLatLng.lng, newLatLng.lat] },
      updated_at: new Date().toISOString(),
    };
    // 乐观更新本地状态
    setAnnotations((prev) => prev.map((a) => (a.id === annotation.id ? updated : a)));
    if (selectedAnnotation?.id === annotation.id) {
      setSelectedAnnotation(updated);
    }
    // 异步保存
    await saveAnnotation(updated);
  }, [selectedAnnotation]);

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

  // 搜索过滤
  const filteredAnnotations = useMemo(() => {
    if (!searchQuery.trim()) return annotations;
    const q = searchQuery.toLowerCase().trim();
    return annotations.filter((a) => {
      if (a.name.toLowerCase().includes(q)) return true;
      if (a.description.toLowerCase().includes(q)) return true;
      if (a.custom_fields.some((cf) => String(cf.value ?? '').toLowerCase().includes(q))) return true;
      return false;
    });
  }, [annotations, searchQuery]);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredAnnotations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAnnotations.map((a) => a.id)));
    }
  }, [selectedIds, filteredAnnotations]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await supabase.from('annotations').delete().in('id', ids);
    setAnnotations((prev) => prev.filter((a) => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
    setBatchMode(false);
  }, [selectedIds]);

  // 批量导入
  const handleImport = useCallback(async (items: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[]) => {
    const newAnnotations: Annotation[] = items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

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

  // 导出 Excel/CSV — 对齐 Excel 表头
  const handleExport = useCallback((format: 'xlsx' | 'csv') => {
    const pointAnnotations = annotations.filter((a) => a.type === 'point');
    if (pointAnnotations.length === 0) {
      alert('没有可导出的点标注');
      return;
    }

    const templates = mapProject?.field_templates || [];

    const rows = pointAnnotations.map((a) => {
      const geom = a.geometry as { type: string; coordinates: [number, number] };
      const getFieldValue = (fieldId: string) => {
        const val = a.custom_fields.find((cf) => cf.fieldId === fieldId)?.value;
        return val?.toString() || '';
      };

      // 按 EXPORT_HEADERS 顺序输出
      const row: Record<string, string | number> = {
        '编号': a.name,
        '位置': a.description,
        '经度': geom.coordinates[0],
        '纬度': geom.coordinates[1],
      };

      // 自定义字段按模板顺序追加
      templates.forEach((field) => {
        row[field.name] = getFieldValue(field.id);
      });

      return row;
    });

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '土地出让数据');
      XLSX.writeFile(wb, `土地出让数据_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
    } else {
      const csv = Papa.unparse(rows, { columns: EXPORT_HEADERS });
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `土地出让数据_${new Date().toLocaleDateString('zh-CN')}.csv`;
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
            sidebarOpen ? 'w-80' : 'w-0'
          } overflow-hidden`}
        >
          <div className="w-80 h-full flex flex-col">
            {/* 侧边栏标题 */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">标注列表</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{annotations.length} 个</span>
                <button
                  onClick={() => {
                    setBatchMode(!batchMode);
                    setSelectedIds(new Set());
                  }}
                  className={`p-1 rounded transition ${
                    batchMode ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="批量操作"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="px-3 py-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索编号、位置..."
                  className="w-full pl-9 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-gray-400 mt-1">找到 {filteredAnnotations.length} 条结果</p>
              )}
            </div>

            {/* 批量操作栏 */}
            {batchMode && (
              <div className="px-3 py-2 border-b bg-blue-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={handleSelectAll} className="text-xs text-blue-600 hover:text-blue-800">
                    {selectedIds.size === filteredAnnotations.length ? '取消全选' : '全选'}
                  </button>
                  <span className="text-xs text-gray-500">已选 {selectedIds.size} 个</span>
                </div>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    批量删除
                  </button>
                )}
              </div>
            )}

            {/* 标注列表 */}
            <div className="flex-1 overflow-y-auto">
              {filteredAnnotations.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  {searchQuery ? '没有找到匹配的标注' : '暂无标注'}<br />
                  {!searchQuery && '点击左侧工具在地图上添加'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredAnnotations.map((anno) => (
                    <div
                      key={anno.id}
                      onClick={() => {
                        if (batchMode) {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(anno.id)) next.delete(anno.id);
                            else next.add(anno.id);
                            return next;
                          });
                        } else {
                          setSelectedAnnotation(anno);
                        }
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition cursor-pointer ${
                        selectedAnnotation?.id === anno.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {batchMode && (
                          <span className="shrink-0">
                            {selectedIds.has(anno.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </span>
                        )}
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
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
                      {/* 显示关键字段预览 */}
                      {anno.type === 'point' && anno.custom_fields.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pl-6">
                          {anno.custom_fields.slice(0, 3).map((cf) => {
                            const field = mapProject?.field_templates.find((t) => t.id === cf.fieldId);
                            if (!field || cf.value == null) return null;
                            return (
                              <span key={cf.fieldId} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                                {field.name}: {String(cf.value)}
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
          style={{ left: sidebarOpen ? '320px' : '0' }}
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
            onAnnotationMove={handleAnnotationMove}
            drawMode={drawMode}
            onDrawModeChange={setDrawMode}
            selectedAnnotation={selectedAnnotation}
          />

          {/* 右侧面板 — 工具栏 + 信息卡片垂直堆叠，避免重叠 */}
          <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-3 items-end">
            <DrawingToolbar
              drawMode={drawMode}
              onDrawModeChange={setDrawMode}
              annotationCount={annotationCount}
            />
            {selectedAnnotation && mapProject && !batchMode && (
              <InfoCard
                annotation={selectedAnnotation}
                fieldTemplates={mapProject.field_templates}
                onClose={() => setSelectedAnnotation(null)}
                onSave={handleSaveAnnotation}
                onDelete={handleDeleteAnnotation}
              />
            )}
          </div>

          {/* 移动提示 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-white/90 backdrop-blur text-gray-600 px-3 py-1.5 rounded-lg shadow text-xs flex items-center gap-1.5 pointer-events-none">
            <Move className="w-3.5 h-3.5" />
            选择模式下可直接拖拽点位移动
          </div>
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
