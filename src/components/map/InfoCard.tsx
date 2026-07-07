/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Annotation, PointStyle, LineStyle, PolygonStyle, TextStyle, PRESET_COLORS, PRESET_ICONS, FieldTemplate } from '@/lib/types';
import { X, Save, Trash2, Loader2, Upload, Link2, Plus } from 'lucide-react';
import { uploadAnnotationImage, deleteAnnotationImage, validateAnnotationImage } from '@/lib/supabase';

const colors = {
  surface: '#ffffff',
  bg: '#f4f5f1',
  border: 'rgba(22,24,22,0.1)',
  ink: '#161816',
  muted: '#5c615c',
  faint: '#868a84',
  placeholder: '#a0a49e',
  accent: '#0b4f45',
  accentSoft: 'rgba(11,79,69,0.08)',
  danger: '#b95749',
};

function sanitizeExternalUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

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
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    setEditData({ ...annotation });
    setEditing(false);
    setShowDeleteConfirm(false);
  }, [annotation]);

  useEffect(() => {
    if (!readOnly) {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [annotation.id, readOnly]);

  useEffect(() => {
    if (!readOnly) return;

    const handlePointerMove = (event: MouseEvent) => {
      if (!dragStateRef.current) return;
      const nextX = dragStateRef.current.baseX + (event.clientX - dragStateRef.current.startX);
      const nextY = dragStateRef.current.baseY + (event.clientY - dragStateRef.current.startY);
      setDragOffset({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [readOnly]);

  const handleDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!readOnly) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, option')) return;

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: dragOffset.x,
      baseY: dragOffset.y,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await onSave(editData);
      if (saved) {
        setEditing(false);
      }
    } catch {
      // 保持编辑态，允许用户继续修改或重试
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

  const typeMeta = {
    point: { label: '点', accent: '#1a4735', bg: 'rgba(26,71,53,0.08)' },
    line: { label: '线', accent: '#2c6fbb', bg: 'rgba(44,111,187,0.08)' },
    polygon: { label: '面', accent: '#cfb08a', bg: 'rgba(207,176,138,0.16)' },
    text: { label: '文字', accent: '#d4954e', bg: 'rgba(212,148,78,0.08)' },
  };
  const tm = typeMeta[annotation.type as keyof typeof typeMeta] || typeMeta.point;
  const pointCoordinates = annotation.type === 'point'
    ? (annotation.geometry as { coordinates: [number, number] }).coordinates
    : null;
  const pointFieldEntries = fieldTemplates
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((field) => ({
      ...field,
      displayValue: getCustomFieldDisplayValue(getCustomFieldValue(field.id)),
    }))
    .filter((field) => field.displayValue);

  return (
    <div
      className="w-[284px] max-w-[calc(100vw-2rem)] overflow-hidden animate-fade-slide-up"
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, boxShadow: '0 8px 18px rgba(17,24,22,0.08)' }}>

        {/* 标题栏 */}
        <div
          className="flex items-center justify-between px-3 py-1.5 select-none"
          style={{ borderBottom: `1px solid ${colors.border}`, cursor: readOnly ? 'move' : 'default' }}
          onMouseDown={handleDragStart}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 text-[8px] font-semibold leading-none tracking-[0.16em] uppercase"
              style={{ background: tm.bg, color: tm.accent }}>{tm.label}</span>
            <div className="min-w-0">
              <div className="truncate text-[10px] font-semibold" style={{ color: colors.ink }}>
                {annotation.name || '未命名'}
              </div>
              <span style={{ color: colors.faint, fontSize: '8px', letterSpacing: '0.08em' }}>
                {new Date(annotation.updated_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
          <button onClick={onClose} aria-label="关闭"
            className="shrink-0 flex h-6 w-6 items-center justify-center p-0 transition"
            style={{
              color: colors.faint,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.72)',
            }}>
            <X className="h-2.5 w-2.5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        {/* 内容 */}
          <div className="max-h-[calc(100vh-180px)] space-y-1.5 overflow-y-auto px-3 py-2 text-sm">
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
              {editing ? (
                <>
                  <Field label="名称">
                    <Input value={editData.name} onChange={(v) => setEditData({ ...editData, name: v })} placeholder="输入名称…" />
                  </Field>
                  <Field label="描述">
                    <textarea value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={2} className="w-full resize-none px-2.5 py-2 text-sm outline-none transition"
                      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }}
                      onFocus={focusStyle} onBlur={blurStyle} placeholder="输入描述…" />
                  </Field>
                </>
              ) : (
                <PointOverview
                  name={annotation.name}
                  description={annotation.description}
                  coordinates={pointCoordinates}
                  fieldEntries={pointFieldEntries}
                />
              )}
              {editing && (
                <div style={{ background: colors.bg, padding: '10px', border: `1px solid ${colors.border}` }}>
                  <div className="text-[9px] font-semibold mb-2 tracking-widest uppercase" style={{ color: colors.muted }}>样式</div>
                  <StyleEditor type={annotation.type} style={editData.style}
                    onChange={(style) => setEditData({ ...editData, style })} />
                </div>
              )}
              {editing && fieldTemplates.length > 0 && (
                <div>
                  <div className="text-[9px] font-semibold mb-1.5 tracking-widest uppercase" style={{ color: colors.muted }}>自定义属性</div>
                  <div className="space-y-1.5">
                    {[...fieldTemplates].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((field) => (
                      <div key={field.id} className="flex items-center gap-2 border px-2.5 py-1.5" style={{ background: colors.bg, borderColor: colors.border }}>
                        <span className="text-[10px] font-medium min-w-[4rem]" style={{ color: colors.muted }}>{field.name}</span>
                        <div className="flex-1">
                          {editing ? (
                            field.type === 'select' ? (
                              <select value={String(getCustomFieldValue(field.id) ?? '')}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value || null)}
                                className="w-full px-2 py-1 text-xs outline-none transition"
                                style={{ background: '#ffffff', border: `1px solid ${colors.border}`, color: colors.ink }}>
                                <option value="">未选择</option>
                                {field.options?.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                              </select>
                            ) : (
                              <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                value={String(getCustomFieldValue(field.id) ?? '')}
                                onChange={(e) => handleCustomFieldChange(field.id, field.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : (e.target.value || null))}
                                className="w-full px-2 py-1 text-xs outline-none transition"
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
        <div style={{ borderTop: `1px solid ${colors.border}`, background: colors.bg, padding: '8px 10px' }}
          className="flex items-center gap-2">
          {editing ? (
            <>
              <ActionBtn onClick={handleSave} disabled={saving} accent={colors.accent}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Save className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{saving ? '保存中...' : '保存'}</span>
              </ActionBtn>
              <button onClick={() => { setEditData({ ...annotation }); setEditing(false); }} disabled={saving}
                className="flex-1 border py-2 text-xs font-medium transition"
                style={{ background: colors.surface, color: colors.muted, borderColor: colors.border }}>
                取消
              </button>
            </>
          ) : readOnly ? (
            <button onClick={onClose}
                className="flex-1 border py-2 text-xs font-medium transition"
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
                    className="border px-3 py-2 text-xs transition"
                    style={{ background: colors.surface, color: colors.muted, borderColor: colors.border }}>
                    取消
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="h-8 w-8 p-0 transition" aria-label="删除" style={{ color: colors.faint, background: '#fff', border: `1px solid ${colors.border}` }}>
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
      <div className="mb-1 text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: colors.faint }}>{label}</div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-2.5 py-2 text-sm outline-none transition"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }}
      onFocus={focusStyle} onBlur={blurStyle} placeholder={placeholder} />
  );
}

function ActionBtn({ children, onClick, disabled, accent }: any) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-1 items-center justify-center gap-1.5 border py-2 text-xs font-semibold transition-all"
      style={{ background: accent, color: 'white', borderColor: accent }}>
      {children}
    </button>
  );
}

function PointOverview({
  name,
  description,
  coordinates,
  fieldEntries,
}: {
  name: string;
  description: string;
  coordinates: [number, number] | null;
  fieldEntries: Array<{ id: string; name: string; displayValue: string }>;
}) {
  const [heroField, ...remainingFields] = fieldEntries;
  const compactMetrics = remainingFields.slice(0, 2);
  const details = remainingFields.slice(2);
  const descriptionLooksLong = (description || '').length > 28;

  return (
    <div className="space-y-2">
      <section className="border" style={{ background: colors.surface, borderColor: colors.border }}>
        <div className="px-2.5 py-2" style={{ background: colors.bg }}>
          <div className="text-[8px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.faint }}>
            Point Record
          </div>
          <div className="mt-1 text-[14px] font-semibold leading-[1.18]" style={{ color: colors.ink }}>
            {name || '未命名'}
          </div>
          <div
            className="mt-1.5 border-t pt-1.5 text-[10px] leading-4.5"
            style={{
              borderColor: colors.border,
              color: description ? colors.muted : colors.placeholder,
              maxWidth: descriptionLooksLong ? '100%' : '26ch',
            }}
          >
            {description || '暂无描述'}
          </div>
        </div>

        {(heroField || compactMetrics.length > 0) && (
          <div className="grid gap-px border-t" style={{ borderColor: colors.border, background: colors.border, gridTemplateColumns: heroField ? 'minmax(0,1.2fr) minmax(0,0.8fr)' : '1fr' }}>
            {heroField && (
              <div className="min-h-[70px] px-2.5 py-2" style={{ background: colors.surface }}>
                <div className="text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: colors.faint }}>
                  {heroField.name}
                </div>
                <div className="mt-1.5 break-words text-[14px] font-semibold leading-[1.18]" style={{ color: colors.ink }}>
                  {heroField.displayValue}
                </div>
              </div>
            )}

            {compactMetrics.length > 0 && (
              <div className="grid gap-px" style={{ background: colors.border }}>
                {compactMetrics.map((field) => (
                  <div key={field.id} className="px-2.5 py-1.5" style={{ background: colors.bg }}>
                    <div className="text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: colors.faint }}>
                      {field.name}
                    </div>
                    <div className="mt-0.5 break-words text-[12px] font-semibold leading-[1.2]" style={{ color: colors.ink }}>
                      {field.displayValue}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {coordinates && (
        <section className="border px-2.5 py-2" style={{ background: colors.surface, borderColor: colors.border }}>
          <div className="text-[8px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.faint }}>
            Coordinates
          </div>
          <div className="mt-2 grid grid-cols-2 gap-px" style={{ background: colors.border }}>
            <div className="px-2 py-1.5" style={{ background: colors.bg }}>
              <div className="text-[8px] uppercase tracking-[0.14em]" style={{ color: colors.faint }}>Longitude</div>
              <div className="mt-0.5 font-mono text-[10px]" style={{ color: colors.ink }}>{coordinates[0].toFixed(6)}</div>
            </div>
            <div className="px-2 py-1.5" style={{ background: colors.bg }}>
              <div className="text-[8px] uppercase tracking-[0.14em]" style={{ color: colors.faint }}>Latitude</div>
              <div className="mt-0.5 font-mono text-[10px]" style={{ color: colors.ink }}>{coordinates[1].toFixed(6)}</div>
            </div>
          </div>
        </section>
      )}

      {details.length > 0 && (
        <section className="border" style={{ background: colors.surface, borderColor: colors.border }}>
          <div className="border-b px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: colors.border, color: colors.faint }}>
            Details
          </div>
          <div>
            {details.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[76px_minmax(0,1fr)] gap-2 px-2.5 py-1.5"
                style={{
                  borderTop: index === 0 ? 'none' : `1px solid ${colors.border}`,
                  background: index % 2 === 0 ? colors.surface : colors.bg,
                }}
              >
                <div className="text-[9px] font-semibold tracking-[0.08em]" style={{ color: colors.faint }}>
                  {field.name}
                </div>
                <div
                  className="break-words text-[10px] font-medium leading-4.5"
                  style={{
                    color: colors.ink,
                    maxWidth: field.displayValue.length > 20 ? '100%' : '24ch',
                  }}
                >
                  {field.displayValue}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function getCustomFieldDisplayValue(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  return text;
}

function focusStyle(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget as HTMLElement;
  el.style.borderColor = colors.accent;
  el.style.boxShadow = 'inset 0 0 0 1px rgba(11,79,69,0.75)';
}
function blurStyle(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget as HTMLElement;
  el.style.borderColor = colors.border;
  el.style.boxShadow = 'none';
}

function StyleEditor({ type, style, onChange }: {
  type: string; style: PointStyle | LineStyle | PolygonStyle | TextStyle;
  onChange: (s: any) => void;
}) {
  const c = { accent: '#0b4f45', border: 'rgba(23,33,28,0.12)', bg: 'rgba(255,255,255,0.7)', muted: '#55615a' };

  if (type === 'point') {
    const s = style as PointStyle;
    return (
      <div className="space-y-2.5">
        <Sect label="颜色" color={c.muted}>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((col) => (
              <button key={col.value} onClick={() => onChange({ ...s, color: col.value })}
                className="h-5 w-5 transition-all duration-150" title={col.name}
                style={{
                  background: col.value,
                  transform: s.color === col.value ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: s.color === col.value ? `inset 0 0 0 1px white, 0 0 0 1px ${c.accent}` : `0 0 0 1px ${c.border}`,
                }} />
            ))}
          </div>
        </Sect>
        <Sect label="图标" color={c.muted}>
          <div className="flex flex-wrap gap-1">
            {PRESET_ICONS.map((icon) => (
              <button key={icon.value} onClick={() => onChange({ ...s, icon: icon.value })}
                className="px-2 py-0.5 text-[10px] transition-all duration-150"
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
                className="h-5 w-5 transition-all duration-150" title={col.name}
                style={{
                  background: col.value,
                  transform: s.color === col.value ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: s.color === col.value ? `inset 0 0 0 1px white, 0 0 0 1px ${c.accent}` : `0 0 0 1px ${c.border}`,
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
                className="flex-1 py-1.5 text-[10px] transition-all duration-150"
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

  if (type === 'text') {
    const s = style as TextStyle;
    return (
      <div className="space-y-2.5">
        <Sect label="颜色" color={c.muted}>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((col) => (
              <button key={col.value} onClick={() => onChange({ ...s, color: col.value })}
                className="h-5 w-5 transition-all duration-150" title={col.name}
                style={{
                  background: col.value,
                  transform: s.color === col.value ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: s.color === col.value ? `inset 0 0 0 1px white, 0 0 0 1px ${c.accent}` : `0 0 0 1px ${c.border}`,
                }} />
            ))}
          </div>
        </Sect>
        <Sect label={'字号: ' + (s.fontSize || 14) + 'px'} color={c.muted}>
          <input type="range" min={10} max={48} value={s.fontSize || 14}
            onChange={(e) => onChange({ ...s, fontSize: Number(e.target.value) })}
            className="w-full" style={{ accentColor: c.accent }} />
        </Sect>
        <Sect label="旋转" color={c.muted}>
          <input type="range" min={0} max={360} value={s.rotation || 0}
            onChange={(e) => onChange({ ...s, rotation: Number(e.target.value) })}
            className="w-full" style={{ accentColor: c.accent }} />
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
            className="h-5 w-5 transition-all duration-150" title={col.name}
            style={{
              background: col.value,
              transform: s.color === col.value ? 'scale(1.2)' : 'scale(1)',
              boxShadow: s.color === col.value ? `inset 0 0 0 1px white, 0 0 0 1px ${c.accent}` : `0 0 0 1px ${c.border}`,
            }} />
          ))}
        </div>
      </Sect>
      <Sect label="填充颜色" color={c.muted}>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((col) => (
            <button key={col.value} onClick={() => onChange({ ...s, fillColor: col.value })}
            className="h-5 w-5 transition-all duration-150" title={col.name}
            style={{
              background: col.value,
              transform: s.fillColor === col.value ? 'scale(1.2)' : 'scale(1)',
              boxShadow: s.fillColor === col.value ? `inset 0 0 0 1px white, 0 0 0 1px ${c.accent}` : `0 0 0 1px ${c.border}`,
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
type LinkItem = { title?: string; url?: string };
const MAX_ANNOTATION_IMAGES = 6;

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

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
function getCFJson<T>(customFields: { fieldId: string; value: string | number | null }[], key: CFKey, fallback: T): T {
  return safeParseJson(getCF(customFields, key), fallback);
}
function getCFArr(customFields: { fieldId: string; value: string | number | null }[], key: CFKey): string[] {
  const parsed = getCFJson<unknown>(customFields, key, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}
function getCFLinks(customFields: { fieldId: string; value: string | number | null }[], key: CFKey): LinkItem[] {
  const parsed = getCFJson<unknown>(customFields, key, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is LinkItem => Boolean(item) && typeof item === 'object') : [];
}
function getCFStringList(customFields: { fieldId: string; value: string | number | null }[], key: CFKey): string[] {
  const parsed = getCFJson<unknown>(customFields, key, []);
  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is string => typeof item === 'string');
  }
  return typeof parsed === 'string' && parsed ? [parsed] : [];
}
function setCFArr(customFields: { fieldId: string; value: string | number | null }[], key: CFKey, arr: any[]): { fieldId: string; value: string | number | null }[] {
  return setCF(customFields, key, JSON.stringify(arr));
}

function PolygonFields({ data, editing, onChange }: { data: any; editing: boolean; onChange: (d: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const cf = data.custom_fields || [];
  const images = getCFArr(cf, 'images');
  const links = getCFLinks(cf, 'links');
  const houseTypes = getCFStringList(cf, 'houseType');

  const updateName = (v: string) => onChange({ ...data, name: v });
  const updateCF = (key: CFKey, v: string) => onChange({ ...data, custom_fields: setCF((data).custom_fields || [], key, v) });
  const updateCFArr = (key: CFKey, arr: any[]) => onChange({ ...data, custom_fields: setCFArr((data).custom_fields || [], key, arr) });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files;
    if (!files || files.length === 0) return;

    const current = getCFArr((data).custom_fields || [], 'images');
    if (current.length >= MAX_ANNOTATION_IMAGES) {
      setUploadError(`最多上传 ${MAX_ANNOTATION_IMAGES} 张图片`);
      input.value = '';
      return;
    }

    const selectedFiles = Array.from(files);
    if (current.length + selectedFiles.length > MAX_ANNOTATION_IMAGES) {
      setUploadError(`最多上传 ${MAX_ANNOTATION_IMAGES} 张图片`);
      input.value = '';
      return;
    }

    const validationError = selectedFiles.map(validateAnnotationImage).find(Boolean);
    if (validationError) {
      setUploadError(validationError);
      input.value = '';
      return;
    }

    setUploadError('');
    setUploading(true);
    try {
      const newUrls = [...current];
      for (const file of selectedFiles) {
        const url = await uploadAnnotationImage(file);
        if (!url) {
          throw new Error('图片读取失败，请重试');
        }
        newUrls.push(url);
      }
      updateCFArr('images', newUrls);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '图片上传失败，请重试');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const removeImage = async (url: string) => {
    setUploadError('');
    await deleteAnnotationImage(url);
    const current = getCFArr((data).custom_fields || [], 'images');
    updateCFArr('images', current.filter((u) => u !== url));
  };

  const addLink = () => {
    updateCFArr('links', [...getCFLinks((data).custom_fields || [], 'links'), { title: '', url: '' }]);
  };
  const updateLink = (idx: number, field: 'title' | 'url', val: string) => {
    const current = [...getCFLinks((data).custom_fields || [], 'links')];
    current[idx] = { ...current[idx], [field]: val };
    updateCFArr('links', current);
  };
  const removeLink = (idx: number) => {
    const current = getCFLinks((data).custom_fields || [], 'links');
    updateCFArr('links', current.filter((_: LinkItem, i: number) => i !== idx));
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
          const arr = houseTypes.length > 0 ? houseTypes : [''];
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
                    className="flex-1 px-2 py-1 text-xs outline-none transition"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }}
                    onFocus={focusStyle} onBlur={blurStyle} />
                  {arr.length > 1 && (
                    <button onClick={() => updateCF('houseType', JSON.stringify(arr.filter((_: string, j: number) => j !== i)))}
                      className="text-[10px] px-1 shrink-0" style={{ color: colors.danger }}>×</button>
                  )}
                </div>
              ))}
              <button onClick={() => updateCF('houseType', JSON.stringify([...arr, '']))}
                className="flex items-center gap-1 px-2.5 py-1 text-xs transition"
                style={{ background: colors.bg, border: `1px dashed ${colors.border}`, color: colors.muted }}>
                <Plus className="w-3 h-3" aria-hidden="true" /> 添加户型
              </button>
            </div>
          );
        })() : (
          houseTypes.length > 0 ? (
            <div className="space-y-0.5">
              {houseTypes.map((item: string, i: number) => (
                <span key={i} className="block text-xs" style={{ color: colors.ink }}>{item || '—'}</span>
              ))}
            </div>
          ) : (
            <span className="text-xs" style={{ color: colors.placeholder }}>—</span>
          )
        ))}
      </Field>

      {/* 备注 */}
      <Field label="备注">
        {editing ? (
          <textarea value={getCF(cf, 'notes')}
            onChange={(e) => updateCF('notes', e.target.value)}
            rows={2} className="w-full px-2.5 py-1.5 text-xs outline-none resize-none transition"
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
          <>
            <label className="flex items-center gap-2 px-2.5 py-2 mb-2 cursor-pointer transition text-xs"
              style={{ background: colors.bg, border: `1px dashed ${colors.border}`, color: colors.muted }}>
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              {uploading ? '上传中...' : `上传图片（最多 ${MAX_ANNOTATION_IMAGES} 张，单张 2MB 以内）`}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleImageUpload} className="hidden" />
            </label>
            {uploadError && (
              <p className="mb-2 text-[11px]" style={{ color: colors.danger }}>{uploadError}</p>
            )}
          </>
        )}
        {images.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {images.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt="" className="w-14 h-14 object-cover" style={{ border: `1px solid ${colors.border}` }} />
                {editing && (
                  <button onClick={() => removeImage(url)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center text-[8px] transition"
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition mb-2"
            style={{ background: colors.bg, border: `1px dashed ${colors.border}`, color: colors.muted }}>
            <Plus className="w-3 h-3" aria-hidden="true" /> 添加链接
          </button>
        )}
        {links.length > 0 ? (
          <div className="space-y-1.5">
            {links.map((link: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5">
                {(() => {
                  const safeUrl = sanitizeExternalUrl(link.url);
                  return (editing && !link.url) ? (
                    <>
                      <input value={link.title || ''} placeholder="标题"
                        onChange={(e) => updateLink(i, 'title', e.target.value)}
                        className="flex-1 px-2 py-1 text-[11px] outline-none"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }} />
                      <input value={link.url || ''} placeholder="https://..."
                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                        className="flex-1 px-2 py-1 text-[11px] outline-none"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.accent }} />
                      <button onClick={() => removeLink(i)} className="text-[10px] px-1" style={{ color: colors.danger }}>×</button>
                    </>
                  ) : safeUrl ? (
                    <a href={safeUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs hover:underline truncate" style={{ color: colors.accent }}>
                      <Link2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{link.title || safeUrl || '查看链接'}</span>
                    </a>
                  ) : editing ? (
                    <>
                      <input value={link.title || ''} placeholder="标题"
                        onChange={(e) => updateLink(i, 'title', e.target.value)}
                        className="flex-1 px-2 py-1 text-[11px] outline-none"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }} />
                      <input value={link.url || ''} placeholder="https://..."
                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                        className="flex-1 px-2 py-1 text-[11px] outline-none"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.accent }} />
                      <button onClick={() => removeLink(i)} className="text-[10px] px-1" style={{ color: colors.danger }}>×</button>
                    </>
                  ) : (
                    <span className="text-xs" style={{ color: colors.placeholder }}>链接不可用</span>
                  );
                })()}
              </div>
            ))}
          </div>
        ) : (
          !editing && <span className="text-xs" style={{ color: colors.placeholder }}>暂无链接</span>
        )}
      </Field>

      {/* 样式编辑 */}
      {editing && (
        <div style={{ background: colors.bg, padding: '10px', border: `1px solid ${colors.border}` }}>
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
            rows={2} className="w-full px-2.5 py-1.5 text-xs outline-none resize-none transition"
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.ink }}
            onFocus={focusStyle} onBlur={blurStyle} placeholder="补充说明…" />
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: getCF(data.custom_fields || [], 'notes') ? colors.muted : colors.placeholder }}>
            {getCF(data.custom_fields || [], 'notes') || '—'}
          </p>
        )}
      </Field>

      {editing && (
        <div style={{ background: colors.bg, padding: '10px', border: `1px solid ${colors.border}` }}>
          <div className="text-[9px] font-semibold mb-2 tracking-widest uppercase" style={{ color: colors.muted }}>样式</div>
          <StyleEditor type="line" style={data.style}
            onChange={(style: any) => onChange({ ...data, style })} />
        </div>
      )}
    </>
  );
}
