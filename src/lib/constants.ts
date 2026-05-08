// 天地图配置
export const TIANDITU_KEY = 'e1d6600951ce0b9692ec71ebc7f03170';

// 天地图瓦片服务 URL 模板
export const TIANDITU_LAYERS = {
  // 矢量底图
  vec: `https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${TIANDITU_KEY}`,
  // 矢量注记
  cva: `https://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${TIANDITU_KEY}`,
  // 卫星影像
  img: `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${TIANDITU_KEY}`,
  // 影像注记
  cia: `https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${TIANDITU_KEY}`,
};

// 默认地图中心和缩放级别（青岛李沧区）
export const DEFAULT_CENTER: [number, number] = [36.16, 120.43];
export const DEFAULT_ZOOM = 13;

// 天地图子域名
export const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

// 土地出让数据默认字段模板（对齐 Excel 表头）
import { FieldTemplate } from './types';

// 稳定的 UUID，确保导入/导出字段映射一致
export const LAND_FIELD_IDS = {
  area: 'f0000001-0001-0001-0001-000000000001',
  far: 'f0000001-0001-0001-0001-000000000002',
  price: 'f0000001-0001-0001-0001-000000000003',
  owner: 'f0000001-0001-0001-0001-000000000004',
  date: 'f0000001-0001-0001-0001-000000000005',
  floorPrice: 'f0000001-0001-0001-0001-000000000006',
  shareholders: 'f0000001-0001-0001-0001-000000000007',
};

export const DEFAULT_LAND_FIELD_TEMPLATES: FieldTemplate[] = [
  { id: LAND_FIELD_IDS.area, name: '面积(㎡)', type: 'number', required: false, sort_order: 0 },
  { id: LAND_FIELD_IDS.far, name: '容积率', type: 'number', required: false, sort_order: 1 },
  { id: LAND_FIELD_IDS.price, name: '成交总价', type: 'number', required: false, sort_order: 2 },
  { id: LAND_FIELD_IDS.owner, name: '土地使用权人', type: 'text', required: false, sort_order: 3 },
  { id: LAND_FIELD_IDS.date, name: '合同签订日期', type: 'date', required: false, sort_order: 4 },
  { id: LAND_FIELD_IDS.floorPrice, name: '楼面地价(元/㎡)', type: 'number', required: false, sort_order: 5 },
  { id: LAND_FIELD_IDS.shareholders, name: '主要股东', type: 'text', required: false, sort_order: 6 },
];
