'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Annotation, PointStyle, LineStyle, PolygonStyle, PRESET_COLORS, PRESET_ICONS, FieldTemplate, CustomFieldValue, FieldType } from '@/lib/types';
import { X, Save, Trash2, Plus, Minus, Loader2, GripHorizontal } from 'lucide-react';

interface InfoCardProps {
  annotation: Annotation;
  fieldTemplates: FieldTemplate[];
  onClose: () => void;
  onSave: (annotation: Annotation) => Promise<Annotation | undefined>;
  onDelete: (id: string) => Promise<void>;
}

export default function InfoCard({ annotation, fieldTemplates, onClose, onSave, onDelete }: InfoCardProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Annotation>({ ...annotation });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setEditData({ ...annotation });
    setEditing(false);
    setShowDeleteConfirm(false);
  }, [annotation]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (editing) return;
    e.preventDefault();
    isDraggingRef.current = true;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }

    const currentLeft = position ? position.x : rect.left;
    const currentTop = position ? position.y : rect.top;

    dragOffsetRef.current = {
      x: e.clientX - currentLeft,
      y: e.clientY - currentTop,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newX = moveEvent.clientX - dragOffsetRef.current.x;
      const newY = moveEvent.clientY - dragOffsetRef.current.y;
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [editing, position]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editData);
      setEditing(false);
    } finally {
      setSaving(false);
    }
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

  const stylePos = position
    ? { position: 'fixed' as const, left: position.x, top: position.y, zIndex: 2000 }
    : {};

  return (
    <div
      ref={cardRef}
      style={stylePos}
      className="w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl overflow-hidden"
    >
      <div
        onMouseDown={handleDragStart}
        className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 cursor-move select-none"
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="w-3.5 h-3.5 text-gray-400" />
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            annotation.type === 'point' ? 'bg-blue-100 text-blue-700' :
            annotation.type === 'line' ? 'bg-green-100 text-green-700' :
            'bg-purple-100 text-purple-700'
          }`}>
            {annotation.type === 'point' ? '点' : annotation.type === 'line' ? '线' : '面'}
          </span>
          <span className="text-[10px] text-gray-400">
            {new Date(annotation.updated_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-gray-200 rounded transition">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      <div className="px-3 py-2 max-h-[35vh] overflow-y-auto space-y-2.5 text-sm">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">名称</label>
          {editing ? (
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="输入名称"
            />
          ) : (
            <p className="text-xs font-medium text-gray-900">{annotation.name || '未命名'}</p>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">描述</label>
          {editing ? (
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              rows={2}
              placeholder="输入描述"
            />
          ) : (
            <p className="text-xs text-gray-700">{annotation.description || '暂无描述'}</p>
          )}
        </div>

        {editing && (
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-1">样式</label>
            <StyleEditor
              type={annotation.type}
              style={editData.style}
              onChange={(style) => setEditData({ ...editData, style })}
            />
          </div>
        )}

        {!editing && annotation.type === 'point' && (
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">坐标</label>
            <p className="text-[10px] text-gray-600 font-mono">
              {(annotation.geometry as { coordinates: [number, number] }).coordinates.join(', ')}
            </p>
          </div>
        )}

        {fieldTemplates.length > 0 && (
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-1">自定义属性</label>
            <div className="space-y-1.5">
              {fieldTemplates.map((field) => (
                <div key={field.id} className="flex items-start gap-2">
                  <span className="text-[10px] text-gray-500 min-w-[3rem] pt-0.5">{field.name}</span>
                  <div className="flex-1">
                    {editing ? (
                      field.type === 'select' ? (
                        <select
                          value={String(getCustomFieldValue(field.id) ?? '')}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                          className="w-full px-1.5 py-1 border rounded text-xs"
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
                          className="w-full px-1.5 py-1 border rounded text-xs"
                        />
                      ) : field.type === 'date' ? (
                        <input
                          type="date"
                          value={String(getCustomFieldValue(field.id) ?? '')}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                          className="w-full px-1.5 py-1 border rounded text-xs"
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(getCustomFieldValue(field.id) ?? '')}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                          className="w-full px-1.5 py-1 border rounded text-xs"
                        />
                      )
                    ) : (
                      <p className="text-xs text-gray-800">
                        {String(getCustomFieldValue(field.id) ?? '—')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t bg-gray-50 flex items-center gap-1.5">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => { setEditData({ ...annotation }); setEditing(false); }}
              disabled={saving}
              className="flex-1 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 disabled:opacity-50 transition"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
            >
              编辑
            </button>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    setDeleting(true);
                    await onDelete(annotation.id);
                    setDeleting(false);
                  }}
                  disabled={deleting}
                  className="px-2 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-0.5"
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  确认
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-2 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 disabled:opacity-50 transition"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
      <div className="space-y-2">
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">颜色</label>
          <div className="flex flex-wrap gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onChange({ ...s, color: c.value })}
                className={`w-5 h-5 rounded-full border transition ${
                  s.color === c.value ? 'border-blue-500 scale-110' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">图标</label>
          <div className="flex flex-wrap gap-1">
            {PRESET_ICONS.map((icon) => (
              <button
                key={icon.value}
                onClick={() => onChange({ ...s, icon: icon.value })}
                className={`px-1.5 py-0.5 rounded text-[10px] border transition ${
                  s.icon === icon.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                {icon.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">大小: {s.size || 2}</label>
          <input
            type="range"
            min={1}
            max={5}
            value={s.size || 2}
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
      <div className="space-y-2">
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">颜色</label>
          <div className="flex flex-wrap gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onChange({ ...s, color: c.value })}
                className={`w-5 h-5 rounded-full border transition ${
                  s.color === c.value ? 'border-blue-500 scale-110' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">线宽: {s.width || 3}</label>
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
          <label className="block text-[10px] text-gray-500 mb-0.5">线型</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => onChange({ ...s, dashArray: undefined })}
              className={`px-2 py-1 rounded text-[10px] border transition ${
                !s.dashArray ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              实线
            </button>
            <button
              onClick={() => onChange({ ...s, dashArray: '8, 4' })}
              className={`px-2 py-1 rounded text-[10px] border transition ${
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

  const s = style as PolygonStyle;
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">边框颜色</label>
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChange({ ...s, color: c.value })}
              className={`w-5 h-5 rounded-full border transition ${
                s.color === c.value ? 'border-blue-500 scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">填充颜色</label>
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChange({ ...s, fillColor: c.value })}
              className={`w-5 h-5 rounded-full border transition ${
                s.fillColor === c.value ? 'border-blue-500 scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">透明度: {Math.round((s.fillOpacity || 0.3) * 100)}%</label>
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
