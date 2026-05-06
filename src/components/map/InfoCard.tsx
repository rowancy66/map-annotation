'use client';

import { useState, useEffect } from 'react';
import { Annotation, PointStyle, LineStyle, PolygonStyle, PRESET_COLORS, PRESET_ICONS, FieldTemplate, CustomFieldValue, FieldType } from '@/lib/types';
import { X, Save, Trash2, Plus, Minus } from 'lucide-react';

interface InfoCardProps {
  annotation: Annotation;
  fieldTemplates: FieldTemplate[];
  onClose: () => void;
  onSave: (annotation: Annotation) => void;
  onDelete: (id: string) => void;
}

export default function InfoCard({ annotation, fieldTemplates, onClose, onSave, onDelete }: InfoCardProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Annotation>({ ...annotation });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setEditData({ ...annotation });
    setEditing(false);
    setShowDeleteConfirm(false);
  }, [annotation]);

  const handleSave = () => {
    onSave(editData);
    setEditing(false);
  };

  const handleCustomFieldChange = (fieldId: string, value: string | number | null) => {
    const fields = [...editData.custom_fields];
    const idx = fields.findIndex((f) => f.fieldId === fieldId);
    if (idx >= 0) {
      fields[idx] = { ...fields[idx], value };
    } else {
      fields.push({ fieldId, value });
    }
    setEditData({ ...editData, custom_fields: fields });
  };

  const getCustomFieldValue = (fieldId: string): string | number | null => {
    return editData.custom_fields.find((f) => f.fieldId === fieldId)?.value ?? null;
  };

  return (
    <div className="w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl overflow-hidden max-md:w-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            annotation.type === 'point' ? 'bg-blue-100 text-blue-700' :
            annotation.type === 'line' ? 'bg-green-100 text-green-700' :
            'bg-purple-100 text-purple-700'
          }`}>
            {annotation.type === 'point' ? '点' : annotation.type === 'line' ? '线' : '面'}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(annotation.updated_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded transition">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* 内容 */}
      <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
        {/* 名称 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">名称</label>
          {editing ? (
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="输入名称"
            />
          ) : (
            <p className="text-sm font-medium text-gray-900">{annotation.name || '未命名'}</p>
          )}
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">描述</label>
          {editing ? (
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
              placeholder="输入描述"
            />
          ) : (
            <p className="text-sm text-gray-700">{annotation.description || '暂无描述'}</p>
          )}
        </div>

        {/* 样式 */}
        {editing && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">样式</label>
            <StyleEditor
              type={annotation.type}
              style={editData.style}
              onChange={(style) => setEditData({ ...editData, style })}
            />
          </div>
        )}

        {/* 坐标信息 */}
        {!editing && annotation.type === 'point' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">坐标</label>
            <p className="text-xs text-gray-600 font-mono">
              {(annotation.geometry as { coordinates: [number, number] }).coordinates.join(', ')}
            </p>
          </div>
        )}

        {/* 自定义字段 */}
        {fieldTemplates.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">自定义属性</label>
            <div className="space-y-2">
              {fieldTemplates.map((field) => (
                <div key={field.id}>
                  <label className="block text-xs text-gray-600 mb-0.5">{field.name}</label>
                  {editing ? (
                    field.type === 'select' ? (
                      <select
                        value={String(getCustomFieldValue(field.id) ?? '')}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      >
                        <option value="">未选择</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={String(getCustomFieldValue(field.id) ?? '')}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      />
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={String(getCustomFieldValue(field.id) ?? '')}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(getCustomFieldValue(field.id) ?? '')}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      />
                    )
                  ) : (
                    <p className="text-sm text-gray-800">
                      {String(getCustomFieldValue(field.id) ?? '—')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作 */}
      <div className="px-4 py-3 border-t bg-gray-50 flex items-center gap-2">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1"
            >
              <Save className="w-4 h-4" /> 保存
            </button>
            <button
              onClick={() => { setEditData({ ...annotation }); setEditing(false); }}
              className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              编辑
            </button>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDelete(annotation.id)}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== 样式编辑器子组件 =====
function StyleEditor({
  type,
  style,
  onChange,
}: {
  type: string;
  style: PointStyle | LineStyle | PolygonStyle;
  onChange: (style: PointStyle | LineStyle | PolygonStyle) => void;
}) {
  if (type === 'point') {
    const s = style as PointStyle;
    return (
      <div className="space-y-3">
        {/* 颜色选择 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">颜色</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onChange({ ...s, color: c.value })}
                className={`w-7 h-7 rounded-full border-2 transition ${
                  s.color === c.value ? 'border-blue-500 scale-110' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>
        {/* 图标选择 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">图标</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ICONS.map((icon) => (
              <button
                key={icon.value}
                onClick={() => onChange({ ...s, icon: icon.value })}
                className={`px-2 py-1 rounded text-xs border transition ${
                  s.icon === icon.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                {icon.name}
              </button>
            ))}
          </div>
        </div>
        {/* 大小 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">大小: {s.size || 3}</label>
          <input
            type="range"
            min={1}
            max={5}
            value={s.size || 3}
            onChange={(e) => onChange({ ...s, size: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  if (type === 'line') {
    const s = style as LineStyle;
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">颜色</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onChange({ ...s, color: c.value })}
                className={`w-7 h-7 rounded-full border-2 transition ${
                  s.color === c.value ? 'border-blue-500 scale-110' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">线宽: {s.width || 3}</label>
          <input
            type="range"
            min={1}
            max={10}
            value={s.width || 3}
            onChange={(e) => onChange({ ...s, width: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">线型</label>
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ ...s, dashArray: undefined })}
              className={`px-3 py-1.5 rounded text-xs border transition ${
                !s.dashArray ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              实线
            </button>
            <button
              onClick={() => onChange({ ...s, dashArray: '8, 4' })}
              className={`px-3 py-1.5 rounded text-xs border transition ${
                s.dashArray ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              虚线
            </button>
          </div>
        </div>
      </div>
    );
  }

  // polygon
  const s = style as PolygonStyle;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">边框颜色</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChange({ ...s, color: c.value })}
              className={`w-7 h-7 rounded-full border-2 transition ${
                s.color === c.value ? 'border-blue-500 scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">填充颜色</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChange({ ...s, fillColor: c.value })}
              className={`w-7 h-7 rounded-full border-2 transition ${
                s.fillColor === c.value ? 'border-blue-500 scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">透明度: {Math.round((s.fillOpacity || 0.3) * 100)}%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((s.fillOpacity || 0.3) * 100)}
          onChange={(e) => onChange({ ...s, fillOpacity: Number(e.target.value) / 100 })}
          className="w-full"
        />
      </div>
    </div>
  );
}
