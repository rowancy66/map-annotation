'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { MapProject, Annotation, FieldTemplate } from '@/lib/types';
import { DEFAULT_LAND_FIELD_TEMPLATES } from '@/lib/constants';

export function useMapData(user: User | null) {
  const [mapProject, setMapProject] = useState<MapProject | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toMapProject = (row: Record<string, unknown>): MapProject =>
    row as unknown as MapProject;

  const toAnnotation = (row: Record<string, unknown>): Annotation =>
    row as unknown as Annotation;

  const toAnnotations = (rows: Record<string, unknown>[] | null): Annotation[] =>
    rows ? (rows as unknown as Annotation[]) : [];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let map: MapProject | null = null;

      if (user) {
        // 已登录：按用户加载地图
        const { data: maps, error: mapsError } = await supabase
          .from('maps')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (mapsError) throw mapsError;

        if (!maps || maps.length === 0) {
          // 无地图时自动创建
          const { data: newMap, error: insertError } = await supabase
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

          if (insertError) throw insertError;
          map = toMapProject(newMap as Record<string, unknown>);
        } else {
          map = toMapProject(maps[0] as Record<string, unknown>);
        }

        // 同步字段模板：用最新 DEFAULT_LAND_FIELD_TEMPLATES 覆盖已有模板的名称和排序
        if (map.field_templates && Array.isArray(map.field_templates)) {
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
          if (merged.length === 0) {
            // 空模板时写入默认值
            merged = DEFAULT_LAND_FIELD_TEMPLATES;
            changed = true;
          }
          if (changed) {
            const { data: updated } = await supabase
              .from('maps')
              .update({ field_templates: merged })
              .eq('id', map.id)
              .select()
              .single();
            if (updated) {
              map = toMapProject(updated as Record<string, unknown>);
            } else {
              map = { ...map, field_templates: merged as FieldTemplate[] };
            }
          }
        }
      } else {
        // 未登录：查询所有地图，取第一个（公共查看）
        const { data: maps, error: mapsError } = await supabase
          .from('maps')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (mapsError) throw mapsError;
        if (maps && maps.length > 0) {
          map = toMapProject(maps[0] as Record<string, unknown>);
        }
      }

      if (map) {
        setMapProject(map);

        const { data: annos, error: annosError } = await supabase
          .from('annotations')
          .select('*')
          .eq('map_id', map.id)
          .order('created_at', { ascending: true });

        if (annosError) throw annosError;
        setAnnotations(toAnnotations(annos as Record<string, unknown>[] | null));
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const requireUser = useCallback((op: string): boolean => {
    if (!user) {
      console.warn(`${op} 需要登录`);
      return false;
    }
    return true;
  }, [user]);

  const saveAnnotation = useCallback(async (annotation: Annotation): Promise<{ data: Annotation | null; error: string | null }> => {
    if (!requireUser('保存标注')) return { data: null, error: '需要登录' };

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
      return { data: null, error: error.message };
    }
    return { data: toAnnotation(data as Record<string, unknown>), error: null };
  }, [requireUser]);

  const deleteAnnotation = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (!requireUser('删除标注')) return { error: '需要登录' };

    const { error } = await supabase.from('annotations').delete().eq('id', id);
    if (error) {
      console.error('删除标注失败:', error);
      return { error: error.message };
    }
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    return { error: null };
  }, [requireUser]);

  const batchDeleteAnnotations = useCallback(async (ids: string[]): Promise<{ error: string | null }> => {
    if (!requireUser('批量删除')) return { error: '需要登录' };

    const { error } = await supabase.from('annotations').delete().in('id', ids);
    if (error) {
      console.error('批量删除失败:', error);
      return { error: error.message };
    }
    setAnnotations((prev) => prev.filter((a) => !ids.includes(a.id)));
    return { error: null };
  }, [requireUser]);

  const importAnnotations = useCallback(async (items: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ error: string | null }> => {
    if (!requireUser('批量导入')) return { error: '需要登录' };

    const newAnnotations: Annotation[] = items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('annotations')
      .insert(newAnnotations)
      .select();

    if (error) {
      console.error('批量导入失败:', error);
      return { error: error.message };
    }

    if (data) {
      setAnnotations((prev) => [...prev, ...toAnnotations(data as Record<string, unknown>[])]);
    } else {
      setAnnotations((prev) => [...prev, ...newAnnotations]);
    }
    return { error: null };
  }, [requireUser]);

  const updateFieldTemplates = useCallback(async (templates: FieldTemplate[], mapId: string): Promise<{ error: string | null }> => {
    if (!requireUser('更新字段模板')) return { error: '需要登录' };

    const { error } = await supabase.from('maps').update({ field_templates: templates }).eq('id', mapId);
    if (error) {
      console.error('更新字段模板失败:', error);
      return { error: error.message };
    }
    return { error: null };
  }, [requireUser]);

  return {
    mapProject,
    setMapProject,
    annotations,
    setAnnotations,
    loading,
    error,
    loadData,
    saveAnnotation,
    deleteAnnotation,
    batchDeleteAnnotations,
    importAnnotations,
    updateFieldTemplates,
  };
}
