'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/auth/AuthProvider';
import InfoCard from '@/components/map/InfoCard';
import FieldTemplateManager from '@/components/map/FieldTemplateManager';
import ImportDialog from '@/components/import/ImportDialog';
import GroupTree from '@/components/map/GroupTree';
import AnnotationFilterPanel from '@/components/map/AnnotationFilterPanel';
import WorkbenchSidebarToggle from '@/components/map/workbench/WorkbenchSidebarToggle';
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
  Download,
  LogOut,
  Settings,
  MapPin,
  ChevronLeft,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Home,
  Search,
  RefreshCcw,
  Eye,
  WandSparkles,
  Wrench,
  User,
  Upload,
  PanelLeft,
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
  const [panelMode, setPanelMode] = useState<'map' | 'annotations' | 'groups' | 'categories' | 'filters'>('annotations');
  const [importOpen, setImportOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showNamesOverride, setShowNamesOverride] = useState<boolean | null>(null);
  const [savingMapSettings, setSavingMapSettings] = useState(false);
  const [editingMapName, setEditingMapName] = useState(false);
  const [mapNameDraft, setMapNameDraft] = useState('');
  const [savingMapName, setSavingMapName] = useState(false);
  const listItemRefs = useRef(new Map<string, HTMLDivElement>());

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
  const panelTabs = [
    { key: 'map', label: '地图' },
    { key: 'annotations', label: '标注' },
    { key: 'groups', label: '分组' },
    { key: 'categories', label: '分类' },
    { key: 'filters', label: '筛选' },
  ] as const;

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

    const { data, error } = await saveAnnotation(annotation);
    if (error || !data) {
      alert(`创建点标注失败: ${error || '保存结果为空'}`);
      return;
    }

    setAnnotations((prev) => [...prev, data]);
    setSelectedAnnotation(data);
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

    const { data, error } = await saveAnnotation(annotation);
    if (error || !data) {
      alert(`创建${type === 'line' ? '线标注' : '面标注'}失败: ${error || '保存结果为空'}`);
      return;
    }

    setAnnotations((prev) => [...prev, data]);
    setSelectedAnnotation(data);
  }, [mapProject, saveAnnotation, setAnnotations, setSelectedAnnotation]);

  const handleTextAnnotationCreate = useCallback(async (text: string, latlng: L.LatLng) => {
    if (!mapProject) return;

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      map_id: mapProject.id,
      type: 'text',
      geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
      name: text,
      description: '',
      style: { color: '#1a4735', fontSize: 16 },
      custom_fields: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await saveAnnotation(annotation);
    if (error || !data) {
      alert(`创建文字标注失败: ${error || '保存结果为空'}`);
      return;
    }

    setAnnotations((prev) => [...prev, data]);
    setSelectedAnnotation(data);
  }, [mapProject, saveAnnotation, setAnnotations, setSelectedAnnotation]);

  const handleImport = useCallback(async (items: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[]) => {
    const { error } = await importAnnotations(items);
    return { error };
  }, [importAnnotations]);

  const handleSmartAnnotation = useCallback(() => {
    setImportOpen(true);
    showFeedback('已打开智能标注导入面板');
  }, [showFeedback]);

  const handleExport = useCallback((format: 'xlsx' | 'csv') => {
    try {
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

      const mapName = (mapProject?.name || '地图标注').replace(/[\\/:*?"<>|]/g, '_');
      const dateSuffix = new Date().toLocaleDateString('zh-CN');
      const fileName = `${mapName}_${dateSuffix}`;

      const downloadBlob = (blob: Blob, name: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      };

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(rows, { header: allHeaders });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '标注数据');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: false });
        downloadBlob(
          new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
          `${fileName}.xlsx`
        );
      } else {
        const csv = Papa.unparse(rows, { columns: allHeaders });
        downloadBlob(
          new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }),
          `${fileName}.csv`
        );
      }

      showFeedback(`已开始下载 ${format.toUpperCase()} 文件`);
    } catch (error) {
      console.error('导出失败:', error);
      alert(`导出失败：${error instanceof Error ? error.message : '未知错误'}，请查看控制台详情`);
    }
  }, [annotations, mapProject, showFeedback]);

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

  useEffect(() => {
    if (!selectedAnnotation || panelMode !== 'annotations') return;
    const element = listItemRefs.current.get(selectedAnnotation.id);
    if (!element) return;
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedAnnotation, panelMode, filteredByGroup]);

  useEffect(() => {
    if (!showExportMenu && !showToolMenu && !showAccountMenu) return;

    const handleClose = () => {
      setShowExportMenu(false);
      setShowToolMenu(false);
      setShowAccountMenu(false);
    };
    window.addEventListener('click', handleClose);
    return () => {
      window.removeEventListener('click', handleClose);
    };
  }, [showAccountMenu, showExportMenu, showToolMenu]);

  const handleSaveMapName = useCallback(async () => {
    if (!mapProject || savingMapName) return;

    const nextName = mapNameDraft.trim();
    if (!nextName) {
      alert('请输入地图名称');
      return;
    }

    setSavingMapName(true);
    const previousProject = mapProject;
    setMapProject({ ...mapProject, name: nextName });

    try {
      await apiSend(`/api/maps/${mapProject.id}`, 'PUT', { name: nextName });
      setEditingMapName(false);
      showFeedback('地图名称已更新');
    } catch (error) {
      setMapProject(previousProject);
      alert(`更新地图名称失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setSavingMapName(false);
    }
  }, [mapNameDraft, mapProject, savingMapName, setMapProject, showFeedback]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const showNamesEnabled = showNamesOverride ?? (mapProject?.settings.showNames !== false);
  const quickTypeCards = [
    { type: 'point', label: '默认（点）', count: annotationCount.point },
    { type: 'line', label: '默认（线）', count: annotationCount.line },
    { type: 'polygon', label: '默认（面）', count: annotationCount.polygon },
    { type: 'text', label: '文字', count: annotationCount.text },
  ] as const;

  const mapOverviewCards = [
    { label: '地图数量', value: '1' },
    { label: '标注总数', value: String(annotations.length) },
    { label: '点位数量', value: String(annotationCount.point) },
    { label: '最近更新', value: mapProject?.updated_at ? new Date(mapProject.updated_at).toLocaleDateString('zh-CN') : '暂无' },
  ];

  const openTypeCategory = (type: typeof quickTypeCards[number]['type']) => {
    setPanelMode('annotations');
    setFilters((prev) => ({
      ...prev,
      selectedTypes: [type],
    }));
  };

  const renderAnnotationRows = () => {
    if (filteredByGroup.length === 0) {
      return (
        <div className="map-directory-empty">
          <MapPin className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--faint)', opacity: 0.35 }} />
          <p>暂无查询结果</p>
          <span>{annotations.length > 0 ? '调整筛选条件后重试' : '还没有标注内容'}</span>
        </div>
      );
    }

    return (
      <div className="map-directory-list">
        {filteredByGroup.map((anno) => {
          const groupColor = anno.group_id ? groupColorMap.get(anno.group_id) : null;
          const groupName = anno.group_id ? groupNameMap.get(anno.group_id) : null;
          return (
            <div
              key={anno.id}
              ref={(node) => {
                if (node) listItemRefs.current.set(anno.id, node);
                else listItemRefs.current.delete(anno.id);
              }}
              onClick={() => handleAnnotationClick(anno)}
              className="map-directory-row"
              data-active={selectedAnnotation?.id === anno.id}
            >
                  <div className="map-directory-row-main">
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
                      <CheckSquare className="w-4 h-4" style={{ color: 'var(--primary)' }} aria-hidden="true" />
                    ) : (
                      <Square className="w-4 h-4" style={{ color: 'var(--faint)' }} aria-hidden="true" />
                    )}
                  </button>
                )}
                <span className={`map-directory-dot map-directory-dot-${anno.type}`} />
                <div className="min-w-0 flex-1">
                  <div className="map-directory-title">{anno.name || '未命名'}</div>
                  {anno.description && (
                    <div className="map-directory-subtitle">{anno.description}</div>
                  )}
                </div>
                {groupName && (
                  <span
                    className="map-directory-group"
                    style={{
                      background: groupColor ? `${groupColor}12` : 'var(--primary-soft)',
                      color: groupColor || 'var(--primary)',
                      borderColor: groupColor ? `${groupColor}2d` : 'rgba(10,75,63,0.16)',
                    }}
                  >
                    {groupName}
                  </span>
                )}
                <span className="map-directory-type">
                  {anno.type === 'point' ? '点' : anno.type === 'line' ? '线' : anno.type === 'text' ? '文字' : '面'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPanelContent = () => {
    if (panelMode === 'map') {
      return (
        <div className="map-panel-shell">
          <div className="map-panel-header">
            <div>
              <h2>地图</h2>
              <p>{mapProject?.description || '当前地图工作台'}</p>
            </div>
          </div>
          <div className="map-panel-stats">
            {mapOverviewCards.map((card) => (
              <div key={card.label} className="map-panel-stat">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (panelMode === 'groups') {
      return (
        <div className="map-panel-shell">
          <div className="map-panel-header">
            <div>
              <h2>分组</h2>
              <p>按分组整理当前地图标注</p>
            </div>
          </div>
          <GroupTree
            groups={groups}
            mapId={mapProject?.id || ''}
            selectedGroupId={filters.selectedGroupId}
            onSelectGroup={(groupId) => setFilters((prev) => ({ ...prev, selectedGroupId: groupId }))}
            onGroupsChange={loadData}
            annotationCountByGroup={annotationCountByGroup}
          />
        </div>
      );
    }

    if (panelMode === 'categories') {
      return (
        <div className="map-panel-shell">
          <div className="map-panel-header">
            <div>
              <h2>分类</h2>
              <p>按标注类型快速切换目录</p>
            </div>
          </div>
          <div className="map-category-grid">
            {quickTypeCards.map((card) => (
              <button
                key={card.type}
                type="button"
                onClick={() => openTypeCategory(card.type)}
                className="map-category-card"
              >
                <span>{card.label}</span>
                <strong>{card.count}</strong>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (panelMode === 'filters') {
      return (
        <div className="map-panel-shell">
          <AnnotationFilterPanel
            filters={filters}
            fieldTemplates={mapProject?.field_templates || []}
            groups={groups}
            resultCount={filteredAnnotations.length}
            totalCount={annotations.length}
            onChange={setFilters}
          />
        </div>
      );
    }

    return (
      <div className="map-panel-shell">
        <div className="map-panel-header">
          <div>
            <h2>标注</h2>
            <p>可见 {filteredAnnotations.length} / 全部 {annotations.length}</p>
          </div>
          <button
            onClick={() => {
              setBatchMode(!batchMode);
              setSelectedIds(new Set());
            }}
                className="map-panel-action"
                title="批量操作"
                aria-label="批量操作"
              >
            <CheckSquare className="w-4 h-4" aria-hidden="true" />
            批量
          </button>
        </div>

        <div className="map-panel-subtabs">
          <button
            type="button"
            className={`map-panel-subtab ${!filters.selectedGroupId ? 'is-active' : ''}`}
            onClick={() => setFilters((prev) => ({ ...prev, selectedGroupId: null }))}
          >
            全部标注
          </button>
          <button
            type="button"
            className={`map-panel-subtab ${filters.selectedTypes.length > 0 ? 'is-active' : ''}`}
            onClick={() => setPanelMode('categories')}
          >
            选择分类
          </button>
          <button
            type="button"
            className={`map-panel-subtab ${filters.keyword || filters.fieldFilters.length > 0 ? 'is-active' : ''}`}
            onClick={() => setPanelMode('filters')}
          >
            高级筛选
          </button>
        </div>

        {batchMode && (
          <div className="map-batch-bar">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="text-xs font-medium"
                style={{ color: 'var(--primary)' }}
              >
                {selectedIds.size === filteredByGroup.length && filteredByGroup.length > 0 ? '取消全选' : '全选'}
              </button>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>已选 {selectedIds.size} 个</span>
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={onBatchDeleteClick}
                className="map-panel-danger"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                删除
              </button>
            )}
          </div>
        )}

        {renderAnnotationRows()}
      </div>
    );
  };

  return (
    <div className="workbench-shell">
      <div className="paper-panel workbench-frame">
        <header className="map-workbench-header shrink-0">
          <div className="map-workbench-topline">
            <div className="map-workbench-brand">
              <div className="map-workbench-brand-lockup">
                <Link
                  href="/admin"
                  className="map-workbench-back"
                  title="返回地图列表"
                  aria-label="返回地图列表"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/"
                  className="map-workbench-back"
                  title="返回前台"
                  aria-label="返回前台"
                >
                  <Home className="w-4 h-4" aria-hidden="true" />
                </Link>
                </div>
              <div className="map-workbench-brand-mark">
                <div className="map-workbench-brand-icon">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--primary)' }} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="map-workbench-brand-eyebrow">KANVON MAP</div>
                  <div className="map-workbench-brand-title-row">
                    {editingMapName ? (
                      <>
                        <label className="sr-only" htmlFor="map-name-input">地图名称</label>
                        <input
                          id="map-name-input"
                          className="map-workbench-brand-input"
                          value={mapNameDraft}
                          onChange={(e) => setMapNameDraft(e.target.value)}
                          aria-label="地图名称"
                          maxLength={80}
                        />
                        <button
                          type="button"
                          className="map-workbench-inline-button"
                          onClick={() => void handleSaveMapName()}
                          disabled={savingMapName}
                        >
                          {savingMapName ? '保存中' : '保存地图名称'}
                        </button>
                      </>
                    ) : (
                      <>
                        <h1 className="map-workbench-brand-title">
                          {mapProject?.name || '地图标注平台'}
                        </h1>
                        <button
                          type="button"
                          className="map-workbench-inline-button"
                          onClick={() => {
                            setMapNameDraft(mapProject?.name || '');
                            setEditingMapName(true);
                          }}
                          aria-label="编辑地图名称"
                        >
                          编辑
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="map-workbench-search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--faint)' }} aria-hidden="true" />
                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                  placeholder="搜索标注名称、描述或字段值"
                  className="map-workbench-search-input"
                />
              </div>
            </div>

            <div className="map-workbench-account">
              <div className="relative">
                <button
                  className={`map-workbench-account-button ${showAccountMenu ? 'is-active' : ''}`}
                  type="button"
                  aria-label="账户"
                  aria-expanded={showAccountMenu}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAccountMenu((prev) => !prev);
                  }}
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>账户</span>
                </button>
                {showAccountMenu && (
                  <div className="map-workbench-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="map-workbench-menu-item"
                      onClick={() => {
                        setShowAccountMenu(false);
                        void logout();
                      }}
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="map-workbench-toolbar">
            <div className="map-workbench-toolbar-group">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className={`map-workbench-tool ${sidebarOpen ? 'is-active' : ''}`}
                title={sidebarOpen ? '收起目录' : '展开目录'}
                aria-label={sidebarOpen ? '收起目录' : '展开目录'}
              >
                <PanelLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>目录</span>
              </button>
            </div>

            <div className="map-workbench-toolbar-group">
              <button
                onClick={() => setImportOpen(true)}
                className="map-workbench-tool"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>导入</span>
              </button>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportMenu((prev) => !prev);
                  }}
                  className={`map-workbench-tool ${showExportMenu ? 'is-active' : ''}`}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>导出</span>
                </button>
                {showExportMenu && (
                  <div className="map-workbench-menu" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { handleExport('xlsx'); setShowExportMenu(false); }} className="map-workbench-menu-item">
                      导出 Excel
                    </button>
                    <button onClick={() => { handleExport('csv'); setShowExportMenu(false); }} className="map-workbench-menu-item">
                      导出 CSV
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleSmartAnnotation}
                className="map-workbench-tool"
              >
                <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>智能标注</span>
              </button>
              <button
                onClick={() => setShowNamesOverride((prev) => !(prev ?? (mapProject?.settings.showNames !== false)))}
                className={`map-workbench-tool ${showNamesEnabled ? 'is-active' : ''}`}
                title="切换名称显示"
                aria-label="切换名称显示"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>显示名称</span>
              </button>
            </div>

            <div className="map-workbench-toolbar-group">
              <button
                onClick={() => setDrawMode(drawMode === 'point' ? 'none' : 'point')}
                className={`map-workbench-tool ${drawMode === 'point' ? 'is-primary' : ''}`}
              >
                <span>点标注</span>
              </button>
              <button
                onClick={() => setDrawMode(drawMode === 'line' ? 'none' : 'line')}
                className={`map-workbench-tool ${drawMode === 'line' ? 'is-primary' : ''}`}
              >
                <span>线标注</span>
              </button>
              <button
                onClick={() => setDrawMode(drawMode === 'polygon' ? 'none' : 'polygon')}
                className={`map-workbench-tool ${drawMode === 'polygon' ? 'is-primary' : ''}`}
              >
                <span>面标注</span>
              </button>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowToolMenu((prev) => !prev);
                  }}
                  className={`map-workbench-tool ${showToolMenu ? 'is-active' : ''}`}
                >
                  <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>工具</span>
                </button>
                {showToolMenu && (
                  <div className="map-workbench-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setDrawMode(drawMode === 'measure' ? 'none' : 'measure');
                        setShowToolMenu(false);
                      }}
                      className="map-workbench-menu-item"
                    >
                      测距
                    </button>
                    <button
                      onClick={() => {
                        setDrawMode(drawMode === 'text' ? 'none' : 'text');
                        setShowToolMenu(false);
                      }}
                      className="map-workbench-menu-item"
                    >
                      文字
                    </button>
                    <button
                      onClick={() => {
                        setShowHeatmap((prev) => !prev);
                        setShowToolMenu(false);
                      }}
                      className="map-workbench-menu-item"
                    >
                      {showHeatmap ? '关闭热力' : '开启热力'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="map-workbench-toolbar-group">
              <button
                onClick={() => void loadData()}
                className="map-workbench-tool"
              >
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>刷新</span>
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`map-workbench-tool ${showSettings ? 'is-active' : ''}`}
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                <span>设置</span>
              </button>
              <button
                onClick={logout}
                className="map-workbench-tool"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>退出</span>
              </button>
            </div>
          </div>
        </header>

      {/* 反馈消息 */}
      {feedbackMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-[9999] border px-4 py-2 text-sm animate-fade-in"
          style={{ background: 'rgba(24,32,27,0.92)', color: 'white', borderColor: 'rgba(255,255,255,0.08)', boxShadow: 'var(--shadow-floating)' }}>
          {feedbackMessage}
        </div>
      )}

      {/* 批量删除确认 */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/32 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in">
          <div className="paper-panel max-w-sm p-6 mx-4 shadow-2xl workbench-hard-edge">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 border flex items-center justify-center" style={{ background: 'rgba(192,57,43,0.08)', borderColor: 'rgba(185,87,73,0.18)' }}>
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
                className="ghost-button workbench-hard-edge px-4 py-2 text-sm">
                取消
              </button>
              <button onClick={confirmBatchDelete}
                className="px-4 py-2 text-sm font-medium text-white transition workbench-hard-edge"
                style={{ background: 'var(--danger)' }}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden">
        <div
          className={`relative z-30 shrink-0 overflow-hidden transition-all duration-300 ${
            sidebarOpen ? 'w-[368px] opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <aside className="map-workbench-sidebar">
            <div className="map-workbench-panel-tabs">
              {panelTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPanelMode(tab.key)}
                  className={`map-workbench-panel-tab ${panelMode === tab.key ? 'is-active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="map-workbench-panel-body">
              {renderPanelContent()}
            </div>
          </aside>
        </div>
        
        <WorkbenchSidebarToggle
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          offset={396}
        />

        <div className="flex-1 relative min-w-0 bg-white">
          {showSettings && mapProject && (
            <div className="absolute left-4 top-[120px] z-[1100] w-[320px]">
              <div className="relative workbench-panel workbench-hard-edge p-4 space-y-4" style={{ boxShadow: 'var(--shadow-floating)' }}>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 text-xs rounded-[var(--radius-sm)]"
                  style={{ color: 'var(--muted)' }}
                  aria-label="关闭设置"
                >
                  ✕
                </button>
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
                    className="h-7 min-w-[44px] border relative transition-colors duration-200 disabled:opacity-60 workbench-hard-edge"
                    style={{ background: mapProject.settings.isPublic !== false ? 'var(--primary)' : 'rgba(255,255,255,0.7)', borderColor: mapProject.settings.isPublic !== false ? 'var(--primary)' : 'var(--border)' }}
                    aria-label="公开访问开关"
                  >
                    <span
                      className="absolute top-[3px] h-4.5 w-4.5 bg-white transition-all duration-200"
                      style={{ left: mapProject.settings.isPublic !== false ? '24px' : '3px' }}
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
                    className="h-7 min-w-[44px] border relative transition-colors duration-200 disabled:opacity-60 workbench-hard-edge"
                    style={{ background: mapProject.settings.showNames !== false ? 'var(--primary)' : 'rgba(255,255,255,0.7)', borderColor: mapProject.settings.showNames !== false ? 'var(--primary)' : 'var(--border)' }}
                    aria-label="显示名称默认开关"
                  >
                    <span
                      className="absolute top-[3px] h-4.5 w-4.5 bg-white transition-all duration-200"
                      style={{ left: mapProject.settings.showNames !== false ? '24px' : '3px' }}
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

                <FieldTemplateManager
                  templates={mapProject.field_templates}
                  onChange={handleFieldTemplatesChange}
                />
              </div>
            </div>
          )}

          <div className="absolute inset-0 border pointer-events-none z-[2]" style={{ borderColor: 'var(--border)' }} />
          <MapView
            annotations={filteredAnnotations}
            onMapClick={handleMapClick}
            onMapDrawComplete={handleDrawComplete}
            onTextAnnotationCreate={handleTextAnnotationCreate}
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
            showNames={showNamesEnabled}
            searchOverlayClassName="left-3 top-16"
          />

          <div className="absolute right-3 top-[56px] z-[1000]">
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
        </div>
      </div>

      {mapProject && (
        <ImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
          fieldTemplates={mapProject.field_templates || []}
          mapId={mapProject.id}
          existingNames={annotations.filter((annotation) => annotation.type === 'point' && annotation.name).map((annotation) => annotation.name)}
        />
      )}
      </div>
    </div>
  );
}
