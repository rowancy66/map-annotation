'use client';

import { useRef, useEffect } from 'react';
import { Annotation, FieldTemplate } from '@/lib/types';
import { Square, CheckSquare, ScanSearch, MapPin } from 'lucide-react';

interface AnnotationListProps {
  annotations: Annotation[];
  selectedAnnotation: Annotation | null;
  onAnnotationClick: (annotation: Annotation) => void;
  /** true 时显示卡片式（前台），false 时显示紧凑行式（后台） */
  readOnly?: boolean;
  /** 批量模式（仅后台） */
  batchMode?: boolean;
  selectedIds?: Set<string>;
  onBatchSelect?: (id: string) => void;
  /** 分组信息（仅后台行式需要） */
  groupColorMap?: Map<string, string>;
  groupNameMap?: Map<string, string>;
  /** 自定义字段模板名称映射（仅前台卡片需要） */
  fieldNameMap?: Map<string, string>;
  fieldTemplates?: FieldTemplate[];
}

const TYPE_LABELS: Record<string, string> = {
  point: '点',
  line: '线',
  polygon: '面',
  text: '文字',
};

const TYPE_COLORS: Record<string, string> = {
  point: '#c0392b',
  line: '#7a6b55',
  polygon: '#1a4735',
  text: '#d4954e',
};

export default function AnnotationList({
  annotations,
  selectedAnnotation,
  onAnnotationClick,
  readOnly = true,
  batchMode = false,
  selectedIds = new Set(),
  onBatchSelect,
  groupColorMap,
  groupNameMap,
  fieldNameMap,
  fieldTemplates,
}: AnnotationListProps) {
  const listItemRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!selectedAnnotation) return;
    const element = listItemRefs.current.get(selectedAnnotation.id);
    if (!element) return;
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedAnnotation, annotations]);

  if (annotations.length === 0) {
    return (
      <div className="border-b p-8 text-center text-sm" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-subtle)' }}>
        <ScanSearch className="mx-auto mb-3 h-8 w-8 opacity-40" style={{ color: 'var(--text-tertiary)' }} />
        {readOnly ? '暂无标注' : <><MapPin className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--text-tertiary)', opacity: 0.35 }} /><p style={{ color: 'var(--text-secondary)' }}>暂无查询结果</p></>}
      </div>
    );
  }

  if (readOnly) {
    // ===== 卡片式（前台） =====
    return (
      <div className="p-2.5">
        {annotations.map((anno) => {
          const isSelected = selectedAnnotation?.id === anno.id;
          return (
            <div
              key={anno.id}
              ref={(node) => {
                if (node) listItemRefs.current.set(anno.id, node);
                else listItemRefs.current.delete(anno.id);
              }}
              onClick={() => onAnnotationClick(anno)}
              className="cursor-pointer transition-all duration-200"
              style={{
                marginBottom: '8px',
                background: isSelected ? 'rgba(10,75,63,0.05)' : 'var(--surface-primary)',
                border: isSelected ? '1px solid rgba(10,75,63,0.22)' : '1px solid var(--border-subtle)',
                transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0"
                    style={{ background: TYPE_COLORS[anno.type] || TYPE_COLORS.point }}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: isSelected ? 'var(--primary-default)' : 'var(--text-tertiary)' }}
                    >
                      {anno.id.slice(0, 8)}
                    </div>
                    <span className="text-sm font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
                      {anno.name || '未命名'}
                    </span>
                    {anno.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{anno.description}</p>
                    )}
                  </div>
                  <span
                    className="shrink-0 px-2 py-1 text-[10px] font-medium"
                    style={{
                      background: `${TYPE_COLORS[anno.type]}14`,
                      color: TYPE_COLORS[anno.type] || TYPE_COLORS.point,
                    }}
                  >
                    {TYPE_LABELS[anno.type] || '?'}
                  </span>
                </div>
                {anno.type === 'point' && anno.custom_fields.length > 0 && fieldNameMap && (
                  <div className="mt-2 flex flex-wrap gap-1.5" style={{ marginLeft: '1.25rem' }}>
                    {anno.custom_fields.slice(0, 3).map((cf) => {
                      const name = fieldNameMap.get(cf.fieldId);
                      if (!name || cf.value == null) return null;
                      return (
                        <span
                          key={cf.fieldId}
                          className="px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: isSelected ? 'rgba(184,155,114,0.14)' : 'rgba(23,23,23,0.04)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {name}: {String(cf.value)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ===== 紧凑行式（后台） =====
  return (
    <div className="map-directory-list">
      {annotations.map((anno) => {
        const groupColor = anno.group_id ? groupColorMap?.get(anno.group_id) : null;
        const groupName = anno.group_id ? groupNameMap?.get(anno.group_id) : null;
        return (
          <div
            key={anno.id}
            ref={(node) => {
              if (node) listItemRefs.current.set(anno.id, node);
              else listItemRefs.current.delete(anno.id);
            }}
            onClick={() => onAnnotationClick(anno)}
            className="map-directory-row"
            data-active={selectedAnnotation?.id === anno.id}
          >
            <div className="map-directory-row-main">
              {batchMode && onBatchSelect && (
                <button
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBatchSelect(anno.id);
                  }}
                  aria-label={selectedIds.has(anno.id) ? '取消选择' : '选择'}
                >
                  {selectedIds.has(anno.id) ? (
                    <CheckSquare className="w-4 h-4" style={{ color: 'var(--primary-default)' }} aria-hidden="true" />
                  ) : (
                    <Square className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
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
                    color: groupColor || 'var(--primary-default)',
                    borderColor: groupColor ? `${groupColor}2d` : 'rgba(10,75,63,0.16)',
                  }}
                >
                  {groupName}
                </span>
              )}
              <span className="map-directory-type">
                {TYPE_LABELS[anno.type] || '?'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}