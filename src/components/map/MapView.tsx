'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TIANDITU_LAYERS, TIANDITU_SUBDOMAINS, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/constants';
import { Annotation, DrawMode, AnnotationType, PointStyle, LineStyle, PolygonStyle, PRESET_COLORS, PRESET_ICONS } from '@/lib/types';

// 修复 Leaflet 默认图标问题
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// 修复 #3: 白名单验证，防止 XSS
const ALLOWED_ICONS = new Set(PRESET_ICONS.map((i) => i.value));
const ALLOWED_COLORS = new Set(PRESET_COLORS.map((c) => c.value));
function sanitizeColor(color: string): string {
  // 只允许十六进制颜色
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  // 也允许预设颜色名
  if (ALLOWED_COLORS.has(color)) return color;
  return '#EF4444'; // 默认红色
}
function sanitizeIcon(icon: string): string {
  return ALLOWED_ICONS.has(icon) ? icon : 'map-pin';
}
function sanitizeSize(size: number): number {
  return Math.max(1, Math.min(5, Math.round(size)));
}

interface MapViewProps {
  annotations: Annotation[];
  onMapClick?: (latlng: L.LatLng) => void;
  onMapDrawComplete?: (type: AnnotationType, latlngs: L.LatLng[]) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationMove?: (annotation: Annotation, newLatLng: L.LatLng) => void;
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  selectedAnnotation?: Annotation | null;
  editingAnnotation?: Annotation | null;
}

export default function MapView({
  annotations,
  onMapClick,
  onMapDrawComplete,
  onAnnotationClick,
  onAnnotationMove,
  drawMode,
  onDrawModeChange,
  selectedAnnotation,
  editingAnnotation,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const annotationsLayerRef = useRef<L.LayerGroup | null>(null);
  const tempPointsRef = useRef<L.LatLng[]>([]);
  const tempLineRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'vec' | 'img'>('vec');

  // 修复 #17: 保留图层引用，切换时复用而非销毁重建
  const vecLayersRef = useRef<L.TileLayer[]>([]);
  const imgLayersRef = useRef<L.TileLayer[]>([]);

  // 初始化地图
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    // 添加缩放控件到右下角
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 修复 #17: 预创建所有图层，切换时只 add/remove
    const vecLayer = L.tileLayer(TIANDITU_LAYERS.vec, { subdomains: TIANDITU_SUBDOMAINS, maxZoom: 18 });
    const cvaLayer = L.tileLayer(TIANDITU_LAYERS.cva, { subdomains: TIANDITU_SUBDOMAINS, maxZoom: 18 });
    const imgLayer = L.tileLayer(TIANDITU_LAYERS.img, { subdomains: TIANDITU_SUBDOMAINS, maxZoom: 18 });
    const ciaLayer = L.tileLayer(TIANDITU_LAYERS.cia, { subdomains: TIANDITU_SUBDOMAINS, maxZoom: 18 });

    vecLayersRef.current = [vecLayer, cvaLayer];
    imgLayersRef.current = [imgLayer, ciaLayer];

    // 默认显示矢量
    vecLayer.addTo(map);
    cvaLayer.addTo(map);

    // 图层组
    const annotationsLayer = L.layerGroup().addTo(map);
    const drawLayer = L.layerGroup().addTo(map);

    annotationsLayerRef.current = annotationsLayer;
    drawLayerRef.current = drawLayer;

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 修复 #17: 地图类型切换 — 复用已有图层，只做 add/remove
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (mapType === 'vec') {
      // 移除影像图层，添加矢量图层
      imgLayersRef.current.forEach((l) => { if (map.hasLayer(l)) map.removeLayer(l); });
      vecLayersRef.current.forEach((l) => { if (!map.hasLayer(l)) l.addTo(map); });
    } else {
      // 移除矢量图层，添加影像图层
      vecLayersRef.current.forEach((l) => { if (map.hasLayer(l)) map.removeLayer(l); });
      imgLayersRef.current.forEach((l) => { if (!map.hasLayer(l)) l.addTo(map); });
    }
  }, [mapType]);

  // 渲染标注
  useEffect(() => {
    if (!annotationsLayerRef.current || !mapReady) return;
    const layer = annotationsLayerRef.current;

    // 记录当前已有的 marker（避免拖拽中被重建）
    const existingLayers = new Map<string, L.Layer>();
    layer.eachLayer((l) => {
      const anno = (l as L.Layer & { _annotationId?: string })._annotationId;
      if (anno) existingLayers.set(anno, l);
    });

    // 当前标注 ID 集合
    const currentIds = new Set(annotations.map((a) => a.id));

    // 移除已不存在的标注
    existingLayers.forEach((l, annoId) => {
      if (!currentIds.has(annoId)) {
        layer.removeLayer(l);
      }
    });

    // 添加或更新标注
    annotations.forEach((annotation) => {
      // 如果标注已存在且位置没变（非拖拽导致），跳过重建
      const existing = existingLayers.get(annotation.id);
      if (existing) {
        // 更新选中高亮
        if (existing instanceof L.Polyline) {
          const isSelected = selectedAnnotation?.id === annotation.id;
          (existing as L.Polyline).setStyle({
            weight: isSelected ? 4 : 3,
            opacity: isSelected ? 1 : 0.8,
          });
        }
        return; // 跳过重建，保留拖拽状态
      }

      let leafletLayer: L.Layer & { _annotationId?: string };

      if (annotation.type === 'point') {
        const geom = annotation.geometry as { type: string; coordinates: [number, number] };
        const style = annotation.style as PointStyle;
        const icon = createCustomIcon(style);
        const isDraggable = drawMode === 'none';
        leafletLayer = L.marker([geom.coordinates[1], geom.coordinates[0]], { icon, draggable: isDraggable });

        if (isDraggable) {
          (leafletLayer as L.Marker).on('dragend', (e: L.DragEndEvent) => {
            const marker = e.target as L.Marker;
            const newPos = marker.getLatLng();
            onAnnotationMove?.(annotation, newPos);
          });
        }
      } else if (annotation.type === 'line') {
        const geom = annotation.geometry as { type: string; coordinates: [number, number][] };
        const style = annotation.style as LineStyle;
        const isSelected = selectedAnnotation?.id === annotation.id;
        leafletLayer = L.polyline(
          geom.coordinates.map(([lng, lat]) => [lat, lng]),
          { color: style.color, weight: isSelected ? 4 : style.width, dashArray: style.dashArray, opacity: isSelected ? 1 : 0.8 }
        );
      } else {
        const geom = annotation.geometry as { type: string; coordinates: [number, number][] };
        const style = annotation.style as PolygonStyle;
        const isSelected = selectedAnnotation?.id === annotation.id;
        leafletLayer = L.polygon(
          geom.coordinates.map(([lng, lat]) => [lat, lng]),
          { color: style.color, fillColor: style.fillColor, fillOpacity: style.fillOpacity, weight: isSelected ? 4 : style.width }
        );
      }

      leafletLayer._annotationId = annotation.id;

      // 点击事件
      leafletLayer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onAnnotationClick?.(annotation);
      });

      layer.addLayer(leafletLayer);
    });
  }, [annotations, mapReady, selectedAnnotation, onAnnotationClick, onAnnotationMove, drawMode]);

  // 绘制模式下的地图交互
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (drawMode === 'none') return;

      if (drawMode === 'point') {
        onMapClick?.(e.latlng);
        return;
      }

      // 线/面绘制
      tempPointsRef.current.push(e.latlng);
      updateTempDrawing();
    };

    const handleDblClick = (e: L.LeafletMouseEvent) => {
      if (drawMode !== 'line' && drawMode !== 'polygon') return;
      L.DomEvent.stopPropagation(e as unknown as Event);
      L.DomEvent.preventDefault(e as unknown as Event);

      const points = tempPointsRef.current;
      if (drawMode === 'line' && points.length >= 2) {
        onMapDrawComplete?.('line', points);
      } else if (drawMode === 'polygon' && points.length >= 3) {
        onMapDrawComplete?.('polygon', points);
      }

      // 清理临时绘制
      cleanupTempDrawing();
      onDrawModeChange('none');
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if ((drawMode === 'line' || drawMode === 'polygon') && tempPointsRef.current.length > 0) {
        updateTempDrawing(e.latlng);
      }
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);
    map.on('mousemove', handleMouseMove);

    // 绘制模式下禁用双击缩放
    if (drawMode !== 'none') {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }

    // 更新光标
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = drawMode !== 'none' ? 'crosshair' : '';
    }

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [drawMode, onMapClick, onMapDrawComplete, onDrawModeChange]);

  // 更新临时绘制
  const updateTempDrawing = (mouseLatLng?: L.LatLng) => {
    if (!drawLayerRef.current) return;
    drawLayerRef.current.clearLayers();

    const points = tempPointsRef.current;
    if (points.length === 0) return;

    // 绘制已点击的点
    points.forEach((p) => {
      L.circleMarker(p, {
        radius: 4,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 1,
        weight: 2,
      }).addTo(drawLayerRef.current!);
    });

    // 绘制连线
    if (points.length > 1 || mouseLatLng) {
      const linePoints = [...points];
      if (mouseLatLng) linePoints.push(mouseLatLng);
      if (drawMode === 'polygon' && linePoints.length > 2) {
        linePoints.push(linePoints[0]); // 闭合
      }
      L.polyline(linePoints, {
        color: '#3B82F6',
        weight: 2,
        dashArray: '6, 6',
      }).addTo(drawLayerRef.current!);
    }
  };

  // 清理临时绘制
  const cleanupTempDrawing = () => {
    tempPointsRef.current = [];
    drawLayerRef.current?.clearLayers();
  };

  // ESC 取消绘制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawMode !== 'none') {
        cleanupTempDrawing();
        onDrawModeChange('none');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawMode, onDrawModeChange]);

  // 创建自定义图标（修复 #3: 移除内联事件，使用 CSS :hover 替代）
  const createCustomIcon = (style: PointStyle): L.DivIcon => {
    const safeIcon = sanitizeIcon(style.icon);
    const safeColor = sanitizeColor(style.color);
    const safeSize = sanitizeSize(style.size || 3);
    const iconData = PRESET_ICONS.find((i) => i.value === safeIcon) || PRESET_ICONS[0];
    const size = safeSize * 8 + 16; // 24-56px

    // 修复 #3: 移除 onmouseover/onmouseout 内联事件，用 CSS :hover 实现
    return L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-icon" style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${safeColor};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: ${size * 0.4}px;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        ${getIconSvg(iconData.value, size * 0.4)}
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 修复 #3: CSS :hover 替代内联事件 */}
      <style jsx global>{`
        .marker-icon:hover {
          transform: scale(1.2) !important;
        }
      `}</style>

      {/* 地图类型切换 */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => setMapType('vec')}
          className={`px-3 py-2 text-xs font-medium transition ${
            mapType === 'vec' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          矢量
        </button>
        <button
          onClick={() => setMapType('img')}
          className={`px-3 py-2 text-xs font-medium transition ${
            mapType === 'img' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          卫星
        </button>
      </div>

      {/* 绘制模式提示 */}
      {drawMode !== 'none' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
          <span>
            {drawMode === 'point' && '点击地图放置标注点'}
            {drawMode === 'line' && '依次点击添加折线顶点，双击结束'}
            {drawMode === 'polygon' && '依次点击添加多边形顶点，双击结束'}
          </span>
          <button
            onClick={() => {
              cleanupTempDrawing();
              onDrawModeChange('none');
            }}
            className="ml-2 hover:bg-blue-700 rounded px-2 py-0.5 text-xs"
          >
            取消 (Esc)
          </button>
        </div>
      )}
    </div>
  );
}

// 简单 SVG 图标生成
function getIconSvg(iconName: string, size: number): string {
  const icons: Record<string, string> = {
    'map-pin': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`,
    'circle': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><circle cx="12" cy="12" r="10"/></svg>`,
    'star': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    'heart': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    'flag': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2"/></svg>`,
    'home': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22" fill="white" stroke="white" stroke-width="1"/></svg>`,
    'store': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="M3 9l1-4h16l1 4"/><path d="M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9"/><path d="M9 21V13h6v8" fill="white"/></svg>`,
    'school': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="M2 10l10-7 10 7"/><path d="M4 10v10h16V10"/><path d="M10 20V14h4v6" fill="white"/></svg>`,
    'hospital': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="M3 21h18V3H3v18z"/><path d="M12 8v8M8 12h8" stroke="white" stroke-width="2" fill="none"/></svg>`,
    'utensils': `<svg viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="M18 8h1V4h-1v4zm-7 0V4h-1v4c0 1.1.9 2 2 2v10h1V10c1.1 0 2-.9 2-2V4h-1v4h-1V4h-1v4h-1zm5-4v6c0 1.1.9 2 2 2v9h1V4h-3z"/></svg>`,
  };
  return icons[iconName] || icons['map-pin'];
}
