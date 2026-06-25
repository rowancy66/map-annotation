# 地图标注自定义默认名称与字段模板 - 实现计划

> **For Claude:** Use executing-plans skill to implement this plan task-by-task.

## Overview
新建地图时不再强制预填土地出让字段模板（面积、容积率等），改为空模板起步。用户可在编辑器侧边栏为地图配置点/线/面的默认创建名称。默认地图不受影响。

## Prerequisites
- [ ] 项目代码在本地可运行
- [ ] Turso 数据库已连接

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Tasks

### Task 1: 新增 MapSettings 类型，更新 MapProject
**File:** `src/lib/types.ts`

在 `CustomFieldValue` 接口之后添加：

```typescript
// ===== 地图设置 =====
export interface MapSettings {
  defaultNames: {
    point: string;
    line: string;
    polygon: string;
  };
}
```

在 `MapProject` 接口中增加 `settings` 字段：

```typescript
export interface MapProject {
  id: string;
  user_id: string;
  name: string;
  description: string;
  center: [number, number];
  zoom: number;
  field_templates: FieldTemplate[];
  settings: MapSettings;   // ← 新增
  created_at: string;
  updated_at: string;
}
```

#### Verification
```bash
grep -n "MapSettings" src/lib/types.ts
# Expected: 2 matches (interface + usage in MapProject)
```

---

### Task 2: 数据库迁移 — 添加 settings 列
**File:** `src/lib/server/schema.ts`

在 `ensureSchema()` 函数末尾的迁移区域（`group_id` 迁移之后）添加：

```typescript
// 为已有 maps 表迁移 settings 列
try {
  await turso.execute("ALTER TABLE maps ADD COLUMN settings TEXT NOT NULL DEFAULT '{}'");
} catch {
  // 列已存在，忽略
}
```

---

### Task 3: 更新服务端逻辑
**File:** `src/lib/server/maps.ts`

**a) 在 imports 中移除对 DEFAULT_LAND_FIELD_TEMPLATES 的依赖（createMap 不再使用它）**

文件顶部加导入 `MapSettings`：
```typescript
import { Annotation, FieldTemplate, MapProject, MapSettings } from '@/lib/types';
```

**b) 更新 `rowToMapProject`** — 增加 settings 解析：
```typescript
function rowToMapProject(row: Record<string, unknown>): MapProject {
  const rawSettings = row.settings ? JSON.parse(String(row.settings)) : {};
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name || ''),
    description: String(row.description || ''),
    center: JSON.parse(String(row.center || '[120.43,36.16]')),
    zoom: Number(row.zoom || 13),
    field_templates: JSON.parse(String(row.field_templates || '[]')),
    settings: {
      defaultNames: {
        point: rawSettings?.defaultNames?.point ?? '',
        line: rawSettings?.defaultNames?.line ?? '',
        polygon: rawSettings?.defaultNames?.polygon ?? '',
      },
    },
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
```

**c) 更新 `createMap`** — 默认不再预填土地字段，同时支持传入 settings：
```typescript
export async function createMap(
  name: string,
  description: string,
  fieldTemplates?: FieldTemplate[],
  settings?: MapSettings,
) {
  await ensureSchema();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const templates = fieldTemplates || [];
  const mapSettings = settings || { defaultNames: { point: '', line: '', polygon: '' } };
  await turso.execute({
    sql: `INSERT INTO maps (id, user_id, name, description, center, zoom, field_templates, settings, created_at, updated_at)
          VALUES (?, 'admin', ?, ?, ?, 13, ?, ?, ?, ?)`,
    args: [id, name, description, stringifyJson([120.43, 36.16]), stringifyJson(templates), stringifyJson(mapSettings), now, now],
  });
  return getMapById(id);
}
```

**d) 更新 `updateMap`** — 支持更新 settings：
```typescript
export async function updateMap(mapId: string, updates: {
  name?: string;
  description?: string;
  center?: [number, number];
  zoom?: number;
  settings?: MapSettings;
}) {
  await ensureSchema();
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const args: (string | number | null)[] = [now];
  if (updates.name !== undefined) { sets.push('name = ?'); args.push(updates.name); }
  if (updates.description !== undefined) { sets.push('description = ?'); args.push(updates.description); }
  if (updates.center !== undefined) { sets.push('center = ?'); args.push(stringifyJson(updates.center)); }
  if (updates.zoom !== undefined) { sets.push('zoom = ?'); args.push(updates.zoom); }
  if (updates.settings !== undefined) { sets.push('settings = ?'); args.push(stringifyJson(updates.settings)); }
  args.push(mapId);
  await turso.execute({ sql: `UPDATE maps SET ${sets.join(', ')} WHERE id = ?`, args });
}
```

不修改 `getOrCreateDefaultMap()` — 默认地图继续使用 `DEFAULT_LAND_FIELD_TEMPLATES`。

---

### Task 4: 更新 API PUT 路由
**File:** `src/app/api/maps/[id]/route.ts`

导入 `MapSettings`：
```typescript
import { MapSettings } from '@/lib/types';
```

修改 PUT handler 中的 `updates` 类型和赋值：
```typescript
const updates: {
  name?: string;
  description?: string;
  center?: [number, number];
  zoom?: number;
  settings?: MapSettings;
} = {};
if (typeof body.name === 'string') updates.name = body.name.trim();
if (typeof body.description === 'string') updates.description = body.description.trim();
if (Array.isArray(body.center)) updates.center = body.center;
if (typeof body.zoom === 'number') updates.zoom = body.zoom;
if (body.settings && typeof body.settings === 'object') updates.settings = body.settings;
```

---

### Task 5: 在 useMapData hook 中增加 updateMapSettings
**File:** `src/hooks/useMapData.ts`

在 `updateFieldTemplates` 之后添加：

```typescript
const updateMapSettings = useCallback(async (settings: MapSettings, mapId: string): Promise<{ error: string | null }> => {
  if (!requireAdmin('更新地图设置')) return { error: '需要登录' };

  try {
    await apiSend(`/api/maps/${mapId}`, 'PUT', { settings });
    return { error: null };
  } catch (error) {
    console.error('更新地图设置失败:', error);
    return { error: error instanceof Error ? error.message : '更新地图设置失败' };
  }
}, [requireAdmin]);
```

需要添加 `MapSettings` 导入：
```typescript
import { MapProject, Annotation, FieldTemplate, Group, MapSettings } from '@/lib/types';
```

在 return 对象中添加 `updateMapSettings`。

---

### Task 6: AdminEditor — 添加默认名称配置 UI
**File:** `src/app/admin/AdminEditor.tsx`

**a) 在 imports 中增加 `MapSettings`：**
```typescript
import {
  Annotation,
  DrawMode,
  AnnotationType,
  FieldTemplate,
  MapSettings,   // ← 新增
} from '@/lib/types';
```

**b) 解构 `updateMapSettings`：**
```typescript
const {
  mapProject,
  setMapProject,
  ...
  updateMapSettings,   // ← 新增
} = useMapData(true, mapId);
```

**c) 新增 `handleDefaultNamesChange` 回调（放在 `handleFieldTemplatesChange` 附近）：**
```typescript
const handleDefaultNamesChange = useCallback(async (defaultNames: MapSettings['defaultNames']) => {
  if (!mapProject) return;
  const settings: MapSettings = {
    defaultNames,
  };
  const { error } = await updateMapSettings(settings, mapProject.id);
  if (error) {
    alert(`更新默认名称失败: ${error}`);
    return;
  }
  setMapProject({ ...mapProject, settings });
  showFeedback('默认名称已保存');
}, [mapProject, updateMapSettings, setMapProject]);
```

**d) 在设置面板中，FieldTemplateManager 上方添加默认名称配置区：**
替换现有的 `{showSettings && mapProject && (` 块：

```tsx
{showSettings && mapProject && (
  <div className="border-t border-gray-100 space-y-2">
    {/* 标注默认名称 */}
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">标注默认名称</span>
      </div>
      <div className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 items-center">
          <label className="text-xs text-gray-500">点标注</label>
          <input
            type="text"
            value={mapProject.settings?.defaultNames?.point ?? ''}
            onChange={(e) => setDefaultNames((prev) => ({ ...prev, point: e.target.value }))}
            placeholder="留空则不填"
            className="col-span-2 px-2 py-1.5 border rounded text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 items-center">
          <label className="text-xs text-gray-500">线标注</label>
          <input
            type="text"
            value={mapProject.settings?.defaultNames?.line ?? ''}
            onChange={(e) => setDefaultNames((prev) => ({ ...prev, line: e.target.value }))}
            placeholder="留空则不填"
            className="col-span-2 px-2 py-1.5 border rounded text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 items-center">
          <label className="text-xs text-gray-500">面标注</label>
          <input
            type="text"
            value={mapProject.settings?.defaultNames?.polygon ?? ''}
            onChange={(e) => setDefaultNames((prev) => ({ ...prev, polygon: e.target.value }))}
            placeholder="留空则不填"
            className="col-span-2 px-2 py-1.5 border rounded text-sm"
          />
        </div>
        <button
          onClick={() => handleDefaultNamesChange(defaultNames)}
          className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          保存默认名称
        </button>
      </div>
    </div>

    <FieldTemplateManager
      templates={mapProject.field_templates}
      onChange={handleFieldTemplatesChange}
    />
  </div>
)}
```

**e) 在组件中添加 `defaultNames` state（在组件函数体顶部）：**
```typescript
const [defaultNames, setDefaultNames] = useState<MapSettings['defaultNames']>({
  point: '',
  line: '',
  polygon: '',
});
```

并在 `loadData` 或 `mapProject` 变化时同步：
找到 loadData 被调用的地方（或在 mapProject 变化的 effect 中），添加：

```typescript
// 在 mapProject 变化时同步 defaultNames
useEffect(() => {
  if (mapProject?.settings?.defaultNames) {
    setDefaultNames(mapProject.settings.defaultNames);
  }
}, [mapProject?.settings?.defaultNames]);
```

---

### Task 7: AdminEditor — 创建标注时使用地图配置
**File:** `src/app/admin/AdminEditor.tsx`

**a) 修改 `handleMapClick`（创建点）：**
将 `name: ''` 改为：
```typescript
name: mapProject?.settings?.defaultNames?.point ?? '',
```

**b) 修改 `handleDrawComplete`（创建线）：**
将 `name: '新线路'` 改为：
```typescript
name: mapProject?.settings?.defaultNames?.line || '新线路',
```

**c) 修改 `handleDrawComplete`（创建面）：**
将 `name: '新区域'` 改为：
```typescript
name: mapProject?.settings?.defaultNames?.polygon || '新区域',
```

---

### Task 8: 更新 useMapData 的数据同步逻辑（默认地图不强制土地字段）
**File:** `src/hooks/useMapData.ts`

当前逻辑（第 35-66 行）在字段模板为空时强制回退到 `DEFAULT_LAND_FIELD_TEMPLATES`。这会影响新建地图 — 因为新建地图现在字段模板为空。

修改第 54-57 行，仅在**默认地图**（无 mapId 时加载的地图）才强制回退：

```typescript
// 只有默认地图（没有指定 mapId）才强制填充默认模板
if (merged.length === 0 && !mapId) {
  merged = DEFAULT_LAND_FIELD_TEMPLATES;
  changed = true;
}
```

---

## Integration Tests

```bash
# TypeScript 编译检查
npx tsc --noEmit

# 构建
npm run build
```

## Manual Verification

1. 创建新地图 → 进入编辑器 → 点开侧边栏设置
2. 确认「标注默认名称」配置区可见，点/线/面三个输入框默认空
3. 填写默认名称并保存 → 提示「默认名称已保存」
4. 在地图上创建点/线/面 → 确认名称使用了刚设置的默认值
5. 刷新页面 → 确认默认名称持久化
6. 打开默认地图（"我的地图"）→ 确认字段模板仍然是土地出让字段，不受影响
7. 在默认地图创建点/线/面 → 确认使用硬编码兜底（点：空，线：新线路，面：新区域）

## Rollback Plan
1. `git revert HEAD` 撤销最后一次 commit
2. 如果已经迁移了数据：运行 `ALTER TABLE maps DROP COLUMN settings;`
