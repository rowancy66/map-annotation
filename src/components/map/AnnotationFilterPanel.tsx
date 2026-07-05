'use client';

import { AnnotationFieldFilter, AnnotationFilterState, FieldTemplate, Group } from '@/lib/types';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';

interface AnnotationFilterPanelProps {
  filters: AnnotationFilterState;
  fieldTemplates: FieldTemplate[];
  groups: Group[];
  resultCount: number;
  totalCount: number;
  onChange: (filters: AnnotationFilterState) => void;
}

function createEmptyFieldFilter(fieldTemplates: FieldTemplate[]): AnnotationFieldFilter | null {
  const template = fieldTemplates[0];
  if (!template) return null;
  return {
    fieldId: template.id,
    operator: template.type === 'number' ? 'range' : template.type === 'date' ? 'dateRange' : 'contains',
    value: '',
    min: '',
    max: '',
  };
}

export default function AnnotationFilterPanel({
  filters,
  fieldTemplates,
  groups,
  resultCount,
  totalCount,
  onChange,
}: AnnotationFilterPanelProps) {
  const updateFieldFilter = (index: number, next: AnnotationFieldFilter) => {
    const nextFilters = [...filters.fieldFilters];
    nextFilters[index] = next;
    onChange({ ...filters, fieldFilters: nextFilters });
  };

  const handleTemplateChange = (index: number, fieldId: string) => {
    const template = fieldTemplates.find((item) => item.id === fieldId);
    if (!template) return;
    updateFieldFilter(index, {
      fieldId,
      operator: template.type === 'number' ? 'range' : template.type === 'date' ? 'dateRange' : 'contains',
      value: '',
      min: '',
      max: '',
    });
  };

  return (
    <div className="space-y-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-panel)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>筛选</h3>
          <p className="text-[11px]" style={{ color: 'var(--faint)' }}>命中 {resultCount} / {totalCount}</p>
        </div>
        <button
          onClick={() => onChange({ keyword: '', selectedGroupId: null, selectedTypes: [], fieldFilters: [] })}
          className="ghost-button workbench-hard-edge inline-flex items-center gap-1 px-2.5 py-1 text-[11px]"
        >
          <RotateCcw className="w-3 h-3" />
          清空
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>关键词</label>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
            placeholder="名称、描述、自定义字段"
            className="w-full px-3 py-2 text-sm outline-none workbench-hard-edge workbench-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>分组</label>
            <select
              value={filters.selectedGroupId ?? ''}
              onChange={(e) => onChange({ ...filters, selectedGroupId: e.target.value || null })}
              className="w-full px-3 py-2 text-sm outline-none workbench-hard-edge workbench-field"
            >
              <option value="">全部分组</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>标注类型</label>
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'point', label: '点' },
                { value: 'line', label: '线' },
                { value: 'polygon', label: '面' },
                { value: 'text', label: '文字' },
              ].map((type) => {
                const active = filters.selectedTypes.includes(type.value as typeof filters.selectedTypes[number]);
                return (
                  <button
                    key={type.value}
                    onClick={() => {
                      const next = active
                        ? filters.selectedTypes.filter((item) => item !== type.value)
                        : [...filters.selectedTypes, type.value as typeof filters.selectedTypes[number]];
                      onChange({ ...filters, selectedTypes: next });
                    }}
                    className="px-2.5 py-1 text-[11px] transition workbench-hard-edge"
                    style={{
                      background: active ? 'rgba(11,79,69,0.08)' : 'var(--surface-strong)',
                      color: active ? 'var(--ink)' : 'var(--muted)',
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>字段筛选</span>
          <button
            onClick={() => {
              const next = createEmptyFieldFilter(fieldTemplates);
              if (!next) return;
              onChange({ ...filters, fieldFilters: [...filters.fieldFilters, next] });
            }}
            className="ghost-button workbench-hard-edge inline-flex items-center gap-1 px-2.5 py-1 text-[11px]"
          >
            <Plus className="w-3 h-3" />
            添加字段条件
          </button>
        </div>

        {filters.fieldFilters.length === 0 && (
          <p className="text-[11px]" style={{ color: 'var(--faint)' }}>还没有字段条件</p>
        )}

        {filters.fieldFilters.map((filter, index) => {
          const template = fieldTemplates.find((item) => item.id === filter.fieldId);
          if (!template) return null;

          return (
            <div key={`${filter.fieldId}-${index}`} className="workbench-panel workbench-hard-edge space-y-2 p-3" style={{ background: 'var(--surface-muted)' }}>
              <div className="grid grid-cols-[1fr,auto] gap-2">
                <select
                  value={filter.fieldId}
                  onChange={(e) => handleTemplateChange(index, e.target.value)}
                  className="px-3 py-2 text-sm outline-none workbench-hard-edge workbench-field"
                >
                  {fieldTemplates.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => onChange({ ...filters, fieldFilters: filters.fieldFilters.filter((_, itemIndex) => itemIndex !== index) })}
                  className="workbench-hard-edge px-2 py-2 transition"
                  style={{ color: 'var(--danger)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.72)' }}
                  aria-label="删除字段条件"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {(template.type === 'text' || template.type === 'select') && (
                <div className="grid grid-cols-[120px,1fr] gap-2">
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFieldFilter(index, { ...filter, operator: e.target.value as AnnotationFieldFilter['operator'], value: '' })}
                    className="px-3 py-2 text-sm outline-none workbench-hard-edge workbench-field"
                  >
                    <option value="contains">包含</option>
                    <option value="equals">等于</option>
                  </select>
                  <input
                    type="text"
                    value={filter.value || ''}
                    onChange={(e) => updateFieldFilter(index, { ...filter, value: e.target.value })}
                    className="px-3 py-2 text-sm outline-none workbench-hard-edge workbench-field"
                    placeholder="输入匹配值"
                  />
                </div>
              )}

              {template.type === 'number' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filter.min || ''}
                    onChange={(e) => updateFieldFilter(index, { ...filter, min: e.target.value })}
                    className="px-3 py-2 text-sm outline-none workbench-hard-edge workbench-field"
                    placeholder="最小值"
                  />
                  <input
                    type="number"
                    value={filter.max || ''}
                    onChange={(e) => updateFieldFilter(index, { ...filter, max: e.target.value })}
                    className="px-3 py-2 text-sm outline-none workbench-hard-edge workbench-field"
                    placeholder="最大值"
                  />
                </div>
              )}

              {template.type === 'date' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filter.min || ''}
                    onChange={(e) => updateFieldFilter(index, { ...filter, min: e.target.value })}
                    className="px-3 py-2 text-sm outline-none workbench-hard-edge workbench-field"
                  />
                  <input
                    type="date"
                    value={filter.max || ''}
                    onChange={(e) => updateFieldFilter(index, { ...filter, max: e.target.value })}
                    className="px-3 py-2 text-sm outline-none workbench-hard-edge workbench-field"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
