# 地图标注自定义字段模板设计

## 概述

新建地图时不再强制预填土地出让相关字段模板（面积、容积率等），改为空模板起步。用户在编辑器侧边栏自由定义字段模板，字段名称输入框支持中文输入法。

## 目标

- 在不影响默认地图（"我的地图"）的前提下，让新建地图从空字段模板起步
- 新建地图不再预填土地出让字段，从空模板开始
- 字段名称输入框支持中文输入法
- 改动最小，不引入冗余功能

## 改动范围

### 1. 数据层

`MapProject` 增加 `settings` 字段（`MapSettings`），目前保留供后续扩展使用。

#### `MapSettings` 类型（`src/lib/types.ts`）

```typescript
export interface MapSettings {
  defaultNames: {
    point: string;
    line: string;
    polygon: string;
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

#### AdminEditor.tsx

侧边栏设置面板只保留字段模板管理器（`FieldTemplateManager`）：
- 新建地图的字段模板为空数组
- 用户在面板中点击「自定义字段」展开，可自由添加/编辑/删除字段
- 字段模板修改后自动通过 API 保存

#### FieldTemplateManager.tsx

字段名称输入框使用 uncontrolled 模式以支持中文输入法：
- `defaultValue` 替代 `value`
- `onBlur` 触发保存，而非 `onChange` 实时保存
- 避免 React 受控组件在 IME 输入法组合过程中打断用户输入

#### 标注创建

创建点/线/面时恢复使用原始硬编码名称：
- 点：空字符串（用户后续编辑填写）
- 线：「新线路」
- 面：「新区域」

### 4. 不受影响的部分

- `src/lib/constants.ts` — `DEFAULT_LAND_FIELD_TEMPLATES` 保留，默认地图继续使用
- `src/app/admin/AdminDashboard.tsx` — 创建弹窗不变
- `src/components/map/FieldTemplateManager.tsx` — 无需改动，编辑器内仍然可用
- 默认地图的所有行为不变

## 数据流

```
用户在字段模板编辑器中添加/编辑字段
  → FieldTemplateManager.onChange → handleFieldTemplatesChange
  → PUT /api/map { mapId, templates }
  → updateFieldTemplates() 更新 maps.field_templates
  → setMapProject 更新本地状态
```

## 向后兼容

- 已有地图的 `field_templates` 数据不受影响
- 新建地图的字段模板为空数组，不强制预填土地字段
- 默认地图（"我的地图"）保留 `DEFAULT_LAND_FIELD_TEMPLATES`
- `useMapData` 中的字段同步逻辑仅在加载默认地图时执行
