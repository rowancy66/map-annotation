'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/auth/AuthProvider';
import DrawingToolbar from '@/components/map/DrawingToolbar';
import InfoCard from '@/components/map/InfoCard';
import FieldTemplateManager from '@/components/map/FieldTemplateManager';
import ImportDialog from '@/components/import/ImportDialog';
import GroupTree from '@/components/map/GroupTree';
import AnnotationFilterPanel from '@/components/map/AnnotationFilterPanel';
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
  Trash2,
  CheckSquare,
  Square,
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
    loading,
    saveAnnotation,
    deleteAnnotation,
    batchDeleteAnnotations,
    importAnnotations,
    updateFieldTemplates,
    updateMapSettings,
    loadData,
  } = useMapData(isLoggedIn, mapId);

  const {
    selectedAnnotation,
    setSelectedAnnotation,
    filters,
    setFilters,
    batchMode,
    setBatchMode,
    selectedIds,
    setSelectedIds,
    filteredAnnotations,
    annotationCount,
    fieldTemplateMap,
    feedbackMessage,
    showFeedback,
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
  const [showFilters, setShowFilters] = useState(true);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [batchGroupTarget, setBatchGroupTarget] = useState<string>('__ungrouped__');
  const [batchFieldId, setBatchFieldId] = useState('');
  const [batchFieldValue, setBatchFieldValue] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [savingMapSettings, setSavingMapSettings] = useState(false);

  // 分组标注计数
  const annotationCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    annotations.forEach((a) => {
      const gid = a.group_id || '__ungrouped__';
      counts[gid] = (counts[gid] || 0) + 1;
    });
    return counts;
  }, [annotations]);

  const filteredByGroup = filteredAnnotations;

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

  const handlePublicAccessChange = useCallback(async (isPublic: boolean) => {
    if (!mapProject || savingMapSettings) return;

    const nextSettings = {
      ...mapProject.settings,
      isPublic,
    };

    setSavingMapSettings(true);
    const previousProject = mapProject;
    setMapProject({ ...mapProject, settings: nextSettings });

    const { error } = await updateMapSettings(nextSettings, mapProject.id);
    if (error) {
      setMapProject(previousProject);
      alert(`更新公开访问设置失败: ${error}`);
    }

    setSavingMapSettings(false);
  }, [mapProject, savingMapSettings, setMapProject, updateMapSettings]);

  const handleShowNamesSettingChange = useCallback(async (showNames: boolean) => {
    if (!mapProject || savingMapSettings) return;

    const nextSettings = {
      ...mapProject.settings,
      showNames,
    };

    setSavingMapSettings(true);
    const previousProject = mapProject;
    setMapProject({ ...mapProject, settings: nextSettings });

    const { error } = await updateMapSettings(nextSettings, mapProject.id);
    if (error) {
      setMapProject(previousProject);
      alert(`更新名称显示设置失败: ${error}`);
    }

    setSavingMapSettings(false);
  }, [mapProject, savingMapSettings, setMapProject, updateMapSettings]);

  const onBatchDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBatchDeleteConfirm(true);
  }, [selectedIds]);

  const confirmBatchDelete = useCallback(async () => {
    setBatchDeleteConfirm(false);
    await handleBatchDelete();
  }, [handleBatchDelete]);

  const handleBatchMoveToGroup = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchActionLoading(true);
    try {
      const groupId = batchGroupTarget === '__ungrouped__' ? null : batchGroupTarget;
      await apiSend('/api/annotations', 'PUT', { annotationIds: Array.from(selectedIds), groupId });
      setAnnotations((prev) =>
        prev.map((annotation) =>
          selectedIds.has(annotation.id) ? { ...annotation, group_id: groupId ?? undefined } : annotation
        )
      );
      showFeedback(`已更新 ${selectedIds.size} 个标注的分组`);
    } catch (error) {
      showFeedback(`批量移动失败: ${error instanceof Error ? error.message : '请求失败'}`);
      await loadData();
    } finally {
      setBatchActionLoading(false);
    }
  }, [batchGroupTarget, loadData, selectedIds, setAnnotations, showFeedback]);

  const handleBatchUpdateField = useCallback(async () => {
    if (selectedIds.size === 0 || !batchFieldId) return;
    setBatchActionLoading(true);
    try {
      const response = await apiSend<{ ok: true; data: Annotation[] }>('/api/annotations', 'PUT', {
        annotationIds: Array.from(selectedIds),
        fieldId: batchFieldId,
        fieldValue: batchFieldValue.trim() ? batchFieldValue.trim() : null,
      });
      const updates = new Map(response.data.map((annotation) => [annotation.id, annotation]));
      setAnnotations((prev) => prev.map((annotation) => updates.get(annotation.id) || annotation));
      showFeedback(`已更新 ${response.data.length} 个标注的字段值`);
    } catch (error) {
      showFeedback(`批量字段更新失败: ${error instanceof Error ? error.message : '请求失败'}`);
      await loadData();
    } finally {
      setBatchActionLoading(false);
    }
  }, [batchFieldId, batchFieldValue, loadData, selectedIds, setAnnotations, showFeedback]);

  const handleMoveAnnotationToGroup = useCallback(async (annotationId: string, groupId: string | null) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === annotationId ? { ...a, group_id: groupId ?? undefined } : a))
    );
    try {
      await apiSend('/api/annotations', 'PUT', { annotationIds: [annotationId], groupId });
    } catch {
      loadData();
    }
  }, [loadData, setAnnotations]);

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
              <>
                <div className="px-3 py-2 shrink-0 flex items-center justify-between" style={{ borderBottom: showFilters ? 'none' : '1px solid var(--border)' }}>
                  <button
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition"
                    style={{ color: 'var(--primary)', background: 'rgba(26,71,53,0.06)' }}
                  >
                    <Search className="w-3.5 h-3.5" aria-hidden="true" />
                    {showFilters ? '收起筛选' : '展开筛选'}
                  </button>
                  <span className="text-xs" style={{ color: 'var(--faint)' }}>
                    {filteredAnnotations.length} / {annotations.length}
                  </span>
                </div>
                {showFilters && (
                  <AnnotationFilterPanel
                    filters={filters}
                    fieldTemplates={mapProject?.field_templates || []}
                    groups={groups}
                    resultCount={filteredAnnotations.length}
                    totalCount={annotations.length}
                    onChange={setFilters}
                  />
                )}
              </>
            )}

            {/* 批量操作栏 */}
            {sidebarTab === 'list' && batchMode && (
              <div className="px-3 py-2 shrink-0 space-y-3"
                style={{ borderBottom: '1px solid var(--border)', background: 'rgba(26,71,53,0.04)' }}>
                <div className="flex items-center justify-between">
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

                {selectedIds.size > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr,auto] gap-2">
                      <select
                        value={batchGroupTarget}
                        onChange={(e) => setBatchGroupTarget(e.target.value)}
                        className="px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ border: '1px solid var(--border)', background: 'white', color: 'var(--ink)' }}
                      >
                        <option value="__ungrouped__">移动到未分组</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleBatchMoveToGroup}
                        disabled={batchActionLoading}
                        className="px-3 py-2 rounded-lg text-xs font-medium transition"
                        style={{ background: 'var(--primary)', color: 'white' }}
                      >
                        移动分组
                      </button>
                    </div>

                    <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                      <select
                        value={batchFieldId}
                        onChange={(e) => setBatchFieldId(e.target.value)}
                        className="px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ border: '1px solid var(--border)', background: 'white', color: 'var(--ink)' }}
                      >
                        <option value="">选择字段</option>
                        {(mapProject?.field_templates || []).map((field) => (
                          <option key={field.id} value={field.id}>{field.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={batchFieldValue}
                        onChange={(e) => setBatchFieldValue(e.target.value)}
                        placeholder="统一字段值"
                        className="px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ border: '1px solid var(--border)', background: 'white', color: 'var(--ink)' }}
                      />
                      <button
                        onClick={handleBatchUpdateField}
                        disabled={batchActionLoading || !batchFieldId}
                        className="px-3 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50"
                        style={{ background: '#2c6fbb', color: 'white' }}
                      >
                        批量改值
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 标注列表 / 分组树 */}
            <div className="flex-1 overflow-y-auto">
              {sidebarTab === 'groups' ? (
                <GroupTree
                  groups={groups}
                  mapId={mapProject?.id || ''}
                  selectedGroupId={filters.selectedGroupId}
                  onSelectGroup={(groupId) => setFilters((prev) => ({ ...prev, selectedGroupId: groupId }))}
                  onGroupsChange={loadData}
                  annotationCountByGroup={annotationCountByGroup}
                />
              ) : (
                <>
                  {filteredByGroup.length === 0 ? (
                    <div className="p-8 text-center text-sm" style={{ color: 'var(--faint)' }}>
                      <div className="text-3xl mb-3 opacity-30">📍</div>
                      {annotations.length > 0 ? '没有符合当前筛选条件的标注' : '暂无标注'}<br />
                      {annotations.length === 0 && (
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
                <div className="px-4 pt-4">
                  <div className="rounded-xl border p-4 space-y-4" style={{ background: 'white', borderColor: 'var(--border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>访问设置</h3>
                        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                          关闭后，这张地图不会出现在前台列表，也不能被匿名访问。
                        </p>
                      </div>
                      <button
                        onClick={() => handlePublicAccessChange(!(mapProject.settings.isPublic !== false))}
                        disabled={savingMapSettings}
                        className="w-10 h-6 rounded-full relative transition-colors duration-200 disabled:opacity-60"
                        style={{ background: mapProject.settings.isPublic !== false ? 'var(--primary)' : 'var(--border)' }}
                        aria-label="公开访问开关"
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200"
                          style={{ left: mapProject.settings.isPublic !== false ? 'calc(100% - 22px)' : '2px' }}
                        />
                      </button>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>默认显示名称</h3>
                        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                          控制前台与后台地图加载时是否默认显示标注名称。
                        </p>
                      </div>
                      <button
                        onClick={() => handleShowNamesSettingChange(!(mapProject.settings.showNames !== false))}
                        disabled={savingMapSettings}
                        className="w-10 h-6 rounded-full relative transition-colors duration-200 disabled:opacity-60"
                        style={{ background: mapProject.settings.showNames !== false ? 'var(--primary)' : 'var(--border)' }}
                        aria-label="显示名称默认开关"
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200"
                          style={{ left: mapProject.settings.showNames !== false ? 'calc(100% - 22px)' : '2px' }}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--faint)' }}>
                        当前状态：{mapProject.settings.isPublic !== false ? '公开可访问' : '仅后台可见'} · 名称默认{mapProject.settings.showNames !== false ? '显示' : '隐藏'}
                      </span>
                      {savingMapSettings && (
                        <span style={{ color: 'var(--muted)' }}>保存中...</span>
                      )}
                    </div>
                  </div>
                </div>
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
            annotations={filteredAnnotations}
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
            showNames={mapProject?.settings.showNames !== false}
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
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            名称默认{mapProject?.settings.showNames !== false ? '显示' : '隐藏'}
          </span>
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
        existingNames={annotations.filter((annotation) => annotation.type === 'point' && annotation.name).map((annotation) => annotation.name)}
      />
    </div>
  );
}
