import { turso } from '@/lib/turso';
import { DEFAULT_LAND_FIELD_TEMPLATES } from '@/lib/constants';
import { Annotation, FieldTemplate, Geometry, MapProject, MapSettings } from '@/lib/types';
import { ensureSchema } from './schema';

const ADMIN_USER_ID = 'admin';
const DEFAULT_DB_CENTER: [number, number] = [120.1976, 35.9607];
const DEFAULT_MAP_KEY = 'default-admin-map';
export const MAX_BULK_IMPORT_COUNT = 500;

export interface MapAuditEntry {
  id: string;
  map_id: string;
  action: string;
  previous_value: string;
  next_value: string;
  created_at: string;
}

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

function normalizeCenter(value: unknown): [number, number] {
  return isCoordinatePair(value) ? value : DEFAULT_DB_CENTER;
}

function normalizeFieldTemplates(value: unknown): FieldTemplate[] {
  return Array.isArray(value) ? value as FieldTemplate[] : [];
}

function normalizeCustomFields(value: unknown): Annotation['custom_fields'] {
  return Array.isArray(value) ? value as Annotation['custom_fields'] : [];
}

function normalizeSettings(value: unknown): MapSettings {
  const rawSettings = value && typeof value === 'object' ? value as Partial<MapSettings> : {};
  return {
    isPublic: rawSettings.isPublic !== false,
    showNames: rawSettings.showNames !== false,
    defaultNames: {
      point: rawSettings.defaultNames?.point ?? '',
      line: rawSettings.defaultNames?.line ?? '',
      polygon: rawSettings.defaultNames?.polygon ?? '',
    },
  };
}

function normalizeGeometry(type: Annotation['type'], value: unknown): Geometry {
  const fallbackPoint: Geometry = { type: 'Point', coordinates: DEFAULT_DB_CENTER };
  const parsed = value && typeof value === 'object' ? value as Partial<Geometry> : null;

  if (type === 'point' || type === 'text') {
    if (parsed?.type === 'Point' && isCoordinatePair((parsed as { coordinates?: unknown }).coordinates)) {
      return parsed as Geometry;
    }
    return fallbackPoint;
  }

  if (type === 'line') {
    const coordinates = (parsed as { coordinates?: unknown })?.coordinates;
    if (
      parsed?.type === 'LineString' &&
      Array.isArray(coordinates) &&
      coordinates.every((item) => isCoordinatePair(item))
    ) {
      return parsed as Geometry;
    }
    return { type: 'LineString', coordinates: [] };
  }

  const coordinates = (parsed as { coordinates?: unknown })?.coordinates;
  if (
    parsed?.type === 'Polygon' &&
    Array.isArray(coordinates) &&
    coordinates.every((item) => isCoordinatePair(item))
  ) {
    return parsed as Geometry;
  }
  return { type: 'Polygon', coordinates: [] };
}

function normalizeStyle(type: Annotation['type'], value: unknown): Annotation['style'] {
  const parsed = value && typeof value === 'object' ? value as Record<string, unknown> : {};

  if (type === 'point') {
    return {
      color: typeof parsed.color === 'string' ? parsed.color : '#EF4444',
      icon: typeof parsed.icon === 'string' ? parsed.icon : 'map-pin',
      size: typeof parsed.size === 'number' ? parsed.size : 2,
    };
  }

  if (type === 'text') {
    const rawColor = typeof parsed.color === 'string' ? parsed.color : '#1a4735';
    const rawFontSize = typeof parsed.fontSize === 'number' ? parsed.fontSize : 16;
    const rawRotation = typeof parsed.rotation === 'number' ? parsed.rotation : undefined;
    const normalizedRotation =
      rawRotation === undefined
        ? undefined
        : ((Math.round(rawRotation) % 360) + 360) % 360;

    return {
      color: /^#[0-9A-Fa-f]{6}$/.test(rawColor) ? rawColor : '#1a4735',
      fontSize: Math.max(10, Math.min(48, Math.round(rawFontSize))),
      fontFamily: typeof parsed.fontFamily === 'string' ? parsed.fontFamily : undefined,
      rotation: normalizedRotation,
    };
  }

  if (type === 'line') {
    return {
      color: typeof parsed.color === 'string' ? parsed.color : '#7a6b55',
      width: typeof parsed.width === 'number' ? parsed.width : 3,
      dashArray: typeof parsed.dashArray === 'string' ? parsed.dashArray : undefined,
    };
  }

  return {
    color: typeof parsed.color === 'string' ? parsed.color : '#1a4735',
    fillColor: typeof parsed.fillColor === 'string' ? parsed.fillColor : '#1a4735',
    fillOpacity: typeof parsed.fillOpacity === 'number' ? parsed.fillOpacity : 0.3,
    width: typeof parsed.width === 'number' ? parsed.width : 2,
  };
}

function normalizeAnnotationType(value: unknown): Annotation['type'] {
  return value === 'point' || value === 'line' || value === 'polygon' || value === 'text' ? value : 'point';
}

function rowToMapProject(row: Record<string, unknown>): MapProject {
  const rawSettings = safeParseJson(row.settings, {} as unknown);
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name || ''),
    description: String(row.description || ''),
    center: normalizeCenter(safeParseJson(row.center, DEFAULT_DB_CENTER)),
    zoom: Number(row.zoom || 13),
    field_templates: normalizeFieldTemplates(safeParseJson(row.field_templates, [] as unknown[])),
    settings: normalizeSettings(rawSettings),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToAnnotation(row: Record<string, unknown>): Annotation {
  const type = normalizeAnnotationType(String(row.type));
  return {
    id: String(row.id),
    map_id: String(row.map_id),
    group_id: row.group_id ? String(row.group_id) : undefined,
    type,
    geometry: normalizeGeometry(type, safeParseJson(row.geometry, {} as unknown)),
    name: String(row.name || ''),
    description: String(row.description || ''),
    style: normalizeStyle(type, safeParseJson(row.style, {} as unknown)),
    custom_fields: normalizeCustomFields(safeParseJson(row.custom_fields, [] as unknown[])),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value);
}

function rowToMapAudit(row: Record<string, unknown>): MapAuditEntry {
  return {
    id: String(row.id),
    map_id: String(row.map_id),
    action: String(row.action),
    previous_value: String(row.previous_value || ''),
    next_value: String(row.next_value || ''),
    created_at: String(row.created_at),
  };
}

function normalizeMapSettings(settings?: Partial<MapSettings> | null): MapSettings {
  return {
    isPublic: settings?.isPublic !== false,
    showNames: settings?.showNames !== false,
    defaultNames: {
      point: settings?.defaultNames?.point ?? '',
      line: settings?.defaultNames?.line ?? '',
      polygon: settings?.defaultNames?.polygon ?? '',
    },
  };
}

function mergeImportedPointAnnotation(
  item: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>,
  existing: Annotation | null,
  now: string
): Annotation {
  return {
    ...(existing || {}),
    ...item,
    id: existing?.id || crypto.randomUUID(),
    description: item.description || existing?.description || '',
    geometry: item.geometry || existing?.geometry,
    custom_fields:
      existing && item.custom_fields.length > 0
        ? existing.custom_fields.map((field) => {
            const incoming = item.custom_fields.find((entry) => entry.fieldId === field.fieldId);
            if (!incoming || incoming.value == null || incoming.value === '') return field;
            return incoming;
          }).concat(item.custom_fields.filter((entry) => !existing.custom_fields.some((field) => field.fieldId === entry.fieldId)))
        : item.custom_fields,
    created_at: existing?.created_at || now,
    updated_at: now,
  } as Annotation;
}

export async function getOrCreateDefaultMap() {
  await ensureSchema();

  const latestExisting = await turso.execute({
    sql: `SELECT *
          FROM maps
          WHERE user_id = ?
          ORDER BY updated_at DESC
          LIMIT 1`,
    args: [ADMIN_USER_ID],
  });

  if (latestExisting.rows[0]) {
    return rowToMapProject(latestExisting.rows[0] as Record<string, unknown>);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await turso.execute({
    sql: `INSERT OR IGNORE INTO maps
          (id, user_id, system_key, name, description, center, zoom, field_templates, settings, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      ADMIN_USER_ID,
      DEFAULT_MAP_KEY,
      '我的地图',
      '默认地图项目',
      stringifyJson(DEFAULT_DB_CENTER),
      13,
      stringifyJson(DEFAULT_LAND_FIELD_TEMPLATES),
      stringifyJson(normalizeMapSettings()),
      now,
      now,
    ],
  });

  const existing = await turso.execute({
    sql: 'SELECT * FROM maps WHERE system_key = ? LIMIT 1',
    args: [DEFAULT_MAP_KEY],
  });

  if (!existing.rows[0]) {
    throw new Error('默认地图初始化失败');
  }

  return rowToMapProject(existing.rows[0] as Record<string, unknown>);
}

export async function getMapById(mapId: string) {
  await ensureSchema();
  const result = await turso.execute({
    sql: 'SELECT * FROM maps WHERE id = ? LIMIT 1',
    args: [mapId],
  });
  if (!result.rows[0]) return null;
  return rowToMapProject(result.rows[0] as Record<string, unknown>);
}

export async function getPublicMapById(mapId: string) {
  const mapProject = await getMapById(mapId);
  if (!mapProject || mapProject.settings.isPublic === false) {
    return null;
  }
  return mapProject;
}

export async function listAnnotations(mapId: string) {
  await ensureSchema();
  const result = await turso.execute({
    sql: 'SELECT * FROM annotations WHERE map_id = ? ORDER BY created_at ASC',
    args: [mapId],
  });
  return result.rows.map((row) => rowToAnnotation(row as Record<string, unknown>));
}

export async function findPointAnnotationByName(mapId: string, name: string) {
  await ensureSchema();
  const result = await turso.execute({
    sql: 'SELECT * FROM annotations WHERE map_id = ? AND type = ? AND name = ? LIMIT 1',
    args: [mapId, 'point', name],
  });
  if (!result.rows[0]) return null;
  return rowToAnnotation(result.rows[0] as Record<string, unknown>);
}

export async function listMaps(options?: { publicOnly?: boolean }) {
  await ensureSchema();
  const clauses = [`m.user_id = '${ADMIN_USER_ID}'`];

  if (options?.publicOnly) {
    clauses.push(`COALESCE(json_extract(m.settings, '$.isPublic'), 1) = 1`);
  }

  const result = await turso.execute(`
    SELECT m.*, (SELECT count(*) FROM annotations a WHERE a.map_id = m.id) as annotation_count
    FROM maps m
    WHERE ${clauses.join(' AND ')}
    ORDER BY m.updated_at DESC
  `);
  return result.rows.map((row) => {
    const base = rowToMapProject(row as Record<string, unknown>);
    return {
      ...base,
      annotation_count: Number((row as Record<string, unknown>).annotation_count || 0),
    };
  });
}

export async function requireExistingMap(mapId: string) {
  const mapProject = await getMapById(mapId);
  if (!mapProject) {
    throw new Error('地图不存在');
  }
  return mapProject;
}

export async function requireExistingAnnotation(id: string) {
  const annotation = await getAnnotationById(id);
  if (!annotation) {
    throw new Error('标注不存在');
  }
  return annotation;
}

export async function validateAnnotationPayload(annotation: Annotation) {
  const mapProject = await requireExistingMap(annotation.map_id);
  if (annotation.group_id) {
    const groupResult = await turso.execute({
      sql: 'SELECT map_id FROM groups WHERE id = ? LIMIT 1',
      args: [annotation.group_id],
    });
    const row = groupResult.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      throw new Error('分组不存在');
    }
    if (String(row.map_id) !== mapProject.id) {
      throw new Error('分组不属于当前地图');
    }
  }
  return mapProject;
}

export async function saveAnnotation(annotation: Annotation) {
  await ensureSchema();
  const now = new Date().toISOString();
  await turso.execute({
    sql: `INSERT OR REPLACE INTO annotations
      (id, map_id, group_id, type, geometry, name, description, style, custom_fields, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      annotation.id,
      annotation.map_id,
      annotation.group_id || null,
      annotation.type,
      stringifyJson(annotation.geometry),
      annotation.name,
      annotation.description,
      stringifyJson(annotation.style),
      stringifyJson(annotation.custom_fields),
      annotation.created_at || now,
      now,
    ],
  });

  return { ...annotation, updated_at: now };
}

export async function saveImportedPointAnnotation(
  item: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>,
  now = new Date().toISOString()
) {
  await ensureSchema();
  let existing = item.name ? await findPointAnnotationByName(item.map_id, item.name) : null;
  let nextAnnotation = mergeImportedPointAnnotation(item, existing, now);
  await validateAnnotationPayload(nextAnnotation);

  try {
    return await saveAnnotation(nextAnnotation);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const duplicatedPointName =
      item.name && (message.includes('unique') || message.includes('constraint') || message.includes('idx_annotations_unique_point_name'));

    if (!duplicatedPointName) {
      throw error;
    }

    existing = await findPointAnnotationByName(item.map_id, item.name);
    if (!existing) {
      throw error;
    }

    nextAnnotation = mergeImportedPointAnnotation(item, existing, now);
    await validateAnnotationPayload(nextAnnotation);
    return saveAnnotation(nextAnnotation);
  }
}

export async function deleteAnnotation(id: string) {
  await ensureSchema();
  await turso.execute({ sql: 'DELETE FROM annotations WHERE id = ?', args: [id] });
}

export async function getAnnotationById(id: string) {
  await ensureSchema();
  const result = await turso.execute({
    sql: 'SELECT * FROM annotations WHERE id = ? LIMIT 1',
    args: [id],
  });
  if (!result.rows[0]) return null;
  return rowToAnnotation(result.rows[0] as Record<string, unknown>);
}

export async function batchDeleteAnnotations(ids: string[]) {
  await ensureSchema();
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  await turso.execute({
    sql: `DELETE FROM annotations WHERE id IN (${placeholders})`,
    args: ids,
  });
}

export async function batchUpdateAnnotationField(ids: string[], fieldId: string, value: string | number | null) {
  await ensureSchema();
  if (ids.length === 0) return [];

  const annotations = await Promise.all(ids.map((id) => getAnnotationById(id)));
  const updatedItems: Annotation[] = [];

  for (const annotation of annotations) {
    if (!annotation) continue;
    const existingIndex = annotation.custom_fields.findIndex((item) => item.fieldId === fieldId);
    const nextFields = [...annotation.custom_fields];

    if (existingIndex >= 0) {
      nextFields[existingIndex] = { ...nextFields[existingIndex], value };
    } else {
      nextFields.push({ fieldId, value });
    }

    const saved = await saveAnnotation({
      ...annotation,
      custom_fields: nextFields,
    });
    updatedItems.push(saved);
  }

  return updatedItems;
}

export async function updateFieldTemplates(mapId: string, templates: FieldTemplate[]) {
  await ensureSchema();
  await requireExistingMap(mapId);
  const now = new Date().toISOString();
  await turso.execute({
    sql: 'UPDATE maps SET field_templates = ?, updated_at = ? WHERE id = ?',
    args: [stringifyJson(templates), now, mapId],
  });
}

export async function createMap(name: string, description: string, fieldTemplates?: FieldTemplate[], settings?: MapSettings) {
  await ensureSchema();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const templates = fieldTemplates || [];
  const mapSettings = normalizeMapSettings(settings);
  await turso.execute({
    sql: `INSERT INTO maps (id, user_id, name, description, center, zoom, field_templates, settings, created_at, updated_at)
          VALUES (?, 'admin', ?, ?, ?, 13, ?, ?, ?, ?)`,
    args: [id, name, description, stringifyJson(DEFAULT_DB_CENTER), stringifyJson(templates), stringifyJson(mapSettings), now, now],
  });
  return getMapById(id);
}

export async function updateMap(mapId: string, updates: { name?: string; description?: string; center?: [number, number]; zoom?: number; settings?: MapSettings }) {
  await ensureSchema();
  const existingMap = await requireExistingMap(mapId);
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const args: (string | number | null)[] = [now];
  if (updates.name !== undefined) { sets.push('name = ?'); args.push(updates.name); }
  if (updates.description !== undefined) { sets.push('description = ?'); args.push(updates.description); }
  if (updates.center !== undefined) { sets.push('center = ?'); args.push(stringifyJson(updates.center)); }
  if (updates.zoom !== undefined) { sets.push('zoom = ?'); args.push(updates.zoom); }
  const normalizedSettings = updates.settings !== undefined ? normalizeMapSettings(updates.settings) : undefined;
  if (normalizedSettings !== undefined) { sets.push('settings = ?'); args.push(stringifyJson(normalizedSettings)); }
  args.push(mapId);
  await turso.execute({ sql: `UPDATE maps SET ${sets.join(', ')} WHERE id = ?`, args });

  if (normalizedSettings !== undefined) {
    await turso.execute({
      sql: `INSERT INTO map_audits (id, map_id, action, previous_value, next_value, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        mapId,
        'settings_updated',
        stringifyJson(existingMap.settings),
        stringifyJson(normalizedSettings),
        now,
      ],
    });
  }
}

export async function listMapAudits(mapId: string, limit = 20) {
  await ensureSchema();
  await requireExistingMap(mapId);
  const result = await turso.execute({
    sql: `SELECT * FROM map_audits WHERE map_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [mapId, limit],
  });
  return result.rows.map((row) => rowToMapAudit(row as Record<string, unknown>));
}

export async function deleteMap(mapId: string) {
  await ensureSchema();
  await requireExistingMap(mapId);
  await turso.execute({ sql: 'DELETE FROM annotations WHERE map_id = ?', args: [mapId] });
  await turso.execute({ sql: 'DELETE FROM groups WHERE map_id = ?', args: [mapId] });
  await turso.execute({ sql: 'DELETE FROM maps WHERE id = ?', args: [mapId] });
}
