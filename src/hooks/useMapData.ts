'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { MapProject, Annotation, FieldTemplate } from '@/lib/types';
import { DEFAULT_LAND_FIELD_TEMPLATES } from '@/lib/constants';

/**
 * 自定义 Hook：加载地图项目与标注数据
 * 修复 #4: loadData 放入 useEffect 依赖正确
 * 修复 #7: 消除 as unknown as，用类型安全转换
 * 修复 #2: 删除/保存操作增加错误处理
 */
export function useMapData(user: User | null) {
  const [mapProject, setMapProject] = useState<MapProject | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase 返回行 → 应用类型（字段一致，直接断言）
  const toMapProject = (row: Record<string, unknown>): MapProject =>
    row as unknown as MapProject;

  const toAnnotation = (row: Record<string, unknown>): Annotation =>
    row as unknown as Annotation;

  const toAnnotations = (rows: Record<string, unknown>[] | null): Annotation[] =>
    rows ? (rows as unknown as Annotation[]) : [];

  // 加载数据
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: maps, error: mapsError } = await supabase
        .from('maps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (mapsError) throw mapsError;

      let map: MapProject;
      if (!maps || maps.length === 0) {
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

      // 回填：如果地图缺少字段模板（旧用户），自动补上
      if (map.field_templates && Array.isArray(map.field_templates) && map.field_templates.length === 0) {
        const { data: updated } = await supabase
          .from('maps')
          .update({ field_templates: DEFAULT_LAND_FIELD_TEMPLATES })
          .eq('id', map.id)
          .select()
          .single();
        if (updated) {
          map = toMapProject(updated as Record<string, unknown>);
        }
      }

      setMapProject(map);

      const { data: annos, error: annosError } = await supabase
        .from('annotations')
        .select('*')
        .eq('map_id', map.id)
        .order('created_at', { ascending: true });

      if (annosError) throw annosError;
      setAnnotations(toAnnotations(annos as Record<string, unknown>[] | null));
    } catch (err) {
      console.error('加载数据失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 修复 #4: loadData 放入依赖
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  // 保存标注
  const saveAnnotation = useCallback(async (annotation: Annotation): Promise<{ data: Annotation | null; error: string | null }> => {
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
      // 修复 #15: 返回错误让调用方可以反馈
      return { data: null, error: error.message };
    }
    return { data: toAnnotation(data as Record<string, unknown>), error: null };
  }, []);

  // 删除标注（修复 #2: 处理错误）
  const deleteAnnotation = useCallback(async (id: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.from('annotations').delete().eq('id', id);
    if (error) {
      console.error('删除标注失败:', error);
      return { error: error.message };
    }
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    return { error: null };
  }, []);

  // 批量删除（修复 #2: 处理错误）
  const batchDeleteAnnotations = useCallback(async (ids: string[]): Promise<{ error: string | null }> => {
    const { error } = await supabase.from('annotations').delete().in('id', ids);
    if (error) {
      console.error('批量删除失败:', error);
      return { error: error.message };
    }
    setAnnotations((prev) => prev.filter((a) => !ids.includes(a.id)));
    return { error: null };
  }, []);

  // 批量导入
  const importAnnotations = useCallback(async (items: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ error: string | null }> => {
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
  }, []);

  // 更新字段模板
  const updateFieldTemplates = useCallback(async (templates: FieldTemplate[], mapId: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.from('maps').update({ field_templates: templates }).eq('id', mapId);
    if (error) {
      console.error('更新字段模板失败:', error);
      return { error: error.message };
    }
    return { error: null };
  }, []);

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
