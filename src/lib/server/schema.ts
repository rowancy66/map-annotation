import { turso } from '@/lib/turso';

let schemaPromise: Promise<void> | null = null;
const OLD_DEFAULT_CENTER = JSON.stringify([120.43, 36.16]);
const NEW_DEFAULT_CENTER = JSON.stringify([120.1976, 35.9607]);
const DEFAULT_MAP_KEY = 'default-admin-map';

export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await turso.batch([
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS maps (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          center TEXT NOT NULL,
          zoom INTEGER NOT NULL DEFAULT 13,
          field_templates TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          map_id TEXT NOT NULL,
          name TEXT NOT NULL,
          parent_id TEXT DEFAULT NULL,
          color TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS annotations (
          id TEXT PRIMARY KEY,
          map_id TEXT NOT NULL,
          type TEXT NOT NULL,
          geometry TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          style TEXT NOT NULL,
          custom_fields TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_maps_user_id ON maps(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_groups_map_id ON groups(map_id)`,
        `CREATE INDEX IF NOT EXISTS idx_annotations_map_id ON annotations(map_id)`,
        `CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type)`,
      ], 'write');

      // 为已有 annotations 表迁移 group_id 列和索引
      try {
        await turso.execute("ALTER TABLE annotations ADD COLUMN group_id TEXT DEFAULT NULL");
      } catch {
        // 列已存在，忽略
      }
      try {
        await turso.execute("CREATE INDEX IF NOT EXISTS idx_annotations_group_id ON annotations(group_id)");
      } catch {
        // 列不存在导致索引失败，忽略
      }
      // 为已有 maps 表迁移 settings 列
      try {
        await turso.execute("ALTER TABLE maps ADD COLUMN settings TEXT NOT NULL DEFAULT '{}'");
      } catch {
        // 列已存在，忽略
      }
      try {
        await turso.execute("ALTER TABLE maps ADD COLUMN system_key TEXT DEFAULT NULL");
      } catch {
        // 列已存在，忽略
      }
      await turso.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_maps_system_key ON maps(system_key) WHERE system_key IS NOT NULL'
      );
      await turso.execute({
        sql: `UPDATE maps
              SET system_key = ?
              WHERE id = (
                SELECT id
                FROM maps
                WHERE user_id = ? AND (system_key IS NULL OR system_key = '')
                ORDER BY created_at DESC
                LIMIT 1
              )
              AND NOT EXISTS (
                SELECT 1 FROM maps WHERE system_key = ?
              )`,
        args: [DEFAULT_MAP_KEY, 'admin', DEFAULT_MAP_KEY],
      });

      const duplicateNamedPoints = await turso.execute(`
        SELECT map_id, name, COUNT(*) AS duplicate_count
        FROM annotations
        WHERE type = 'point' AND name <> ''
        GROUP BY map_id, name
        HAVING COUNT(*) > 1
        LIMIT 1
      `);

      if (duplicateNamedPoints.rows[0]) {
        const row = duplicateNamedPoints.rows[0] as Record<string, unknown>;
        throw new Error(
          `检测到重复点标注名称，无法启用唯一约束：地图 ${String(row.map_id)} 下的名称“${String(row.name)}”重复 ${String(row.duplicate_count)} 次`
        );
      }

      await turso.execute(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_annotations_unique_point_name
         ON annotations(map_id, type, name)
         WHERE type = 'point' AND name <> ''`
      );
      await turso.execute({
        sql: 'UPDATE maps SET center = ? WHERE center = ?',
        args: [NEW_DEFAULT_CENTER, OLD_DEFAULT_CENTER],
      });
    })();
  }

  return schemaPromise;
}
