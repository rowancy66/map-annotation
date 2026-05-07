'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation'; // 修复 #13: 使用 router
import { useAuth } from '@/components/auth/AuthProvider';
import DrawingToolbar from '@/components/map/DrawingToolbar';
import InfoCard from '@/components/map/InfoCard';
import FieldTemplateManager from '@/components/map/FieldTemplateManager';
import ImportDialog from '@/components/import/ImportDialog';
import { useMapData } from '@/hooks/useMapData';
import { useAnnotationActions } from '@/hooks/useAnnotationActions';
import {
  Annotation,
  DrawMode,
  AnnotationType,
  FieldTemplate,
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
  Search,
  Trash2,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
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
  const router = useRouter(); // 修复 #13

  // 数据加载 hook
  const {
    mapProject,
    setMapProject,
    annotations,
    setAnnotations,
    loading,
    saveAnnotation,
    deleteAnnotation,
    batchDeleteAnnotations,
    importAnnotations,
    updateFieldTemplates,
  } = useMapData(user);

  // 标注交互 hook
  const {
    selectedAnnotation,
    setSelectedAnnotation,
    searchQuery,
    setSearchQuery,
    batchMode,
    setBatchMode,
    selectedIds,
    setSelectedIds,
    filteredAnnotations,
    annotationCount,
    fieldTemplateMap,
    feedbackMessage,
    handleSaveAnnotation,
    handleDeleteAnnotation,
    handleAnnotationMove,
    handleSelectAll,
    handleBatchDelete,
    handleAnnotationClick,
  } = useAnnotationActions(
    annotations,
    mapProject?.field_templates || [],
    saveAnnotation,
    deleteAnnotation,
    batchDeleteAnnotations,
    setAnnotations,
  );

  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 修复 #1: 批量删除确认
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

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
      style: { color: '#EF4444', icon: 'map-pin', size: 2 },
      custom_fields: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data } = await saveAnnotation(annotation);
    const saved = data || annotation;
    setAnnotations((prev) => [...prev, saved]);
    setSelectedAnnotation(saved);
    setDrawMode('none');
  }, [drawMode, mapProject, saveAnnotation, setAnnotations, setSelectedAnnotation]);

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
        style: { color: '#3B82F6', width: 3 },
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
        style: { color: '#8B5CF6', fillColor: '#8B5CF6', fillOpacity: 0.3, width: 2 },
        custom_fields: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const { data } = await saveAnnotation(annotation);
    const saved = data || annotation;
    setAnnotations((prev) => [...prev, saved]);
    setSelectedAnnotation(saved);
  }, [mapProject, saveAnnotation, setAnnotations, setSelectedAnnotation]);

  // 批量导入
  const handleImport = useCallback(async (items: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[]) => {
    const { error } = await importAnnotations(items);
    return { error };
  }, [importAnnotations]);

  // 修复 #9: 导出表头从 field_templates 动态生成
  const handleExport = useCallback((format: 'xlsx' | 'csv') => {
    const pointAnnotations = annotations.filter((a) => a.type === 'point');
    // 修复 #10: 如果有线/面数据，给用户提示
    const nonPointCount = annotations.length - pointAnnotations.length;
    if (pointAnnotations.length === 0) {
      alert('没有可导出的点标注');
      return;
    }
    if (nonPointCount > 0) {
      const confirmed = window.confirm(`当前有 ${nonPointCount} 条线/面标注不会被导出，仅导出 ${pointAnnotations.length} 条点标注，是否继续？`);
      if (!confirmed) return;
    }

    const templates = mapProject?.field_templates || [];

    // 修复 #9: 动态生成表头
    const baseHeaders = ['编号', '位置', '经度', '纬度'];
    const customHeaders = templates.map((t) => t.name);
    const allHeaders = [...baseHeaders, ...customHeaders];

    const rows = pointAnnotations.map((a) => {
      const geom = a.geometry as { type: string; coordinates: [number, number] };
      const getFieldValue = (fieldId: string) => {
        const val = a.custom_fields.find((cf) => cf.fieldId === fieldId)?.value;
        return val?.toString() || '';
      };

      const row: Record<string, string | number> = {
        '编号': a.name,
        '位置': a.description,
        '经度': geom.coordinates[0],
        '纬度': geom.coordinates[1],
      };

      templates.forEach((field) => {
        row[field.name] = getFieldValue(field.id);
      });

      return row;
    });

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(rows, { header: allHeaders });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '土地出让数据');
      XLSX.writeFile(wb, `土地出让数据_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
    } else {
      const csv = Papa.unparse(rows, { columns: allHeaders });
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `土地出让数据_${new Date().toLocaleDateString('zh-CN')}.csv`;
      a.click();
      // 修复 #16: 延迟 revoke，确保下载完成
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }, [annotations, mapProject]);

  // 更新字段模板
  const handleFieldTemplatesChange = useCallback(async (templates: FieldTemplate[]) => {
    if (!mapProject) return;
    const { error } = await updateFieldTemplates(templates, mapProject.id);
    if (error) {
      alert(`更新字段模板失败: ${error}`);
      return;
    }
    setMapProject({ ...mapProject, field_templates: templates });
  }, [mapProject, updateFieldTemplates, setMapProject]);

  // 批量删除带确认
  const onBatchDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBatchDeleteConfirm(true);
  }, [selectedIds]);

  const confirmBatchDelete = useCallback(async () => {
    setBatchDeleteConfirm(false);
    await handleBatchDelete();
  }, [handleBatchDelete]);

  // 修复 #13: 使用 router.replace 替代 window.location.href
  // 修复 Bug 2: 将跳转逻辑放入 useEffect，避免 render 阶段执行副作用
  useEffect(() => {
    if (!user && !authLoading && !loading) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, loading, router]);

  // 未登录或加载中
  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

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

      {/* 反馈消息 */}
      {feedbackMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {feedbackMessage}
        </div>
      )}

      {/* 批量删除确认对话框 */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">确认批量删除</h3>
                <p className="text-xs text-gray-500">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              确定要删除选中的 <strong>{selectedIds.size}</strong> 个标注吗？
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setBatchDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button
                onClick={confirmBatchDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {selectedIds.size === filteredAnnotations.length && filteredAnnotations.length > 0 ? '取消全选' : '全选'}
                  </button>
                  <span className="text-xs text-gray-500">已选 {selectedIds.size} 个</span>
                </div>
                {selectedIds.size > 0 && (
                  <button
                    onClick={onBatchDeleteClick}
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
                  {/* 修复 #14: 工具栏在右侧 */}
                  {!searchQuery && '点击右侧工具在地图上添加'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredAnnotations.map((anno) => (
                    <div
                      key={anno.id}
                      onClick={() => handleAnnotationClick(anno)}
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
                      {/* 显示关键字段预览 - 使用预构建的 Map */}
                      {anno.type === 'point' && anno.custom_fields.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pl-6">
                          {anno.custom_fields.slice(0, 3).map((cf) => {
                            const field = fieldTemplateMap.get(cf.fieldId);
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

          {/* 右侧面板 */}
          <div className="absolute right-4 top-16 z-[1000] flex flex-col gap-3 items-end">
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
