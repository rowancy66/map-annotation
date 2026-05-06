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

// 默认地图中心和缩放级别（北京）
export const DEFAULT_CENTER: [number, number] = [39.9042, 116.4074];
export const DEFAULT_ZOOM = 12;

// 天地图子域名
export const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];
