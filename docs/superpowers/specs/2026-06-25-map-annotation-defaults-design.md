# 地图标注自定义默认名称与字段模板设计

## 概述

新建地图时不再强制预填土地出让相关字段模板（面积、容积率等），改为空模板起步。用户可在编辑器侧边栏为地图配置点/线/面的默认创建名称。

## 目标

- 在不影响默认地图（"我的地图"）的前提下，让新建地图自由定义点/线/面名称
- 新建地图不再预填土地出让字段，从空模板开始
- 改动最小，不引入冗余功能

## 改动范围

### 1. 数据层

#### 新增 `MapSettings` 类型（`src/lib/types.ts`）

```typescript
export interface MapSettings {
  defaultNames: {
    point: string;   // 创建点时默认名称
    line: string;    // 创建线时默认名称
    polygon: string; // 创建面时默认名称
  };
}
```

`MapProject` 增加 `settings` 字段，类型为 `MapSettings`，默认值：

```typescript
settings: { defaultNames: { point: '', line: '', polygon: '' } }
```

#### 数据库变更（`src/lib/server/schema.ts`）

在 `maps` 表增加 `settings` TEXT 列，使用已有 try-catch 迁移模式：

```typescript
try {
  await turso.execute("ALTER TABLE maps ADD COLUMN settings TEXT NOT NULL DEFAULT '{}'");
} catch { /* 列已存在，忽略 */ }
```

#### `createMap` 默认行为变更（`src/lib/server/maps.ts`）

- `createMap()` 的 `fieldTemplates` 参数默认值从 `DEFAULT_LAND_FIELD_TEMPLATES` 改为 `[]`
- `rowToMapProject()` 增加 `settings` JSON 解析
- `updateMap()` 支持更新 `settings` 字段

**注意：** `getOrCreateDefaultMap()` 维持现有行为不变，默认地图仍使用 `DEFAULT_LAND_FIELD_TEMPLATES`。

### 2. API 层

#### `PUT /api/maps/[id]`（`src/app/api/maps/[id]/route.ts`）

增加 `settings` 支持：

```typescript
const updates: { ...; settings?: MapSettings } = {};
if (body.settings) updates.settings = body.settings;
```

### 3. UI 层

#### `AdminEditor.tsx`

**a) 侧边栏新增「标注默认名称」配置面板**

位于字段模板管理器附近，包含三个输入框：
- 点标注默认名称
- 线标注默认名称
- 面标注默认名称

修改后点击「保存」按钮，调用 `PUT /api/maps/[id]` 更新。

**b) 创建标注时使用地图配置**

| 位置 | 当前 | 改为 |
|------|------|------|
| `handleMapClick` (创建点) | `name: ''` | `name: mapProject?.settings.defaultNames.point ?? ''` |
| `handleDrawComplete` (创建线) | `name: '新线路'` | `name: mapProject?.settings.defaultNames.line ?? '新线路'` |
| `handleDrawComplete` (创建面) | `name: '新区域'` | `name: mapProject?.settings.defaultNames.polygon ?? '新区域'` |

保留硬编码兜底以兼容已有地图（无 `settings` 字段时 fallback）。

### 4. 不受影响的部分

- `src/lib/constants.ts` — `DEFAULT_LAND_FIELD_TEMPLATES` 保留，默认地图继续使用
- `src/app/admin/AdminDashboard.tsx` — 创建弹窗不变
- `src/components/map/FieldTemplateManager.tsx` — 无需改动，编辑器内仍然可用
- 默认地图的所有行为不变

## 数据流

```
用户修改默认名称
  → AdminEditor 侧边栏
  → PUT /api/maps/[id] { settings: { defaultNames: {...} } }
  → updateMap() 更新 maps.settings
  → 下次加载地图时 rowToMapProject() 解析 settings

用户创建标注
  → handleMapClick / handleDrawComplete
  → 读取 mapProject.settings.defaultNames
  → 填入 annotation.name
  → 保存到数据库
```

## 向后兼容

- 已有地图没有 `settings` 列，迁移后初始值为 `'{}'`
- `rowToMapProject` 解析时，`settings` 为空对象时使用默认值 `{ defaultNames: { point: '', line: '', polygon: '' } }`
- 创建标注时，如果 settings 中对应名称为空字符串，使用硬编码兜底
- 已有地图已有 `field_templates` 数据不受影响
