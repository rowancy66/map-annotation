import { turso } from '@/lib/turso';
import { Group } from '@/lib/types';
import { ensureSchema } from './schema';
import { requireExistingMap } from './maps';

function rowToGroup(row: Record<string, unknown>): Group {
  return {
    id: String(row.id),
    map_id: String(row.map_id),
    name: String(row.name || ''),
    parent_id: row.parent_id ? String(row.parent_id) : null,
    color: String(row.color || ''),
    sort_order: Number(row.sort_order || 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function ensureNoGroupCycle(groupId: string, nextParentId: string | null, mapId: string) {
  let cursor = nextParentId;
  const visited = new Set<string>();

  while (cursor) {
    if (cursor === groupId) {
      throw new Error('父分组不能是当前分组或其子分组');
    }
    if (visited.has(cursor)) {
      throw new Error('检测到分组层级异常');
    }
    visited.add(cursor);

    const parentGroup = await getGroupById(cursor);
    if (!parentGroup) {
      throw new Error('父分组不存在');
    }
    if (parentGroup.map_id !== mapId) {
      throw new Error('父分组不属于当前地图');
    }

    cursor = parentGroup.parent_id;
  }
}

export async function listGroups(mapId: string) {
  await ensureSchema();
  const result = await turso.execute({
    sql: 'SELECT * FROM groups WHERE map_id = ? ORDER BY sort_order ASC, name ASC',
    args: [mapId],
  });
  return result.rows.map((row) => rowToGroup(row as Record<string, unknown>));
}

export async function createGroup(mapId: string, name: string, parentId?: string, color?: string) {
  await ensureSchema();
  await requireExistingMap(mapId);
  if (parentId) {
    const parentGroup = await getGroupById(parentId);
    if (!parentGroup) {
      throw new Error('父分组不存在');
    }
    if (parentGroup.map_id !== mapId) {
      throw new Error('父分组不属于当前地图');
    }
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await turso.execute({
    sql: 'INSERT INTO groups (id, map_id, name, parent_id, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [id, mapId, name, parentId || null, color || '', 0, now, now],
  });
  return getGroupById(id);
}

export async function updateGroup(groupId: string, updates: { name?: string; color?: string; parent_id?: string | null; sort_order?: number }) {
  await ensureSchema();
  const group = await getGroupById(groupId);
  if (!group) {
    throw new Error('分组不存在');
  }
  if (updates.parent_id) {
    const parentGroup = await getGroupById(updates.parent_id);
    if (!parentGroup) {
      throw new Error('父分组不存在');
    }
    if (parentGroup.map_id !== group.map_id) {
      throw new Error('父分组不属于当前地图');
    }
    if (parentGroup.id === groupId) {
      throw new Error('分组不能设置自己为父分组');
    }
  }
  if (updates.parent_id !== undefined) {
    await ensureNoGroupCycle(groupId, updates.parent_id, group.map_id);
  }
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const args: (string | number | null)[] = [now];
  if (updates.name !== undefined) { sets.push('name = ?'); args.push(updates.name); }
  if (updates.color !== undefined) { sets.push('color = ?'); args.push(updates.color); }
  if (updates.parent_id !== undefined) { sets.push('parent_id = ?'); args.push(updates.parent_id); }
  if (updates.sort_order !== undefined) { sets.push('sort_order = ?'); args.push(updates.sort_order); }
  args.push(groupId);
  await turso.execute({ sql: `UPDATE groups SET ${sets.join(', ')} WHERE id = ?`, args });
}

export async function deleteGroup(groupId: string) {
  await ensureSchema();
  const group = await getGroupById(groupId);
  if (!group) {
    throw new Error('分组不存在');
  }
  // 将子分组提升到父分组
  await turso.execute({
    sql: 'UPDATE groups SET parent_id = (SELECT parent_id FROM groups WHERE id = ?) WHERE parent_id = ?',
    args: [groupId, groupId],
  });
  // 将组内标注移出分组
  await turso.execute({
    sql: 'UPDATE annotations SET group_id = NULL WHERE group_id = ?',
    args: [groupId],
  });
  await turso.execute({ sql: 'DELETE FROM groups WHERE id = ?', args: [groupId] });
}

export async function getGroupById(groupId: string) {
  await ensureSchema();
  const result = await turso.execute({
    sql: 'SELECT * FROM groups WHERE id = ? LIMIT 1',
    args: [groupId],
  });
  if (!result.rows[0]) return null;
  return rowToGroup(result.rows[0] as Record<string, unknown>);
}

export async function requireExistingGroup(groupId: string) {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new Error('分组不存在');
  }
  return group;
}

export async function moveAnnotationToGroup(annotationId: string, groupId: string | null) {
  await ensureSchema();
  const now = new Date().toISOString();
  await turso.execute({
    sql: 'UPDATE annotations SET group_id = ?, updated_at = ? WHERE id = ?',
    args: [groupId, now, annotationId],
  });
}

export async function batchMoveAnnotationsToGroup(annotationIds: string[], groupId: string | null) {
  await ensureSchema();
  if (annotationIds.length === 0) return;
  const now = new Date().toISOString();
  const placeholders = annotationIds.map(() => '?').join(', ');
  await turso.execute({
    sql: `UPDATE annotations SET group_id = ?, updated_at = ? WHERE id IN (${placeholders})`,
    args: [groupId, now, ...annotationIds],
  });
}
