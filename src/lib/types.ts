// TypeScript 类型定义

// ===== 标注类型 =====
export type AnnotationType = 'point' | 'line' | 'polygon';

// ===== 几何数据 =====
export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface LineGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [[lng, lat], ...]
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][]; // [[lng, lat], ...] 闭合
}

export type Geometry = PointGeometry | LineGeometry | PolygonGeometry;

// ===== 样式 =====
export interface PointStyle {
  color: string;       // 颜色
  icon: string;        // 图标名称
  size: number;        // 大小 (1-5)
}

export interface LineStyle {
  color: string;       // 线颜色
  width: number;       // 线宽 (1-10)
  dashArray?: string;  // 虚线样式
}

export interface PolygonStyle {
  color: string;       // 边框颜色
  fillColor: string;   // 填充颜色
  fillOpacity: number; // 填充透明度 (0-1)
  width: number;       // 边框宽度
}

export type AnnotationStyle = PointStyle | LineStyle | PolygonStyle;

// ===== 自定义字段 =====
export type FieldType = 'text' | 'number' | 'date' | 'select';

export interface FieldTemplate {
  id: string;
  name: string;
  type: FieldType;
  options?: string[];    // select 类型的选项
  required: boolean;
  sort_order: number;
}

export interface CustomFieldValue {
  fieldId: string;
  value: string | number | null;
}

// ===== 分组 =====
export interface Group {
  id: string;
  map_id: string;
  name: string;
  parent_id: string | null;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ===== 标注 =====
export interface Annotation {
  id: string;
  map_id: string;
  group_id?: string;
  type: AnnotationType;
  geometry: Geometry;
  name: string;
  description: string;
  style: AnnotationStyle;
  custom_fields: CustomFieldValue[];
  created_at: string;
  updated_at: string;
}

// ===== 地图设置 =====
export interface MapSettings {
  defaultNames: {
    point: string;
    line: string;
    polygon: string;
  };
}

// ===== 地图 =====
export interface MapProject {
  id: string;
  user_id: string;
  name: string;
  description: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  field_templates: FieldTemplate[];
  settings: MapSettings;
  created_at: string;
  updated_at: string;
}

// ===== 标注统计数据 =====
export interface AnnotationCounts {
  point: number;
  line: number;
  polygon: number;
}

// ===== 绘制模式 =====
export type DrawMode = 'none' | 'point' | 'line' | 'polygon';

// ===== 预设样式 =====
export const PRESET_COLORS = [
  { name: '红色', value: '#EF4444' },
  { name: '橙色', value: '#F97316' },
  { name: '黄色', value: '#EAB308' },
  { name: '绿色', value: '#22C55E' },
  { name: '蓝色', value: '#3B82F6' },
  { name: '紫色', value: '#8B5CF6' },
  { name: '粉色', value: '#EC4899' },
  { name: '青色', value: '#06B6D4' },
  { name: '白色', value: '#FFFFFF' },
  { name: '黑色', value: '#000000' },
];

export const PRESET_ICONS = [
  { name: '图钉', value: 'map-pin' },
  { name: '圆点', value: 'circle' },
  { name: '星星', value: 'star' },
  { name: '心形', value: 'heart' },
  { name: '旗帜', value: 'flag' },
  { name: '房屋', value: 'home' },
  { name: '商店', value: 'store' },
  { name: '学校', value: 'school' },
  { name: '医院', value: 'hospital' },
  { name: '餐饮', value: 'utensils' },
];

// ===== 导入相关 =====
export interface ImportColumn {
  index: number;
  header: string;
  mappedField: string | null; // 映射到哪个字段
  sampleValues: string[];
}

export interface ImportPreview {
  columns: ImportColumn[];
  rows: Record<string, string>[];
  totalRows: number;
  latColumn: string | null;
  lngColumn: string | null;
}

// ===== 导入相关 =====
