'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Annotation, PointStyle, LineStyle, PolygonStyle, PRESET_COLORS, PRESET_ICONS, FieldTemplate, CustomFieldValue, FieldType } from '@/lib/types';
import { X, Save, Trash2, Loader2, GripHorizontal } from 'lucide-react';

interface InfoCardProps {
  annotation: Annotation;
  fieldTemplates: FieldTemplate[];
  onClose: () => void;
  onSave: (annotation: Annotation) => Promise<Annotation | undefined>;
  onDelete: (id: string) => Promise<void>;
  readOnly?: boolean;
}

export default function InfoCard({ annotation, fieldTemplates, onClose, onSave, onDelete, readOnly = false }: InfoCardProps) {
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

  const typeStyles = {
    point: { label: '点', badge: 'bg-blue-100 text-blue-700', bar: 'from-blue-500 to-blue-400' },
    line: { label: '线', badge: 'bg-green-100 text-green-700', bar: 'from-green-500 to-emerald-400' },
    polygon: { label: '面', badge: 'bg-purple-100 text-purple-700', bar: 'from-purple-500 to-violet-400' },
  };
  const ts = typeStyles[annotation.type as keyof typeof typeStyles] || typeStyles.point;

  return (
    <div
      ref={cardRef}
      style={stylePos}
      className="w-72 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/50 overflow-hidden animate-fade-slide-up"
    >
      {/* 顶部色条 + 标题栏 */}
      <div className={`h-1 bg-gradient-to-r ${ts.bar}`} />
      <div
        onMouseDown={readOnly ? undefined : handleDragStart}
        className={`flex items-center justify-between px-3 py-2.5 ${readOnly ? '' : 'cursor-move select-none'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!readOnly && <GripHorizontal className="w-3.5 h-3.5 text-gray-300 shrink-0" aria-hidden="true" />}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${ts.badge}`}>
            {ts.label}
          </span>
          <span className="text-[10px] text-gray-400 truncate">
            {new Date(annotation.updated_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
        <button onClick={onClose} aria-label="关闭" className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition shrink-0">
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="px-3.5 py-2.5 max-h-[40vh] overflow-y-auto space-y-3 text-sm">
        {/* 名称 */}
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-1 uppercase tracking-wider">名称</label>
          {editing ? (
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/80"
              placeholder="输入名称…"
            />
          ) : (
            <p className="text-sm font-semibold text-gray-900 leading-snug">{annotation.name || <span className="text-gray-300 font-normal">未命名</span>}</p>
          )}
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-1 uppercase tracking-wider">描述</label>
          {editing ? (
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition bg-white/80"
              rows={2}
              placeholder="输入描述…"
            />
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed">{annotation.description || <span className="text-gray-300">暂无描述</span>}</p>
          )}
        </div>

        {/* 编辑模式：样式 */}
        {editing && (
          <div className="bg-gray-50/80 rounded-lg p-2.5 -mx-0.5 transition-all">
            <label className="block text-[10px] font-medium text-gray-400 mb-2 uppercase tracking-wider">样式</label>
            <StyleEditor
              type={annotation.type}
              style={editData.style}
              onChange={(style) => setEditData({ ...editData, style })}
            />
          </div>
        )}

        {/* 查看模式：坐标 */}
        {!editing && annotation.type === 'point' && (
          <div>
            <label className="block text-[10px] font-medium text-gray-400 mb-1 uppercase tracking-wider">坐标</label>
            <p className="text-[11px] text-gray-500 font-mono bg-gray-50/80 rounded-lg px-2.5 py-1.5 border border-gray-100">
              {(annotation.geometry as { coordinates: [number, number] }).coordinates.join(', ')}
            </p>
          </div>
        )}

        {/* 自定义属性 */}
        {fieldTemplates.length > 0 && (
          <div className={editing ? '' : 'bg-gray-50/50 rounded-lg p-2.5 -mx-0.5'}>
            <label className="block text-[10px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">自定义属性</label>
            <div className="space-y-2">
              {[...fieldTemplates].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((field) => (
                <div key={field.id} className="flex items-start gap-2">
                  <span className="text-[11px] text-gray-500 min-w-[3.5rem] pt-1 font-medium">{field.name}</span>
                  <div className="flex-1">
                    {editing ? (
                      field.type === 'select' ? (
                        <select
                          value={String(getCustomFieldValue(field.id) ?? '')}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/80"
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
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/80"
                        />
                      ) : field.type === 'date' ? (
                        <input
                          type="date"
                          value={String(getCustomFieldValue(field.id) ?? '')}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/80"
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(getCustomFieldValue(field.id) ?? '')}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-white/80"
                        />
                      )
                    ) : (
                      <p className="text-xs text-gray-700 bg-white/60 rounded px-2 py-1 border border-gray-100">
                        {String(getCustomFieldValue(field.id) ?? <span className="text-gray-300">—</span>)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="px-3.5 py-2.5 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-gray-100/30 flex items-center gap-2">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-200/50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Save className="w-3.5 h-3.5" aria-hidden="true" />}
              <span>{saving ? '保存中...' : '保存'}</span>
            </button>
            <button
              onClick={() => { setEditData({ ...annotation }); setEditing(false); }}
              disabled={saving}
              className="flex-1 py-2 bg-white text-gray-600 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              取消
            </button>
          </>
        ) : readOnly ? (
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:from-gray-200 hover:to-gray-100 border border-gray-200 transition"
          >
            关闭
          </button>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm shadow-blue-200/50"
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
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1 shadow-sm"
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : null}
                  确认
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-3 py-2 bg-white text-gray-600 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="删除"
                aria-label="删除"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
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
      <div className="space-y-2.5">
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">颜色</label>
          <div className="flex flex-wrap gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onChange({ ...s, color: c.value })}
                className={`w-6 h-6 rounded-full transition-all duration-150 ${
                  s.color === c.value ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'ring-1 ring-gray-200 hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">图标</label>
          <div className="flex flex-wrap gap-1">
            {PRESET_ICONS.map((icon) => (
              <button
                key={icon.value}
                onClick={() => onChange({ ...s, icon: icon.value })}
                className={`px-2 py-0.5 rounded text-[10px] transition-all duration-150 ${
                  s.icon === icon.value ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-700 font-medium' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
                }`}
              >
                {icon.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">大小: {s.size || 2}</label>
          <input
            type="range"
            min={1}
            max={5}
            value={s.size || 2}
            onChange={(e) => onChange({ ...s, size: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>
      </div>
    );
  }

  if (type === 'line') {
    const s = style as LineStyle;
    return (
      <div className="space-y-2.5">
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">颜色</label>
          <div className="flex flex-wrap gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onChange({ ...s, color: c.value })}
                className={`w-6 h-6 rounded-full transition-all duration-150 ${
                  s.color === c.value ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'ring-1 ring-gray-200 hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">线宽: {s.width || 3}</label>
          <input
            type="range"
            min={1}
            max={10}
            value={s.width || 3}
            onChange={(e) => onChange({ ...s, width: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">线型</label>
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ ...s, dashArray: undefined })}
              className={`flex-1 py-1.5 rounded text-[10px] transition-all duration-150 ${
                !s.dashArray ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-700 font-medium' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              实线
            </button>
            <button
              onClick={() => onChange({ ...s, dashArray: '8, 4' })}
              className={`flex-1 py-1.5 rounded text-[10px] transition-all duration-150 ${
                s.dashArray ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-700 font-medium' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
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
    <div className="space-y-2.5">
      <div>
        <label className="block text-[10px] text-gray-500 mb-1">边框颜色</label>
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChange({ ...s, color: c.value })}
              className={`w-6 h-6 rounded-full transition-all duration-150 ${
                s.color === c.value ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'ring-1 ring-gray-200 hover:scale-110'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] text-gray-500 mb-1">填充颜色</label>
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChange({ ...s, fillColor: c.value })}
              className={`w-6 h-6 rounded-full transition-all duration-150 ${
                s.fillColor === c.value ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'ring-1 ring-gray-200 hover:scale-110'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] text-gray-500 mb-1">透明度: {Math.round((s.fillOpacity || 0.3) * 100)}%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((s.fillOpacity || 0.3) * 100)}
          onChange={(e) => onChange({ ...s, fillOpacity: Number(e.target.value) / 100 })}
          className="w-full accent-blue-600"
        />
      </div>
    </div>
  );
}
