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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
      >
        <span className="text-sm font-medium text-gray-700">
          自定义字段 ({templates.length})
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t">
          {templates.length === 0 && (
            <p className="text-sm text-gray-400 py-3 text-center">暂无自定义字段，点击下方添加</p>
          )}
          {templates.map((field) => (
              <div key={field.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => {
                      updateField(field.id, { name: e.target.value });
                    }}
                    placeholder="字段名称"
                    className="px-2 py-1.5 border rounded text-sm"
                  />
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                  className="px-2 py-1.5 border rounded text-sm"
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
                    className="col-span-2 px-2 py-1.5 border rounded text-sm"
                  />
                )}
              </div>
              <label className="flex items-center gap-1 text-xs text-gray-500 pt-1.5">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  className="rounded"
                />
                必填
              </label>
              <button
                onClick={() => removeField(field.id)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addField}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> 添加字段
          </button>
        </div>
      )}
    </div>
  );
}
