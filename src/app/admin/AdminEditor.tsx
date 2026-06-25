'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/auth/AuthProvider';
import DrawingToolbar from '@/components/map/DrawingToolbar';
import InfoCard from '@/components/map/InfoCard';
import FieldTemplateManager from '@/components/map/FieldTemplateManager';
import ImportDialog from '@/components/import/ImportDialog';
import GroupTree from '@/components/map/GroupTree';
import { useMapData } from '@/hooks/useMapData';
import { useAnnotationActions } from '@/hooks/useAnnotationActions';
import { apiSend } from '@/lib/api';
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
  Home,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import L from 'leaflet';
import Link from 'next/link';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  ),
});

export default function AdminEditor({ mapId }: { mapId?: string }) {
  const { isLoggedIn, logout } = useAuth();

  const {
    mapProject,
    setMapProject,
    annotations,
    setAnnotations,
    groups,
    setGroups,
    loading,
    saveAnnotation,
    deleteAnnotation,
    batchDeleteAnnotations,
    importAnnotations,
    updateFieldTemplates,
    loadData,
  } = useMapData(isLoggedIn, mapId);

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
  const [sidebarTab, setSidebarTab] = useState<'list' | 'groups'>('list');
  const [importOpen, setImportOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // 分组标注计数
  const annotationCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    annotations.forEach((a) => {
      const gid = a.group_id || '__ungrouped__';
      counts[gid] = (counts[gid] || 0) + 1;
    });
    return counts;
  }, [annotations]);

  // 按分组过滤标注
  const filteredByGroup = useMemo(() => {
    if (selectedGroupId === null) return filteredAnnotations;
    return filteredAnnotations.filter((a) => a.group_id === selectedGroupId);
  }, [selectedGroupId, filteredAnnotations]);

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

  const handleImport = useCallback(async (items: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[]) => {
    const { error } = await importAnnotations(items);
    return { error };
  }, [importAnnotations]);

  const handleExport = useCallback((format: 'xlsx' | 'csv') => {
    const pointAnnotations = annotations.filter((a) => a.type === 'point');
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
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `土地出让数据_${new Date().toLocaleDateString('zh-CN')}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }, [annotations, mapProject]);

  const handleFieldTemplatesChange = useCallback(async (templates: FieldTemplate[]) => {
    if (!mapProject) return;
    const { error } = await updateFieldTemplates(templates, mapProject.id);
    if (error) {
      alert(`更新字段模板失败: ${error}`);
      return;
    }
    setMapProject({ ...mapProject, field_templates: templates });
  }, [mapProject, updateFieldTemplates, setMapProject]);

  const onBatchDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBatchDeleteConfirm(true);
  }, [selectedIds]);

  const confirmBatchDelete = useCallback(async () => {
    setBatchDeleteConfirm(false);
    await handleBatchDelete();
  }, [handleBatchDelete]);

  const handleMoveAnnotationToGroup = useCallback(async (annotationId: string, groupId: string | null) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === annotationId ? { ...a, group_id: groupId ?? undefined } : a))
    );
    try {
      await apiSend('/api/annotations', 'PUT', { annotationIds: [annotationId], groupId });
    } catch {
      // 乐观失败回滚将被 loadData 修正
      loadData();
    }
  }, [loadData]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部栏 */}
      <header className="h-12 bg-white/70 backdrop-blur-xl border-b border-white/30 shadow-sm flex items-center justify-between px-4 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 rounded-lg transition"
            title="返回地图列表"
            aria-label="返回地图列表"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 rounded-lg transition"
            title="返回前台"
            aria-label="返回前台"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
          </Link>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#78a587', boxShadow: '0 2px 8px rgba(120,165,135,0.2)' }}>
            <MapPin className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-sm font-semibold" style={{ color: '#3a403c' }}>
            {mapProject?.name || '地图标注平台'}
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(120,165,135,0.08)', color: '#78a587' }}>管理</span>
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {/* 导入 */}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg transition"
            title="批量导入"
            aria-label="批量导入"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">导入</span>
          </button>

          {/* 导出 */}
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg transition"
              title="导出"
              aria-label="导出"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">导出</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-opacity z-50">
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
              showSettings ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/80'
            }`}
            style={showSettings ? { background: '#78a587' } : undefined}
            title="设置"
            aria-label="设置"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* 分隔 */}
          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* 用户 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline font-medium">
              管理员
            </span>
            <button
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition"
              title="退出登录"
              aria-label="退出登录"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* 反馈消息 */}
      {feedbackMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-gray-800/90 backdrop-blur text-white px-4 py-2 rounded-xl shadow-lg text-sm animate-fade-in">
          {feedbackMessage}
        </div>
      )}

      {/* 批量删除确认对话框 */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
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
          className={`absolute left-0 top-0 bottom-0 z-40 bg-white/95 backdrop-blur-sm border-r border-gray-100 shadow-lg shadow-gray-200/30 transition-all duration-300 ${
            sidebarOpen ? 'w-80' : 'w-0'
          } overflow-hidden`}
        >
          <div className="w-80 h-full flex flex-col">
            {/* 侧边栏头部 + Tab */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-transparent to-blue-50/30">
              <div className="flex items-center gap-1 bg-gray-100/80 rounded-lg p-0.5">
                <button
                  onClick={() => setSidebarTab('list')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    sidebarTab === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  列表
                </button>
                <button
                  onClick={() => setSidebarTab('groups')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    sidebarTab === 'groups'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  分组
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">{annotations.length} 个</span>
                <button
                  onClick={() => {
                    setBatchMode(!batchMode);
                    setSelectedIds(new Set());
                  }}
                  className={`p-1 rounded transition ${
                    batchMode ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="批量操作"
                  aria-label="批量操作"
                >
                  <CheckSquare className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* 搜索（列表模式） */}
            {sidebarTab === 'list' && (
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索编号、位置..."
                    className="w-full pl-9 pr-8 py-2 bg-gray-50/80 border border-gray-200 rounded-lg text-sm outline-none transition"
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#78a587'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(120,165,135,0.12)'; e.currentTarget.style.background = '#ffffff'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = ''; }}
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
            )}

            {/* 批量操作栏 */}
            {sidebarTab === 'list' && batchMode && (
              <div className="px-3 py-2 border-b bg-gradient-to-r from-blue-50/80 to-indigo-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={handleSelectAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium" aria-label={selectedIds.size === filteredByGroup.length && filteredByGroup.length > 0 ? '取消全选' : '全选'}>
                    {selectedIds.size === filteredByGroup.length && filteredByGroup.length > 0 ? '取消全选' : '全选'}
                  </button>
                  <span className="text-xs text-gray-500">已选 {selectedIds.size} 个</span>
                </div>
                {selectedIds.size > 0 && (
                  <button
                    onClick={onBatchDeleteClick}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                    批量删除
                  </button>
                )}
              </div>
            )}

            {/* 标注列表 / 分组树 */}
            <div className="flex-1 overflow-y-auto">
              {sidebarTab === 'groups' ? (
                <GroupTree
                  groups={groups}
                  mapId={mapProject?.id || ''}
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={setSelectedGroupId}
                  onGroupsChange={loadData}
                  annotationCountByGroup={annotationCountByGroup}
                />
              ) : (
                <>
                  {filteredByGroup.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                      <div className="text-3xl mb-3 opacity-30">📍</div>
                      {searchQuery ? '没有找到匹配的标注' : selectedGroupId ? '该分组暂无标注' : '暂无标注'}<br />
                      {!searchQuery && !selectedGroupId && (
                        <span className="text-xs text-gray-300">点击右侧工具在地图上添加</span>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {filteredByGroup.map((anno) =>
                        <div
                          key={anno.id}
                          onClick={() => handleAnnotationClick(anno)}
                          className={`w-full px-4 py-3 text-left transition-all duration-150 cursor-pointer border-l-2 ${
                            selectedAnnotation?.id === anno.id
                              ? 'border-l-[#78a587] shadow-sm'
                              : 'border-l-transparent'
                          }`}
                          style={selectedAnnotation?.id === anno.id ? { background: 'rgba(120,165,135,0.04)' } : undefined}
                          onMouseEnter={(e) => { if (selectedAnnotation?.id !== anno.id) e.currentTarget.style.background = 'rgba(120,165,135,0.02)'; }}
                          onMouseLeave={(e) => { if (selectedAnnotation?.id !== anno.id) e.currentTarget.style.background = ''; }}
                        >
                      <div className="flex items-center gap-2.5">
                        {batchMode && (
                          <button
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = new Set(selectedIds);
                              if (next.has(anno.id)) next.delete(anno.id);
                              else next.add(anno.id);
                              setSelectedIds(next);
                            }}
                            aria-label={selectedIds.has(anno.id) ? '取消选择' : '选择'}
                          >
                            {selectedIds.has(anno.id) ? (
                              <CheckSquare className="w-4 h-4" style={{ color: '#78a587' }} aria-hidden="true" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" aria-hidden="true" />
                            )}
                          </button>
                        )}
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
                            .sort((a, b) => {
                              const fa = fieldTemplateMap.get(a.fieldId);
                              const fb = fieldTemplateMap.get(b.fieldId);
                              return (fa?.sort_order ?? 0) - (fb?.sort_order ?? 0);
                            })
                            .filter(cf => {
                              const field = fieldTemplateMap.get(cf.fieldId);
                              return field && field.name !== '成交总价';
                            })
                            .filter(cf => cf.value != null)
                            .slice(0, 3)
                            .map((cf) => {
                            const field = fieldTemplateMap.get(cf.fieldId);
                            if (!field) return null;
                            return (
                              <span key={cf.fieldId} className="px-1.5 py-0.5 bg-gray-100/80 text-gray-500 rounded text-[10px]">
                                {field.name}: {String(cf.value)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 设置面板 */}
            {showSettings && mapProject && (
              <div className="border-t border-gray-100">
                <FieldTemplateManager
                  templates={mapProject.field_templates}
                  onChange={handleFieldTemplatesChange}
                />
              </div>
            )}
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
            onMapClick={handleMapClick}
            onMapDrawComplete={handleDrawComplete}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationMove={handleAnnotationMove}
            onAnnotationDelete={(anno) => handleDeleteAnnotation(anno.id)}
            onAnnotationMoveToGroup={handleMoveAnnotationToGroup}
            drawMode={drawMode}
            onDrawModeChange={setDrawMode}
            selectedAnnotation={selectedAnnotation}
            editable={true}
            groups={groups}
          />

          <div className="absolute right-4 top-28 z-[1000] flex flex-col gap-3 items-end">
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
                readOnly={false}
              />
            )}
          </div>

          {/* Deerflow 署名 */}
          <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer"
             className="absolute bottom-3 right-3 z-[999] text-[9px] text-gray-300/50 hover:text-gray-500/80 transition-colors duration-300 tracking-widest uppercase pointer-events-auto">
            Deerflow
          </a>
        </div>
      </div>

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
