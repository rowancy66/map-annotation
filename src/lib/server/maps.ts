import { turso } from '@/lib/turso';
import { DEFAULT_LAND_FIELD_TEMPLATES } from '@/lib/constants';
import { Annotation, FieldTemplate, MapProject } from '@/lib/types';
import { ensureSchema } from './schema';

const ADMIN_USER_ID = 'admin';

function rowToMapProject(row: Record<string, unknown>): MapProject {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name || ''),
    description: String(row.description || ''),
    center: JSON.parse(String(row.center || '[120.43,36.16]')),
    zoom: Number(row.zoom || 13),
    field_templates: JSON.parse(String(row.field_templates || '[]')),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToAnnotation(row: Record<string, unknown>): Annotation {
  return {
    id: String(row.id),
    map_id: String(row.map_id),
    group_id: row.group_id ? String(row.group_id) : undefined,
    type: String(row.type) as Annotation['type'],
    geometry: JSON.parse(String(row.geometry)),
    name: String(row.name || ''),
    description: String(row.description || ''),
    style: JSON.parse(String(row.style || '{}')),
    custom_fields: JSON.parse(String(row.custom_fields || '[]')),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value);
}

export async function getOrCreateDefaultMap() {
  await ensureSchema();
  const existing = await turso.execute({
    sql: 'SELECT * FROM maps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [ADMIN_USER_ID],
  });

  if (existing.rows[0]) {
    return rowToMapProject(existing.rows[0] as Record<string, unknown>);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await turso.execute({
    sql: `INSERT INTO maps (id, user_id, name, description, center, zoom, field_templates, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      ADMIN_USER_ID,
      '我的地图',
      '默认地图项目',
      stringifyJson([120.43, 36.16]),
      13,
      stringifyJson(DEFAULT_LAND_FIELD_TEMPLATES),
      now,
      now,
    ],
  });

  return {
    id,
    user_id: ADMIN_USER_ID,
    name: '我的地图',
    description: '默认地图项目',
    center: [120.43, 36.16] as [number, number],
    zoom: 13,
    field_templates: DEFAULT_LAND_FIELD_TEMPLATES,
    created_at: now,
    updated_at: now,
  } satisfies MapProject;
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

export async function listAnnotations(mapId: string) {
  await ensureSchema();
  const result = await turso.execute({
    sql: 'SELECT * FROM annotations WHERE map_id = ? ORDER BY created_at ASC',
    args: [mapId],
  });
  return result.rows.map((row) => rowToAnnotation(row as Record<string, unknown>));
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

export async function updateFieldTemplates(mapId: string, templates: FieldTemplate[]) {
  await ensureSchema();
  const now = new Date().toISOString();
  await turso.execute({
    sql: 'UPDATE maps SET field_templates = ?, updated_at = ? WHERE id = ?',
    args: [stringifyJson(templates), now, mapId],
  });
}

// ===== 多地图管理 =====

export async function listMaps() {
  await ensureSchema();
  const result = await turso.execute(`
    SELECT m.*, (SELECT count(*) FROM annotations a WHERE a.map_id = m.id) as annotation_count
    FROM maps m
    WHERE m.user_id = 'admin'
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

export async function createMap(name: string, description: string, fieldTemplates?: FieldTemplate[]) {
  await ensureSchema();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const templates = fieldTemplates || DEFAULT_LAND_FIELD_TEMPLATES;
  await turso.execute({
    sql: `INSERT INTO maps (id, user_id, name, description, center, zoom, field_templates, created_at, updated_at)
          VALUES (?, 'admin', ?, ?, ?, 13, ?, ?, ?)`,
    args: [id, name, description, stringifyJson([120.43, 36.16]), stringifyJson(templates), now, now],
  });
  return getMapById(id);
}

export async function updateMap(mapId: string, updates: { name?: string; description?: string; center?: [number, number]; zoom?: number }) {
  await ensureSchema();
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const args: (string | number | null)[] = [now];
  if (updates.name !== undefined) { sets.push('name = ?'); args.push(updates.name); }
  if (updates.description !== undefined) { sets.push('description = ?'); args.push(updates.description); }
  if (updates.center !== undefined) { sets.push('center = ?'); args.push(stringifyJson(updates.center)); }
  if (updates.zoom !== undefined) { sets.push('zoom = ?'); args.push(updates.zoom); }
  args.push(mapId);
  await turso.execute({ sql: `UPDATE maps SET ${sets.join(', ')} WHERE id = ?`, args });
}

export async function deleteMap(mapId: string) {
  await ensureSchema();
  await turso.execute({ sql: 'DELETE FROM annotations WHERE map_id = ?', args: [mapId] });
  await turso.execute({ sql: 'DELETE FROM groups WHERE map_id = ?', args: [mapId] });
  await turso.execute({ sql: 'DELETE FROM maps WHERE id = ?', args: [mapId] });
}
