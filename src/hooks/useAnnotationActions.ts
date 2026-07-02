'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Annotation, AnnotationFieldFilter, AnnotationFilterState, FieldTemplate } from '@/lib/types';
import L from 'leaflet';

/**
 * 自定义 Hook：标注交互逻辑（选中、搜索、批量、拖拽移动）
 * 修复 #5: handleAnnotationMove 使用 ref 避免闭包陷阱
 * 修复 #6: 全选基于 filteredAnnotations
 * 修复 #11: annotationCount 用 useMemo
 * 修复 #12: fieldTemplateMap 预构建
 */
export function useAnnotationActions(
  annotations: Annotation[],
  fieldTemplates: FieldTemplate[],
  onSave: (annotation: Annotation) => Promise<{ data: Annotation | null; error: string | null }>,
  onDelete: (id: string) => Promise<{ error: string | null }>,
  onBatchDelete: (ids: string[]) => Promise<{ error: string | null }>,
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>,
) {
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [filters, setFilters] = useState<AnnotationFilterState>({
    keyword: '',
    selectedGroupId: null,
    selectedTypes: [],
    fieldFilters: [],
  });
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // 修复 #5: 用 ref 追踪 selectedAnnotation，避免闭包陷阱
  const selectedAnnotationRef = useRef<Annotation | null>(null);
  useEffect(() => {
    selectedAnnotationRef.current = selectedAnnotation;
  }, [selectedAnnotation]);

  // 修复 #12: 预构建 fieldTemplate Map
  const fieldTemplateMap = useMemo(() => {
    const map = new Map<string, FieldTemplate>();
    fieldTemplates.forEach((t) => map.set(t.id, t));
    return map;
  }, [fieldTemplates]);

  const parseNumber = (value: string | number | null | undefined) => {
    if (value == null || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const matchesFieldFilter = useCallback((annotation: Annotation, filter: AnnotationFieldFilter) => {
    const value = annotation.custom_fields.find((item) => item.fieldId === filter.fieldId)?.value;
    if (value == null || value === '') return false;

    if (filter.operator === 'contains') {
      return String(value).toLowerCase().includes((filter.value || '').toLowerCase().trim());
    }

    if (filter.operator === 'equals') {
      return String(value).toLowerCase() === (filter.value || '').toLowerCase().trim();
    }

    if (filter.operator === 'range') {
      const numericValue = parseNumber(value);
      if (numericValue == null) return false;
      const min = filter.min ? Number(filter.min) : null;
      const max = filter.max ? Number(filter.max) : null;
      if (min != null && numericValue < min) return false;
      if (max != null && numericValue > max) return false;
      return true;
    }

    const current = new Date(String(value)).getTime();
    if (Number.isNaN(current)) return false;
    const min = filter.min ? new Date(filter.min).getTime() : null;
    const max = filter.max ? new Date(filter.max).getTime() : null;
    if (min != null && current < min) return false;
    if (max != null && current > max) return false;
    return true;
  }, []);

  // 搜索过滤
  const filteredAnnotations = useMemo(() => {
    const keyword = filters.keyword.toLowerCase().trim();
    return annotations.filter((a) => {
      if (filters.selectedGroupId !== null && (a.group_id || null) !== filters.selectedGroupId) return false;
      if (filters.selectedTypes.length > 0 && !filters.selectedTypes.includes(a.type)) return false;

      if (keyword) {
        const keywordMatched =
          a.name.toLowerCase().includes(keyword) ||
          a.description.toLowerCase().includes(keyword) ||
          a.custom_fields.some((cf) => String(cf.value ?? '').toLowerCase().includes(keyword));
        if (!keywordMatched) return false;
      }

      return filters.fieldFilters.every((filter) => matchesFieldFilter(a, filter));
    });
  }, [annotations, filters, matchesFieldFilter]);

  // 修复 #11: annotationCount 用 useMemo
  const annotationCount = useMemo(() => ({
    point: annotations.filter((a) => a.type === 'point').length,
    line: annotations.filter((a) => a.type === 'line').length,
    polygon: annotations.filter((a) => a.type === 'polygon').length,
    text: annotations.filter((a) => a.type === 'text').length,
  }), [annotations]);

  // 自动清除反馈消息
  const showFeedback = useCallback((msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  }, []);

  // 保存编辑
  const handleSaveAnnotation = useCallback(async (updated: Annotation) => {
    const { data, error } = await onSave(updated);
    if (error) {
      showFeedback(`保存失败: ${error}`);
      return;
    }
    // 更新本地列表
    const finalAnnotation = data || updated;
    setAnnotations((prev) => prev.map((a) => (a.id === updated.id ? finalAnnotation : a)));
    setSelectedAnnotation(finalAnnotation);
    showFeedback('保存成功');
    return finalAnnotation;
  }, [onSave, showFeedback, setAnnotations]);

  // 删除标注（修复 #2: 错误处理）
  const handleDeleteAnnotation = useCallback(async (id: string) => {
    const { error } = await onDelete(id);
    if (error) {
      showFeedback(`删除失败: ${error}`);
      return;
    }
    setSelectedAnnotation(null);
    showFeedback('已删除');
  }, [onDelete, showFeedback]);

  // 拖拽移动（修复 #5: 使用 ref 避免闭包陷阱）
  const handleAnnotationMove = useCallback(async (annotation: Annotation, newLatLng: L.LatLng) => {
    const updated: Annotation = {
      ...annotation,
      geometry: { type: 'Point', coordinates: [newLatLng.lng, newLatLng.lat] },
      updated_at: new Date().toISOString(),
    };
    // 乐观更新本地列表
    setAnnotations((prev) => prev.map((a) => (a.id === annotation.id ? updated : a)));
    // 使用 ref 检查选中状态（修复闭包陷阱）
    if (selectedAnnotationRef.current?.id === annotation.id) {
      setSelectedAnnotation(updated);
    }
    // 异步保存
    const { error } = await onSave(updated);
    if (error) {
      showFeedback(`移动保存失败: ${error}`);
    }
  }, [onSave, showFeedback, setAnnotations]);

  // 全选/取消全选（修复 #6: 基于 filteredAnnotations）
  const handleSelectAll = useCallback(() => {
    const filteredIds = new Set(filteredAnnotations.map((a) => a.id));
    if (selectedIds.size === filteredIds.size && filteredIds.size > 0 && [...filteredIds].every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(filteredIds);
    }
  }, [selectedIds, filteredAnnotations]);

  // 批量删除（修复 #1: 确认由调用方负责；修复 #2: 错误处理）
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await onBatchDelete(ids);
    if (error) {
      showFeedback(`批量删除失败: ${error}`);
      return;
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    showFeedback(`已删除 ${ids.length} 个标注`);
  }, [selectedIds, onBatchDelete, showFeedback]);

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

  return {
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
  };
}
