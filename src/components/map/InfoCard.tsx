/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Annotation, PointStyle, LineStyle, PolygonStyle, PRESET_COLORS, PRESET_ICONS, FieldTemplate } from '@/lib/types';
import { X, Save, Trash2, Loader2, Upload, Link2, Plus } from 'lucide-react';
import { uploadAnnotationImage, deleteAnnotationImage } from '@/lib/supabase';

// Premium blue palette
const colors = {
  surface: '#ffffff',
  bg: '#f8fafc',
  border: '#e2e8f0',
  ink: '#1e293b',
  muted: '#64748b',
  faint: '#94a3b8',
  placeholder: '#cbd5e1',
  accent: '#2563eb',
  accentSoft: 'rgba(37,99,235,0.08)',
  danger: '#ef4444',
};

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
    point: { label: '点', accent: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
    line: { label: '线', accent: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
    polygon: { label: '面', accent: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  };
  const tm = typeMeta[annotation.type as keyof typeof typeMeta] || typeMeta.point;

  return (
    <div ref={cardRef} style={{ ...stylePos }}
      className="w-72 max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl overflow-hidden animate-fade-slide-up">
      <div style={{ height: '3px', background: tm.accent }} />
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderTop: 'none' }}>

        {/* 标题栏 */}
        <div onMouseDown={handleDragStart}
          className={`flex items-center justify-between px-3 py-2.5 select-none ${editing ? '' : 'cursor-move'}`}
          style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none tracking-wider"
              style={{ background: tm.bg, color: tm.accent }}>{tm.label}</span>
            <span style={{ color: colors.faint, fontSize: '10px' }}>
              {new Date(annotation.updated_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <button onClick={onClose} aria-label="关闭"
            className="p-0.5 rounded-lg transition shrink-0" style={{ color: colors.faint }}>
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-3.5 py-2.5 max-h-[50vh] overflow-y-auto space-y-3 text-sm">
          {annotation.type === 'polygon' ? (
            <PolygonFields
              data={editing ? editData : annotation}
              editing={editing}
              onChange={(data) => setEditData(data)}
            />
          ) : annotation.type === 'line' ? (
            <LineFields
              data={editing ? editData : annotation}
              editing={editing}
              onChange={(data) => setEditData(data)}
            />
          ) : (
            <>
              <Field label="名称">
                {editing ? (
                  <Input value={editData.name} onChange={(v) => setEditData({ ...editData, name: v })} placeholder="输入名称…" />
                ) : (
                  <p className="text-sm font-semibold leading-snug" style={{ color: colors.ink }}>
                    {annotation.name || <span style={{ color: colors.placeholder }}>未命名</span>}
                  </p>
                )}
              </Field>
              <Field label="描述">
                {editing ? (
                  <textarea value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={2} className="w-full px-2.5 py-1.5 text-sm rounded-lg outline-none resize-none transition"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }}
                    onFocus={focusStyle} onBlur={blurStyle} placeholder="输入描述…" />
                ) : (
                  <p className="text-xs leading-relaxed" style={{ color: colors.muted }}>
                    {annotation.description || <span style={{ color: colors.placeholder }}>暂无描述</span>}
                  </p>
                )}
              </Field>
              {editing && (
                <div style={{ background: colors.bg, borderRadius: '8px', padding: '10px' }}>
                  <div className="text-[9px] font-semibold mb-2 tracking-widest uppercase" style={{ color: colors.muted }}>样式</div>
                  <StyleEditor type={annotation.type} style={editData.style}
                    onChange={(style) => setEditData({ ...editData, style })} />
                </div>
              )}
              {!editing && (
                <Field label="坐标">
                  <p className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg"
                    style={{ background: colors.bg, color: colors.muted, border: `1px solid ${colors.border}` }}>
                    {(annotation.geometry as { coordinates: [number, number] }).coordinates.join(', ')}
                  </p>
                </Field>
              )}
              {fieldTemplates.length > 0 && (
                <div>
                  <div className="text-[9px] font-semibold mb-1.5 tracking-widest uppercase" style={{ color: colors.muted }}>自定义属性</div>
                  <div className="space-y-1.5">
                    {[...fieldTemplates].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((field) => (
                      <div key={field.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: colors.bg }}>
                        <span className="text-[10px] font-medium min-w-[4rem]" style={{ color: colors.muted }}>{field.name}</span>
                        <div className="flex-1">
                          {editing ? (
                            field.type === 'select' ? (
                              <select value={String(getCustomFieldValue(field.id) ?? '')}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                                className="w-full px-2 py-1 text-xs rounded-lg outline-none transition"
                                style={{ background: '#ffffff', border: `1px solid ${colors.border}`, color: colors.ink }}>
                                <option value="">未选择</option>
                                {field.options?.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                              </select>
                            ) : (
                              <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                value={String(getCustomFieldValue(field.id) ?? '')}
                                onChange={(e) => handleCustomFieldChange(field.id, field.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : (e.target.value || null))}
                                className="w-full px-2 py-1 text-xs rounded-lg outline-none transition"
                                style={{ background: '#ffffff', border: `1px solid ${colors.border}`, color: colors.ink }}
                                onFocus={focusStyle} onBlur={blurStyle} />
                            )
                          ) : (
                            <span className="text-xs font-medium" style={{ color: colors.ink }}>
                              {String(getCustomFieldValue(field.id) ?? <span style={{ color: colors.placeholder }}>—</span>)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部操作栏 */}
        <div style={{ borderTop: `1px solid ${colors.border}`, background: 'rgba(248,250,252,0.8)', padding: '10px 14px' }}
          className="flex items-center gap-2">
          {editing ? (
            <>
              <ActionBtn onClick={handleSave} disabled={saving} accent={colors.accent}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Save className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{saving ? '保存中...' : '保存'}</span>
              </ActionBtn>
              <button onClick={() => { setEditData({ ...annotation }); setEditing(false); }} disabled={saving}
                className="flex-1 py-2 text-xs font-medium rounded-lg transition border"
                style={{ background: colors.surface, color: colors.muted, borderColor: colors.border }}>
                取消
              </button>
            </>
          ) : readOnly ? (
            <button onClick={onClose}
              className="flex-1 py-2 text-xs font-medium rounded-lg transition border"
              style={{ background: colors.bg, color: colors.muted, borderColor: colors.border }}>
              关闭
            </button>
          ) : (
            <>
              <ActionBtn onClick={() => setEditing(true)} accent={colors.accent}>编辑</ActionBtn>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1">
                  <ActionBtn onClick={async () => { setDeleting(true); await onDelete(annotation.id); setDeleting(false); }}
                    disabled={deleting} accent={colors.danger}>
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : null}
                    确认
                  </ActionBtn>
                  <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                    className="px-3 py-2 text-xs rounded-lg border transition"
                    style={{ background: colors.surface, color: colors.muted, borderColor: colors.border }}>
                    取消
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg transition" aria-label="删除" style={{ color: colors.faint }}>
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

// 子组件
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-semibold mb-1 tracking-widest uppercase" style={{ color: '#94a3b8' }}>{label}</div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-2.5 py-1.5 text-sm rounded-lg outline-none transition"
      style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b' }}
      onFocus={focusStyle} onBlur={blurStyle} placeholder={placeholder} />
  );
}

function ActionBtn({ children, onClick, disabled, accent }: any) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
      style={{ background: accent, color: 'white' }}>
      {children}
    </button>
  );
}

function focusStyle(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget as HTMLElement;
  el.style.borderColor = '#2563eb';
  el.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
}
function blurStyle(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget as HTMLElement;
  el.style.borderColor = '#e2e8f0';
  el.style.boxShadow = 'none';
}

function StyleEditor({ type, style, onChange }: {
  type: string; style: PointStyle | LineStyle | PolygonStyle;
  onChange: (s: any) => void;
}) {
  const c = { accent: '#2563eb', border: '#e2e8f0', bg: '#f8fafc', muted: '#64748b' };

  if (type === 'point') {
    const s = style as PointStyle;
    return (
      <div className="space-y-2.5">
        <Sect label="颜色" color={c.muted}>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((col) => (
              <button key={col.value} onClick={() => onChange({ ...s, color: col.value })}
                className="w-5 h-5 rounded-full transition-all duration-150" title={col.name}
                style={{
                  background: col.value,
                  transform: s.color === col.value ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: s.color === col.value ? `0 0 0 2px white, 0 0 0 4px ${c.accent}` : `0 0 0 1px ${c.border}`,
                }} />
            ))}
          </div>
        </Sect>
        <Sect label="图标" color={c.muted}>
          <div className="flex flex-wrap gap-1">
            {PRESET_ICONS.map((icon) => (
              <button key={icon.value} onClick={() => onChange({ ...s, icon: icon.value })}
                className="px-2 py-0.5 rounded text-[10px] transition-all duration-150"
                style={{
                  background: s.icon === icon.value ? c.accent : c.bg,
                  color: s.icon === icon.value ? 'white' : c.muted,
                  border: `1px solid ${s.icon === icon.value ? c.accent : c.border}`,
                }}>{icon.name}</button>
            ))}
          </div>
        </Sect>
        <Sect label={'大小: ' + (s.size || 2)} color={c.muted}>
          <input type="range" min={1} max={5} value={s.size || 2}
            onChange={(e) => onChange({ ...s, size: Number(e.target.value) })}
            className="w-full" style={{ accentColor: c.accent }} />
        </Sect>
      </div>
    );
  }

  if (type === 'line') {
    const s = style as LineStyle;
    return (
      <div className="space-y-2.5">
        <Sect label="颜色" color={c.muted}>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((col) => (
              <button key={col.value} onClick={() => onChange({ ...s, color: col.value })}
                className="w-5 h-5 rounded-full transition-all duration-150" title={col.name}
                style={{
                  background: col.value,
                  transform: s.color === col.value ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: s.color === col.value ? `0 0 0 2px white, 0 0 0 4px ${c.accent}` : `0 0 0 1px ${c.border}`,
                }} />
            ))}
          </div>
        </Sect>
        <Sect label={'线宽: ' + (s.width || 3)} color={c.muted}>
          <input type="range" min={1} max={10} value={s.width || 3}
            onChange={(e) => onChange({ ...s, width: Number(e.target.value) })}
            className="w-full" style={{ accentColor: c.accent }} />
        </Sect>
        <Sect label="线型" color={c.muted}>
          <div className="flex gap-2">
            {[
              { label: '实线', active: !s.dashArray },
              { label: '虚线', active: !!s.dashArray },
            ].map((item) => (
              <button key={item.label}
                onClick={() => onChange({ ...s, dashArray: item.label === '虚线' ? '8, 4' : undefined })}
                className="flex-1 py-1.5 rounded text-[10px] transition-all duration-150"
                style={{
                  background: item.active ? c.accent : c.bg,
                  color: item.active ? 'white' : c.muted,
                  border: `1px solid ${item.active ? c.accent : c.border}`,
                }}>{item.label}</button>
            ))}
          </div>
        </Sect>
      </div>
    );
  }

  const s = style as PolygonStyle;
  return (
    <div className="space-y-2.5">
      <Sect label="边框颜色" color={c.muted}>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((col) => (
            <button key={col.value} onClick={() => onChange({ ...s, color: col.value })}
              className="w-5 h-5 rounded-full transition-all duration-150" title={col.name}
              style={{
                background: col.value,
                transform: s.color === col.value ? 'scale(1.2)' : 'scale(1)',
                boxShadow: s.color === col.value ? `0 0 0 2px white, 0 0 0 4px ${c.accent}` : `0 0 0 1px ${c.border}`,
              }} />
          ))}
        </div>
      </Sect>
      <Sect label="填充颜色" color={c.muted}>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((col) => (
            <button key={col.value} onClick={() => onChange({ ...s, fillColor: col.value })}
              className="w-5 h-5 rounded-full transition-all duration-150" title={col.name}
              style={{
                background: col.value,
                transform: s.fillColor === col.value ? 'scale(1.2)' : 'scale(1)',
                boxShadow: s.fillColor === col.value ? `0 0 0 2px white, 0 0 0 4px ${c.accent}` : `0 0 0 1px ${c.border}`,
              }} />
          ))}
        </div>
      </Sect>
      <Sect label={'透明度: ' + Math.round((s.fillOpacity || 0.3) * 100) + '%'} color={c.muted}>
        <input type="range" min={0} max={100} value={Math.round((s.fillOpacity || 0.3) * 100)}
          onChange={(e) => onChange({ ...s, fillOpacity: Number(e.target.value) / 100 })}
          className="w-full" style={{ accentColor: c.accent }} />
      </Sect>
    </div>
  );
}

function Sect({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-medium mb-1" style={{ color }}>{label}</label>
      {children}
    </div>
  );
}

// ==== 面标注专用字段 ====
type CFKey = string;
function getCF(customFields: { fieldId: string; value: string | number | null }[], key: CFKey): string {
  const f = customFields.find((c) => c.fieldId === key);
  return f ? String(f.value ?? '') : '';
}
function setCF(customFields: { fieldId: string; value: string | number | null }[], key: CFKey, value: string): { fieldId: string; value: string | number | null }[] {
  const idx = customFields.findIndex((c) => c.fieldId === key);
  if (idx >= 0) {
    const updated = [...customFields];
    updated[idx] = { ...updated[idx], value };
    return updated;
  }
  return [...customFields, { fieldId: key, value }];
}
function getCFArr(customFields: { fieldId: string; value: string | number | null }[], key: CFKey): string[] {
  const f = customFields.find((c) => c.fieldId === key);
  if (!f || !f.value) return [];
  try { return JSON.parse(String(f.value)); } catch { return []; }
}
function setCFArr(customFields: { fieldId: string; value: string | number | null }[], key: CFKey, arr: any[]): { fieldId: string; value: string | number | null }[] {
  return setCF(customFields, key, JSON.stringify(arr));
}

function PolygonFields({ data, editing, onChange }: { data: any; editing: boolean; onChange: (d: any) => void }) {
  const [uploading, setUploading] = useState(false);

  const cf = data.custom_fields || [];
  const images = editing ? getCFArr((data as any).custom_fields || [], 'images') : getCFArr(data.custom_fields || [], 'images');
  const links = editing ? (() => { try { return JSON.parse(getCF((data as any).custom_fields || [], 'links') || '[]'); } catch { return []; } })() : (() => { try { return JSON.parse(getCF(data.custom_fields || [], 'links') || '[]'); } catch { return []; } })();

  const updateName = (v: string) => onChange({ ...data, name: v });
  const updateCF = (key: CFKey, v: string) => onChange({ ...data, custom_fields: setCF((data).custom_fields || [], key, v) });
  const updateCFArr = (key: CFKey, arr: any[]) => onChange({ ...data, custom_fields: setCFArr((data).custom_fields || [], key, arr) });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const current = getCFArr((data).custom_fields || [], 'images');
    const newUrls = [...current];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadAnnotationImage(files[i]);
      if (url) newUrls.push(url);
    }
    updateCFArr('images', newUrls);
    setUploading(false);
  };

  const removeImage = async (url: string) => {
    await deleteAnnotationImage(url);
    const current = getCFArr((data).custom_fields || [], 'images');
    updateCFArr('images', current.filter((u) => u !== url));
  };

  const addLink = () => {
    const current = (() => { try { return JSON.parse(getCF((data).custom_fields || [], 'links') || '[]'); } catch { return []; } })();
    updateCFArr('links', [...current, { title: '', url: '' }]);
  };
  const updateLink = (idx: number, field: 'title' | 'url', val: string) => {
    const current = (() => { try { return JSON.parse(getCF((data).custom_fields || [], 'links') || '[]'); } catch { return []; } })();
    current[idx] = { ...current[idx], [field]: val };
    updateCFArr('links', current);
  };
  const removeLink = (idx: number) => {
    const current = (() => { try { return JSON.parse(getCF((data).custom_fields || [], 'links') || '[]'); } catch { return []; } })();
    updateCFArr('links', current.filter((_: any, i: number) => i !== idx));
  };

  return (
    <>
      {/* 项目名称 */}
      <Field label="项目名称">
        {editing ? (
          <Input value={data.name} onChange={updateName} placeholder="输入项目名称…" />
        ) : (
          <p className="text-sm font-semibold leading-snug" style={{ color: colors.ink }}>
            {data.name || <span style={{ color: colors.placeholder }}>未命名</span>}
          </p>
        )}
      </Field>

      {/* 产品 / 价格 / 户型 */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="产品">
          {editing ? (
            <Input value={getCF(cf, 'product')} onChange={(v) => updateCF('product', v)} placeholder="如：住宅" />
          ) : (
            <span className="text-xs" style={{ color: getCF(data.custom_fields || [], 'product') ? colors.ink : colors.placeholder }}>
              {getCF(data.custom_fields || [], 'product') || '—'}
            </span>
          )}
        </Field>
        <Field label="价格">
          {editing ? (
            <Input value={getCF(cf, 'price')} onChange={(v) => updateCF('price', v)} placeholder="如：2.5万/㎡" />
          ) : (
            <span className="text-xs" style={{ color: getCF(data.custom_fields || [], 'price') ? colors.ink : colors.placeholder }}>
              {getCF(data.custom_fields || [], 'price') || '—'}
            </span>
          )}
        </Field>
      </div>

      <Field label="户型">
        {(editing ? (() => {
          const h = (() => { try { return JSON.parse(getCF(cf, 'houseType') || '[]'); } catch { return []; } })();
          const arr = Array.isArray(h) && h.length > 0 ? h : [''];
          return (
            <div className="space-y-1.5">
              {arr.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input value={item}
                    onChange={(e) => {
                      const updated = [...arr];
                      updated[i] = e.target.value;
                      updateCF('houseType', JSON.stringify(updated));
                    }}
                    placeholder="如：三室两厅 120㎡"
                    className="flex-1 px-2 py-1 text-xs rounded-lg outline-none transition"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }}
                    onFocus={focusStyle} onBlur={blurStyle} />
                  {arr.length > 1 && (
                    <button onClick={() => updateCF('houseType', JSON.stringify(arr.filter((_: any, j: number) => j !== i)))}
                      className="text-[10px] px-1 shrink-0" style={{ color: colors.danger }}>×</button>
                  )}
                </div>
              ))}
              <button onClick={() => updateCF('houseType', JSON.stringify([...arr, '']))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition"
                style={{ background: colors.bg, border: `1px dashed ${colors.border}`, color: colors.muted }}>
                <Plus className="w-3 h-3" aria-hidden="true" /> 添加户型
              </button>
            </div>
          );
        })() : (() => {
          const h = (() => { try { return JSON.parse(getCF(data.custom_fields || [], 'houseType') || '[]'); } catch { return []; } })();
          const arr = Array.isArray(h) ? h : (h ? [h] : []);
          return arr.length > 0 ? (
            <div className="space-y-0.5">
              {arr.map((item: string, i: number) => (
                <span key={i} className="block text-xs" style={{ color: colors.ink }}>{item || '—'}</span>
              ))}
            </div>
          ) : (
            <span className="text-xs" style={{ color: colors.placeholder }}>—</span>
          );
        })())}
      </Field>

      {/* 备注 */}
      <Field label="备注">
        {editing ? (
          <textarea value={getCF(cf, 'notes')}
            onChange={(e) => updateCF('notes', e.target.value)}
            rows={2} className="w-full px-2.5 py-1.5 text-xs rounded-lg outline-none resize-none transition"
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }}
            onFocus={focusStyle} onBlur={blurStyle} placeholder="补充说明…" />
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: getCF(data.custom_fields || [], 'notes') ? colors.muted : colors.placeholder }}>
            {getCF(data.custom_fields || [], 'notes') || '—'}
          </p>
        )}
      </Field>

      {/* 图片 */}
      <Field label="图片">
        {editing && (
          <label className="flex items-center gap-2 px-2.5 py-2 mb-2 rounded-lg cursor-pointer transition text-xs"
            style={{ background: colors.bg, border: `1px dashed ${colors.border}`, color: colors.muted }}>
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            {uploading ? '上传中...' : '上传图片'}
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
          </label>
        )}
        {images.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {images.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg" style={{ border: `1px solid ${colors.border}` }} />
                {editing && (
                  <button onClick={() => removeImage(url)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] transition"
                    style={{ background: colors.danger, color: 'white' }}>×</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          !editing && <span className="text-xs" style={{ color: colors.placeholder }}>暂无图片</span>
        )}
      </Field>

      {/* 链接 */}
      <Field label="链接">
        {editing && (
          <button onClick={addLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition mb-2"
            style={{ background: colors.bg, border: `1px dashed ${colors.border}`, color: colors.muted }}>
            <Plus className="w-3 h-3" aria-hidden="true" /> 添加链接
          </button>
        )}
        {links.length > 0 ? (
          <div className="space-y-1.5">
            {links.map((link: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5">
                {(editing && !link.url) ? (
                  <>
                    <input value={link.title || ''} placeholder="标题"
                      onChange={(e) => updateLink(i, 'title', e.target.value)}
                      className="flex-1 px-2 py-1 text-[11px] rounded outline-none"
                      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }} />
                    <input value={link.url || ''} placeholder="https://..."
                      onChange={(e) => updateLink(i, 'url', e.target.value)}
                      className="flex-1 px-2 py-1 text-[11px] rounded outline-none"
                      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.accent }} />
                    <button onClick={() => removeLink(i)} className="text-[10px] px-1" style={{ color: colors.danger }}>×</button>
                  </>
                ) : (
                  <a href={link.url || '#'} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs hover:underline truncate" style={{ color: colors.accent }}>
                    <Link2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{link.title || link.url || '查看链接'}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          !editing && <span className="text-xs" style={{ color: colors.placeholder }}>暂无链接</span>
        )}
      </Field>

      {/* 样式编辑 */}
      {editing && (
        <div style={{ background: colors.bg, borderRadius: '8px', padding: '10px' }}>
          <div className="text-[9px] font-semibold mb-2 tracking-widest uppercase" style={{ color: colors.muted }}>样式</div>
          <StyleEditor type="polygon" style={data.style}
            onChange={(style: any) => onChange({ ...data, style })} />
        </div>
      )}
    </>
  );
}

// ==== 线标注专用字段 ====
function LineFields({ data, editing, onChange }: { data: any; editing: boolean; onChange: (d: any) => void }) {
  const cf = (data).custom_fields || [];
  const updateCF = (key: CFKey, v: string) => onChange({ ...data, custom_fields: setCF(cf, key, v) });

  return (
    <>
      <Field label="名称">
        {editing ? (
          <Input value={data.name} onChange={(v) => onChange({ ...data, name: v })} placeholder="输入名称…" />
        ) : (
          <p className="text-sm font-semibold leading-snug" style={{ color: colors.ink }}>
            {data.name || <span style={{ color: colors.placeholder }}>未命名</span>}
          </p>
        )}
      </Field>

      <Field label="备注">
        {editing ? (
          <textarea value={getCF(cf, 'notes')}
            onChange={(e) => updateCF('notes', e.target.value)}
            rows={2} className="w-full px-2.5 py-1.5 text-xs rounded-lg outline-none resize-none transition"
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }}
            onFocus={focusStyle} onBlur={blurStyle} placeholder="补充说明…" />
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: getCF(data.custom_fields || [], 'notes') ? colors.muted : colors.placeholder }}>
            {getCF(data.custom_fields || [], 'notes') || '—'}
          </p>
        )}
      </Field>

      {editing && (
        <div style={{ background: colors.bg, borderRadius: '8px', padding: '10px' }}>
          <div className="text-[9px] font-semibold mb-2 tracking-widest uppercase" style={{ color: colors.muted }}>样式</div>
          <StyleEditor type="line" style={data.style}
            onChange={(style: any) => onChange({ ...data, style })} />
        </div>
      )}
    </>
  );
}
