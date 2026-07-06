'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapProject, Annotation, FieldTemplate, Group, MapSettings } from '@/lib/types';
import { DEFAULT_LAND_FIELD_TEMPLATES } from '@/lib/constants';
import { apiGet, apiSend } from '@/lib/api';

export function useMapData(isLoggedIn: boolean, mapId?: string) {
  const [mapProject, setMapProject] = useState<MapProject | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 如果提供了 mapId，加载指定地图；否则加载默认地图
      const url = mapId ? `/api/maps/${mapId}` : '/api/map';
      const response = await apiGet<{
        mapProject: MapProject | null;
        annotations: Annotation[];
        groups?: Group[];
      }>(url);

      if (response.groups) {
        setGroups(response.groups);
      }

      let map = response.mapProject ? (response.mapProject as unknown as MapProject) : null;

      // 同步字段模板：仅对默认地图执行
      if (map && !mapId && map.field_templates && Array.isArray(map.field_templates)) {
        const defaultMap = new Map(DEFAULT_LAND_FIELD_TEMPLATES.map((t) => [t.id, t]));
        const oldTemplates = map.field_templates as FieldTemplate[];
        let changed = false;
        let merged = oldTemplates.map((t) => {
          const def = defaultMap.get(t.id);
          if (def && (def.name !== t.name || def.sort_order !== t.sort_order)) {
            changed = true;
            return { ...t, name: def.name, sort_order: def.sort_order };
          }
          return t;
        });
        // 补充 DEFAULT 中有但 DB 里没有的新字段
        const existingIds = new Set(merged.map((t) => t.id));
        const missing = DEFAULT_LAND_FIELD_TEMPLATES.filter((t) => !existingIds.has(t.id));
        if (missing.length > 0) {
          merged = [...merged, ...missing];
          changed = true;
        }
        if (merged.length === 0) {
          merged = DEFAULT_LAND_FIELD_TEMPLATES;
          changed = true;
        }
        if (changed && isLoggedIn) {
          try {
            await apiSend('/api/map', 'PUT', { mapId: map.id, templates: merged });
            map = { ...map, field_templates: merged as FieldTemplate[] };
          } catch {
            map = { ...map, field_templates: merged as FieldTemplate[] };
          }
        }
      }

      if (map) {
        setMapProject(map);
        setAnnotations(response.annotations as unknown as Annotation[]);
      } else {
        setMapProject(null);
        setAnnotations([]);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, mapId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData]);

  const requireAdmin = useCallback((op: string): boolean => {
    if (!isLoggedIn) {
      console.warn(`${op} 需要登录`);
      return false;
    }
    return true;
  }, [isLoggedIn]);

  const saveAnnotation = useCallback(async (annotation: Annotation): Promise<{ data: Annotation | null; error: string | null }> => {
    if (!requireAdmin('保存标注')) return { data: null, error: '需要登录' };

    try {
      const result = await apiSend<{ data: Annotation }>('/api/annotations', 'POST', { annotation });
      return { data: result.data, error: null };
    } catch (error) {
      console.error('保存标注失败:', error);
      return { data: null, error: error instanceof Error ? error.message : '保存失败' };
    }
  }, [requireAdmin]);

  const deleteAnnotation = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (!requireAdmin('删除标注')) return { error: '需要登录' };

    try {
      await apiSend('/api/annotations', 'DELETE', { id });
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      return { error: null };
    } catch (error) {
      console.error('删除标注失败:', error);
      return { error: error instanceof Error ? error.message : '删除失败' };
    }
  }, [requireAdmin]);

  const batchDeleteAnnotations = useCallback(async (ids: string[]): Promise<{ error: string | null }> => {
    if (!requireAdmin('批量删除')) return { error: '需要登录' };

    try {
      await apiSend('/api/annotations', 'DELETE', { ids });
      setAnnotations((prev) => prev.filter((a) => !ids.includes(a.id)));
      return { error: null };
    } catch (error) {
      console.error('批量删除失败:', error);
      return { error: error instanceof Error ? error.message : '批量删除失败' };
    }
  }, [requireAdmin]);

  const importAnnotations = useCallback(async (items: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ error: string | null }> => {
    if (!requireAdmin('批量导入')) return { error: '需要登录' };

    try {
      const result = await apiSend<{ data: Annotation[] }>('/api/annotations', 'POST', { annotations: items });
      setAnnotations((prev) => {
        const next = new Map(prev.map((annotation) => [annotation.id, annotation]));
        result.data.forEach((annotation) => {
          next.set(annotation.id, annotation);
        });
        return Array.from(next.values());
      });
      return { error: null };
    } catch (error) {
      console.error('批量导入失败:', error);
      return { error: error instanceof Error ? error.message : '批量导入失败' };
    }
  }, [requireAdmin]);

  const updateFieldTemplates = useCallback(async (templates: FieldTemplate[], mapId: string): Promise<{ error: string | null }> => {
    if (!requireAdmin('更新字段模板')) return { error: '需要登录' };

    try {
      await apiSend('/api/map', 'PUT', { mapId, templates });
      return { error: null };
    } catch (error) {
      console.error('更新字段模板失败:', error);
      return { error: error instanceof Error ? error.message : '更新字段模板失败' };
    }
  }, [requireAdmin]);

  const updateMapSettings = useCallback(async (settings: MapSettings, mapId: string): Promise<{ error: string | null }> => {
    if (!requireAdmin('更新地图设置')) return { error: '需要登录' };

    try {
      await apiSend(`/api/maps/${mapId}`, 'PUT', { settings });
      return { error: null };
    } catch (error) {
      console.error('更新地图设置失败:', error);
      return { error: error instanceof Error ? error.message : '更新地图设置失败' };
    }
  }, [requireAdmin]);

  return {
    mapProject,
    setMapProject,
    annotations,
    setAnnotations,
    groups,
    setGroups,
    loading,
    error,
    loadData,
    saveAnnotation,
    deleteAnnotation,
    batchDeleteAnnotations,
    importAnnotations,
    updateFieldTemplates,
    updateMapSettings,
  };
}