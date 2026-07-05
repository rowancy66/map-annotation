'use client';

import { useState } from 'react';
import { FieldTemplate, FieldType } from '@/lib/types';
import { Plus, Trash2, ChevronDown } from 'lucide-react';

interface FieldTemplateManagerProps {
  templates: FieldTemplate[];
  onChange: (templates: FieldTemplate[]) => void;
}

export default function FieldTemplateManager({ templates, onChange }: FieldTemplateManagerProps) {
  const [expanded, setExpanded] = useState(false);

  const addField = () => {
    const newField: FieldTemplate = {
      id: crypto.randomUUID(),
      name: '',
      type: 'text',
      required: false,
      sort_order: templates.length,
    };
    onChange([...templates, newField]);
  };

  const updateField = (id: string, updates: Partial<FieldTemplate>) => {
    onChange(templates.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const removeField = (id: string) => {
    onChange(templates.filter((t) => t.id !== id));
  };

  return (
    <div className="workbench-panel workbench-hard-edge overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 transition"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--ink)', background: 'rgba(255,255,255,0.2)' }}
      >
        <span className="text-sm font-medium">
          自定义字段 ({templates.length})
        </span>
        <ChevronDown className={`w-4 h-4 transition ${expanded ? 'rotate-180' : ''}`} style={{ color: 'var(--muted)' }} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--border)' }}>
          {templates.length === 0 && (
            <p className="py-3 text-center text-sm" style={{ color: 'var(--faint)' }}>暂无自定义字段，点击下方添加</p>
          )}
          {templates.map((field) => (
            <div key={field.id} className="workbench-panel workbench-hard-edge flex items-start gap-2 p-3">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  key={'name-' + field.id}
                  defaultValue={field.name}
                  onBlur={(e) => {
                    if (e.target.value !== field.name) {
                      updateField(field.id, { name: e.target.value });
                    }
                  }}
                  placeholder="字段名称"
                  className="px-2 py-1.5 border text-sm outline-none workbench-hard-edge workbench-field"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                  className="px-2 py-1.5 border text-sm outline-none workbench-hard-edge workbench-field"
                >
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="date">日期</option>
                  <option value="select">选择</option>
                </select>
                {field.type === 'select' && (
                  <input
                    type="text"
                    value={field.options?.join(',') ?? ''}
                    onChange={(e) =>
                      updateField(field.id, {
                        options: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : [],
                      })
                    }
                    placeholder="选项（逗号分隔，如：选项1,选项2）"
                    className="col-span-2 px-2 py-1.5 border text-sm outline-none workbench-hard-edge workbench-field"
                  />
                )}
              </div>
              <label className="flex items-center gap-1 pt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                />
                必填
              </label>
              <button
                onClick={() => removeField(field.id)}
                className="p-1.5 transition"
                style={{ color: 'var(--danger)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.72)' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addField}
            className="flex w-full items-center justify-center gap-1 border py-2 text-sm transition workbench-hard-edge"
            style={{ borderStyle: 'dashed', borderColor: 'var(--border)', color: 'var(--muted)', background: 'rgba(255,255,255,0.36)' }}
          >
            <Plus className="w-4 h-4" /> 添加字段
          </button>
        </div>
      )}
    </div>
  );
}
