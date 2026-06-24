import { turso } from '@/lib/turso';

let schemaPromise: Promise<void> | null = null;

export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await turso.batch([
        `DROP TABLE IF EXISTS users`,
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
    })();
  }

  return schemaPromise;
}