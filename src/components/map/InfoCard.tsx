'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Annotation, PointStyle, LineStyle, PolygonStyle, PRESET_COLORS, PRESET_ICONS, FieldTemplate } from '@/lib/types';
import { X, Save, Trash2, Loader2 } from 'lucide-react';

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

  const typeMeta = {
    point: { label: '点', accent: '#c4552b', bg: 'rgba(196,85,43,0.08)' },
    line: { label: '线', accent: '#1a3a3a', bg: 'rgba(26,58,58,0.08)' },
    polygon: { label: '面', accent: '#7c5c3e', bg: 'rgba(124,92,62,0.08)' },
  };
  const tm = typeMeta[annotation.type as keyof typeof typeMeta] || typeMeta.point;

  return (
    <div
      ref={cardRef}
      style={{ ...stylePos }}
      className="w-72 max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl overflow-hidden animate-fade-slide-up"
    >
      {/* 顶部色条 */}
      <div style={{ height: '3px', background: tm.accent }} />

      <div style={{ background: '#faf8f4', border: '1px solid #e3ddd0', borderTop: 'none' }}>
        {/* 标题栏 */}
        <div
          onMouseDown={readOnly ? undefined : handleDragStart}
          className={`flex items-center justify-between px-3 py-2.5 ${readOnly ? '' : 'cursor-move select-none'}`}
          style={{ borderBottom: '1px solid #e3ddd0' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none tracking-wider"
              style={{ background: tm.bg, color: tm.accent }}>
              {tm.label}
            </span>
            <span style={{ color: '#8c8273', fontSize: '10px' }}>
              {new Date(annotation.updated_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <button onClick={onClose} aria-label="关闭"
            className="p-0.5 rounded-lg transition shrink-0"
            style={{ color: '#8c8273' }}>
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-3.5 py-2.5 max-h-[40vh] overflow-y-auto space-y-3 text-sm">
          {/* 名称 */}
          <div>
            <div className="text-[9px] font-semibold mb-1 tracking-widest uppercase" style={{ color: '#8c8273' }}>名称</div>
            {editing ? (
              <input type="text" value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg outline-none transition"
                style={{ background: '#f5f0e8', border: '1px solid #e3ddd0', color: '#2c2416' }}
                onFocus={(e) => { e.target.style.borderColor = '#c4552b'; e.target.style.boxShadow = '0 0 0 3px rgba(196,85,43,0.08)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e3ddd0'; e.target.style.boxShadow = 'none'; }}
                placeholder="输入名称…" />
            ) : (
              <p className="text-sm font-semibold leading-snug" style={{ color: '#2c2416' }}>
                {annotation.name || <span style={{ color: '#bfb4a6' }}>未命名</span>}
              </p>
            )}
          </div>

          {/* 描述 */}
          <div>
            <div className="text-[9px] font-semibold mb-1 tracking-widest uppercase" style={{ color: '#8c8273' }}>描述</div>
            {editing ? (
              <textarea value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg outline-none resize-none transition"
                style={{ background: '#f5f0e8', border: '1px solid #e3ddd0', color: '#2c2416' }}
                onFocus={(e) => { e.target.style.borderColor = '#c4552b'; e.target.style.boxShadow = '0 0 0 3px rgba(196,85,43,0.08)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e3ddd0'; e.target.style.boxShadow = 'none'; }}
                placeholder="输入描述…" />
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: '#5c5242' }}>
                {annotation.description || <span style={{ color: '#bfb4a6' }}>暂无描述</span>}
              </p>
            )}
          </div>

          {/* 编辑模式：样式 */}
          {editing && (
            <div style={{ background: 'rgba(245,240,232,0.6)', borderRadius: '8px', padding: '10px' }}>
              <div className="text-[9px] font-semibold mb-2 tracking-widest uppercase" style={{ color: '#8c8273' }}>样式</div>
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
              <div className="text-[9px] font-semibold mb-1 tracking-widest uppercase" style={{ color: '#8c8273' }}>坐标</div>
              <p className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(245,240,232,0.6)', color: '#5c5242', border: '1px solid rgba(227,221,208,0.5)' }}>
                {(annotation.geometry as { coordinates: [number, number] }).coordinates.join(', ')}
              </p>
            </div>
          )}

          {/* 自定义属性 */}
          {fieldTemplates.length > 0 && (
            <div>
              <div className="text-[9px] font-semibold mb-1.5 tracking-widest uppercase" style={{ color: '#8c8273' }}>自定义属性</div>
              <div className="space-y-1.5">
                {[...fieldTemplates].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((field) => (
                  <div key={field.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(245,240,232,0.4)' }}>
                    <span className="text-[10px] font-medium min-w-[4rem]" style={{ color: '#5c5242' }}>{field.name}</span>
                    <div className="flex-1">
                      {editing ? (
                        field.type === 'select' ? (
                          <select value={String(getCustomFieldValue(field.id) ?? '')}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                            className="w-full px-2 py-1 text-xs rounded-lg outline-none transition"
                            style={{ background: '#f5f0e8', border: '1px solid #e3ddd0', color: '#2c2416' }}>
                            <option value="">未选择</option>
                            {field.options?.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                          </select>
                        ) : (
                          <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            value={String(getCustomFieldValue(field.id) ?? '')}
                            onChange={(e) => handleCustomFieldChange(field.id, field.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : (e.target.value || null))}
                            className="w-full px-2 py-1 text-xs rounded-lg outline-none transition"
                            style={{ background: '#f5f0e8', border: '1px solid #e3ddd0', color: '#2c2416' }}
                            onFocus={(e) => { e.target.style.borderColor = '#c4552b'; e.target.style.boxShadow = '0 0 0 3px rgba(196,85,43,0.08)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e3ddd0'; e.target.style.boxShadow = 'none'; }} />
                        )
                      ) : (
                        <span className="text-xs font-medium" style={{ color: '#2c2416' }}>
                          {String(getCustomFieldValue(field.id) ?? <span style={{ color: '#bfb4a6' }}>—</span>)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div style={{ borderTop: '1px solid #e3ddd0', background: 'rgba(245,240,232,0.5)', padding: '10px 14px' }}
          className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                style={{ background: '#c4552b', color: 'white' }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Save className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{saving ? '保存中...' : '保存'}</span>
              </button>
              <button onClick={() => { setEditData({ ...annotation }); setEditing(false); }} disabled={saving}
                className="flex-1 py-2 text-xs font-medium rounded-lg transition border"
                style={{ background: '#faf8f4', color: '#5c5242', borderColor: '#e3ddd0' }}>
                取消
              </button>
            </>
          ) : readOnly ? (
            <button onClick={onClose}
              className="flex-1 py-2 text-xs font-medium rounded-lg transition border"
              style={{ background: '#f5f0e8', color: '#5c5242', borderColor: '#e3ddd0' }}>
              关闭
            </button>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
                style={{ background: '#c4552b', color: 'white' }}>
                编辑
              </button>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1">
                  <button onClick={async () => { setDeleting(true); await onDelete(annotation.id); setDeleting(false); }}
                    disabled={deleting}
                    className="px-3 py-2 text-xs font-medium rounded-lg transition flex items-center gap-1"
                    style={{ background: '#c4552b', color: 'white' }}>
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : null}
                    确认
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                    className="px-3 py-2 text-xs rounded-lg border transition"
                    style={{ background: '#faf8f4', color: '#5c5242', borderColor: '#e3ddd0' }}>
                    取消
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg transition" aria-label="删除"
                  style={{ color: '#d4954e' }}>
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StyleEditor({ type, style, onChange }: {
  type: string;
  style: PointStyle | LineStyle | PolygonStyle;
  onChange: (style: PointStyle | LineStyle | PolygonStyle) => void;
}) {
  const accentColor = '#c4552b';
  const borderColor = '#e3ddd0';
  const bgLight = 'rgba(245,240,232,0.6)';

  if (type === 'point') {
    const s = style as PointStyle;
    return (
      <div className="space-y-2.5">
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: '#5c5242' }}>颜色</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button key={c.value} onClick={() => onChange({ ...s, color: c.value })}
                className="w-5 h-5 rounded-full transition-all duration-150"
                style={{
                  background: c.value,
                  transform: s.color === c.value ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: s.color === c.value ? `0 0 0 2px white, 0 0 0 4px ${accentColor}` : `0 0 0 1px ${borderColor}`,
                }}
                title={c.name} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: '#5c5242' }}>图标</label>
          <div className="flex flex-wrap gap-1">
            {PRESET_ICONS.map((icon) => (
              <button key={icon.value} onClick={() => onChange({ ...s, icon: icon.value })}
                className="px-2 py-0.5 rounded text-[10px] transition-all duration-150"
                style={{
                  background: s.icon === icon.value ? accentColor : bgLight,
                  color: s.icon === icon.value ? 'white' : '#5c5242',
                  border: `1px solid ${s.icon === icon.value ? accentColor : borderColor}`,
                }}>
                {icon.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: '#5c5242' }}>大小: {s.size || 2}</label>
          <input type="range" min={1} max={5} value={s.size || 2}
            onChange={(e) => onChange({ ...s, size: Number(e.target.value) })}
            className="w-full" style={{ accentColor }} />
        </div>
      </div>
    );
  }

  if (type === 'line') {
    const s = style as LineStyle;
    return (
      <div className="space-y-2.5">
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: '#5c5242' }}>颜色</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button key={c.value} onClick={() => onChange({ ...s, color: c.value })}
                className="w-5 h-5 rounded-full transition-all duration-150"
                style={{
                  background: c.value,
                  transform: s.color === c.value ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: s.color === c.value ? `0 0 0 2px white, 0 0 0 4px ${accentColor}` : `0 0 0 1px ${borderColor}`,
                }}
                title={c.name} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: '#5c5242' }}>线宽: {s.width || 3}</label>
          <input type="range" min={1} max={10} value={s.width || 3}
            onChange={(e) => onChange({ ...s, width: Number(e.target.value) })}
            className="w-full" style={{ accentColor }} />
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: '#5c5242' }}>线型</label>
          <div className="flex gap-2">
            <button onClick={() => onChange({ ...s, dashArray: undefined })}
              className="flex-1 py-1.5 rounded text-[10px] transition-all duration-150"
              style={{
                background: !s.dashArray ? accentColor : bgLight,
                color: !s.dashArray ? 'white' : '#5c5242',
                border: `1px solid ${!s.dashArray ? accentColor : borderColor}`,
              }}>
              实线
            </button>
            <button onClick={() => onChange({ ...s, dashArray: '8, 4' })}
              className="flex-1 py-1.5 rounded text-[10px] transition-all duration-150"
              style={{
                background: s.dashArray ? accentColor : bgLight,
                color: s.dashArray ? 'white' : '#5c5242',
                border: `1px solid ${s.dashArray ? accentColor : borderColor}`,
              }}>
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
        <label className="block text-[10px] font-medium mb-1" style={{ color: '#5c5242' }}>边框颜色</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button key={c.value} onClick={() => onChange({ ...s, color: c.value })}
              className="w-5 h-5 rounded-full transition-all duration-150"
              style={{
                background: c.value,
                transform: s.color === c.value ? 'scale(1.2)' : 'scale(1)',
                boxShadow: s.color === c.value ? `0 0 0 2px white, 0 0 0 4px ${accentColor}` : `0 0 0 1px ${borderColor}`,
              }}
              title={c.name} />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-medium mb-1" style={{ color: '#5c5242' }}>填充颜色</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button key={c.value} onClick={() => onChange({ ...s, fillColor: c.value })}
              className="w-5 h-5 rounded-full transition-all duration-150"
              style={{
                background: c.value,
                transform: s.fillColor === c.value ? 'scale(1.2)' : 'scale(1)',
                boxShadow: s.fillColor === c.value ? `0 0 0 2px white, 0 0 0 4px ${accentColor}` : `0 0 0 1px ${borderColor}`,
              }}
              title={c.name} />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-medium mb-1" style={{ color: '#5c5242' }}>透明度: {Math.round((s.fillOpacity || 0.3) * 100)}%</label>
        <input type="range" min={0} max={100} value={Math.round((s.fillOpacity || 0.3) * 100)}
          onChange={(e) => onChange({ ...s, fillOpacity: Number(e.target.value) / 100 })}
          className="w-full" style={{ accentColor }} />
      </div>
    </div>
  );
}
