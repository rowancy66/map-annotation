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
  Group,
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
  Trash2,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
  Home,
  Search,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import L from 'leaflet';
import Link from 'next/link';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
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
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showNames, setShowNames] = useState(true);

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

  // 分组颜色映射
  const groupColorMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => { if (g.color) map.set(g.id, g.color); });
    return map;
  }, [groups]);

  // 分组名称映射
  const groupNameMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [groups]);

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
        style: { color: '#2c6fbb', width: 3 },
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
        style: { color: '#1a4735', fillColor: '#1a4735', fillOpacity: 0.3, width: 2 },
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
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
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
      loadData();
    }
  }, [loadData]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* █ 顶栏工具条 */}
      <header className="h-12 shrink-0 flex items-center justify-between px-3 z-50"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {/* 左侧：导航 + 标题 */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="p-1.5 rounded-lg transition"
            style={{ color: 'var(--muted)' }}
            title="返回地图列表"
            aria-label="返回地图列表"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="p-1.5 rounded-lg transition"
            style={{ color: 'var(--muted)' }}
            title="返回前台"
            aria-label="返回前台"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
          </Link>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <MapPin className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {mapProject?.name || '地图标注平台'}
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>管理</span>
          </h1>
        </div>

        {/* 中间：绘制工具栏 */}
        <DrawingToolbar
          drawMode={drawMode}
          onDrawModeChange={setDrawMode}
          annotationCount={annotationCount}
        />

        {/* 右侧：导入/导出/设置/用户 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition"
            style={{ color: 'var(--muted)' }}
            title="批量导入"
            aria-label="批量导入"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">导入</span>
          </button>

          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition"
              style={{ color: 'var(--muted)' }}
              title="导出"
              aria-label="导出"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">导出</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-32 rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <button onClick={() => handleExport('xlsx')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-t-lg"
                style={{ color: 'var(--ink)' }}>
                导出 Excel
              </button>
              <button onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 rounded-b-lg"
                style={{ color: 'var(--ink)' }}>
                导出 CSV
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg transition"
            style={{ color: showSettings ? 'white' : 'var(--muted)', background: showSettings ? 'var(--primary)' : 'transparent' }}
            title="设置"
            aria-label="设置"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

          <div className="flex items-center gap-2">
            <span className="text-xs hidden sm:inline font-medium" style={{ color: 'var(--faint)' }}>管理员</span>
            <button onClick={logout} className="p-1.5 rounded-lg transition" style={{ color: 'var(--faint)' }} title="退出登录" aria-label="退出登录">
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* 反馈消息 */}
      {feedbackMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-xl shadow-lg text-sm animate-fade-in"
          style={{ background: 'rgba(26,31,36,0.85)', color: 'white' }}>
          {feedbackMessage}
        </div>
      )}

      {/* 批量删除确认 */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in">
          <div className="rounded-xl shadow-2xl p-6 max-w-sm mx-4" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(192,57,43,0.1)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--danger)' }} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>确认批量删除</h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              确定要删除选中的 <strong style={{ color: 'var(--ink)' }}>{selectedIds.size}</strong> 个标注吗？
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBatchDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm transition"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                取消
              </button>
              <button onClick={confirmBatchDelete}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium transition"
                style={{ background: 'var(--danger)' }}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* █ 主体区域 */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 左侧面板 */}
        <div
          className={`absolute left-0 top-0 bottom-0 z-40 transition-all duration-300 ${
            sidebarOpen ? 'w-80' : 'w-0'
          } overflow-hidden`}
          style={{ borderRight: sidebarOpen ? '1px solid var(--border)' : 'none' }}
        >
          <div className="w-80 h-full flex flex-col" style={{ background: '#fafbfc' }}>
            {/* 面板 Tab */}
            <div className="flex px-3 pt-2.5 gap-0.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              {(['list', 'groups'] as const).map((tab) => (
                <button key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className="px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all duration-150"
                  style={{
                    color: sidebarTab === tab ? 'var(--primary)' : 'var(--muted)',
                    background: sidebarTab === tab ? 'white' : 'transparent',
                    border: sidebarTab === tab ? `1px solid var(--border)` : '1px solid transparent',
                    borderBottomColor: sidebarTab === tab ? 'white' : 'transparent',
                    marginBottom: '-1px',
                  }}>
                  {tab === 'list' ? '标注' : '分组'}
                </button>
              ))}
              <div className="flex-1" />
              <span className="text-xs py-2 pr-1 font-mono" style={{ color: 'var(--faint)' }}>{annotations.length} 个</span>
              <button
                onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
                className={`p-1.5 rounded transition ${batchMode ? '' : ''}`}
                style={{ color: batchMode ? 'var(--primary)' : 'var(--faint)' }}
                title="批量操作"
                aria-label="批量操作"
              >
                <CheckSquare className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* 搜索（列表模式） */}
            {sidebarTab === 'list' && (
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
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(26,71,53,0.08)'; }}
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
            )}

            {/* 批量操作栏 */}
            {sidebarTab === 'list' && batchMode && (
              <div className="px-3 py-2 shrink-0 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border)', background: 'rgba(26,71,53,0.04)' }}>
                <div className="flex items-center gap-2">
                  <button onClick={handleSelectAll} className="text-xs font-medium"
                    style={{ color: 'var(--primary)' }}
                    aria-label={selectedIds.size === filteredByGroup.length && filteredByGroup.length > 0 ? '取消全选' : '全选'}>
                    {selectedIds.size === filteredByGroup.length && filteredByGroup.length > 0 ? '取消全选' : '全选'}
                  </button>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>已选 {selectedIds.size} 个</span>
                </div>
                {selectedIds.size > 0 && (
                  <button onClick={onBatchDeleteClick}
                    className="flex items-center gap-1 px-3 py-1 text-white rounded text-xs font-medium transition shadow-sm"
                    style={{ background: 'var(--danger)' }}>
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
                    <div className="p-8 text-center text-sm" style={{ color: 'var(--faint)' }}>
                      <div className="text-3xl mb-3 opacity-30">📍</div>
                      {searchQuery ? '没有找到匹配的标注' : selectedGroupId ? '该分组暂无标注' : '暂无标注'}<br />
                      {!searchQuery && !selectedGroupId && (
                        <span className="text-xs" style={{ color: 'var(--border)' }}>点击顶部工具栏在地图上添加</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      {filteredByGroup.map((anno) => {
                        const groupColor = anno.group_id ? groupColorMap.get(anno.group_id) : null;
                        const groupName = anno.group_id ? groupNameMap.get(anno.group_id) : null;
                        return (
                        <div
                          key={anno.id}
                          onClick={() => handleAnnotationClick(anno)}
                          className="cursor-pointer transition-all duration-150"
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: selectedAnnotation?.id === anno.id ? 'var(--primary-light)' : 'transparent',
                            borderLeft: selectedAnnotation?.id === anno.id ? '3px solid var(--primary)' : '3px solid transparent',
                          }}
                          onMouseEnter={(e) => { if (selectedAnnotation?.id !== anno.id) e.currentTarget.style.background = 'rgba(26,71,53,0.02)'; }}
                          onMouseLeave={(e) => { if (selectedAnnotation?.id !== anno.id) e.currentTarget.style.background = ''; }}
                        >
                          <div className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {batchMode && (
                                <button className="shrink-0"
                                  onClick={(e) => { e.stopPropagation(); const next = new Set(selectedIds); if (next.has(anno.id)) next.delete(anno.id); else next.add(anno.id); setSelectedIds(next); }}
                                  aria-label={selectedIds.has(anno.id) ? '取消选择' : '选择'}>
                                  {selectedIds.has(anno.id) ? (
                                    <CheckSquare className="w-4 h-4" style={{ color: 'var(--primary)' }} aria-hidden="true" />
                                  ) : (
                                    <Square className="w-4 h-4" style={{ color: 'var(--faint)' }} aria-hidden="true" />
                                  )}
                                </button>
                              )}
                              {/* 类型圆点 */}
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                anno.type === 'point' ? 'bg-red-500 shadow-sm shadow-red-200' :
                                anno.type === 'line' ? 'bg-blue-500 shadow-sm shadow-blue-200' :
                                anno.type === 'text' ? 'bg-amber-500 shadow-sm shadow-amber-200' :
                                'bg-purple-500 shadow-sm shadow-purple-200'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium truncate block" style={{ color: 'var(--ink)' }}>
                                  {anno.name || '未命名'}
                                </span>
                                {anno.description && (
                                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{anno.description}</p>
                                )}
                              </div>
                              {/* 分类标签 */}
                              {groupName && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                                  style={{
                                    background: groupColor ? `${groupColor}18` : 'var(--primary-light)',
                                    color: groupColor || 'var(--primary)',
                                  }}>
                                  {groupName}
                                </span>
                              )}
                              {/* 类型徽章 */}
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0" style={{
                                background: anno.type === 'point' ? 'rgba(239,68,68,0.08)' :
                                            anno.type === 'line' ? 'rgba(59,130,246,0.08)' :
                                            anno.type === 'text' ? 'rgba(245,158,11,0.08)' : 'rgba(139,92,246,0.08)',
                                color: anno.type === 'point' ? '#EF4444' :
                                       anno.type === 'line' ? '#3B82F6' :
                                       anno.type === 'text' ? '#d4954e' : '#8B5CF6'
                              }}>
                                {anno.type === 'point' ? '点' : anno.type === 'line' ? '线' : anno.type === 'text' ? '文字' : '面'}
                              </span>
                            </div>
                            {anno.type === 'point' && anno.custom_fields.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2" style={{ paddingLeft: batchMode ? '2.25rem' : '0' }}>
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
                                    <span key={cf.fieldId} className="px-1.5 py-0.5 rounded text-[10px]"
                                      style={{ background: 'var(--primary-light)', color: 'var(--muted)' }}>
                                      {field.name}: {String(cf.value)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        );}
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 设置面板 */}
            {showSettings && mapProject && (
              <div className="shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
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
          className="absolute top-3 z-40 shadow-md rounded-r-xl p-1.5 border border-l-0 transition-all duration-200 hover:scale-105"
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
            showHeatmap={showHeatmap}
          />

          {/* InfoCard */}
          <div className="absolute right-4 top-4 z-[1000]">
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

          {/* Deerflow */}
          <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer"
             className="absolute bottom-10 right-3 z-[999] text-[9px] tracking-widest uppercase transition-colors duration-300 pointer-events-auto"
             style={{ color: 'rgba(107,114,128,0.3)' }}>
            Deerflow
          </a>
        </div>
      </div>

      {/* █ 底栏 */}
      <footer className="h-9 shrink-0 flex items-center justify-between px-4 z-40"
        style={{ background: '#fafbfc', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--muted)' }}>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="w-7 h-4 rounded-full relative transition-colors duration-200"
              style={{ background: showHeatmap ? 'var(--primary)' : 'var(--border)' }}
              aria-label="热力图开关"
            >
              <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200"
                style={{ left: showHeatmap ? 'calc(100% - 14px)' : '2px' }} />
            </button>
            🔥 热力图
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--muted)' }}>
            <button
              onClick={() => setShowNames(!showNames)}
              className="w-7 h-4 rounded-full relative transition-colors duration-200"
              style={{ background: showNames ? 'var(--primary)' : 'var(--border)' }}
              aria-label="显示名称开关"
            >
              <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200"
                style={{ left: showNames ? 'calc(100% - 14px)' : '2px' }} />
            </button>
            显示名称
          </label>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--faint)' }}>
          <span>{annotations.length} 个标注</span>
          <span style={{ opacity: 0.5 }}>Deerflow</span>
        </div>
      </footer>

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