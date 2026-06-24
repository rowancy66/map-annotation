'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Annotation, FieldTemplate } from '@/lib/types';
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
  const [searchQuery, setSearchQuery] = useState('');
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

  // 修复 #11: annotationCount 用 useMemo
  const annotationCount = useMemo(() => ({
    point: annotations.filter((a) => a.type === 'point').length,
    line: annotations.filter((a) => a.type === 'line').length,
    polygon: annotations.filter((a) => a.type === 'polygon').length,
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
  };
}
