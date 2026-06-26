'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { TIANDITU_LAYERS, TIANDITU_SUBDOMAINS, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/constants';
import { Annotation, DrawMode, AnnotationType, PointStyle, LineStyle, PolygonStyle, TextStyle, PRESET_COLORS, PRESET_ICONS, Group } from '@/lib/types';
import SearchBox from './SearchBox';

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

const ALLOWED_ICONS = new Set(PRESET_ICONS.map((i) => i.value));
const ALLOWED_COLORS = new Set(PRESET_COLORS.map((c) => c.value));
function sanitizeColor(color: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  if (ALLOWED_COLORS.has(color)) return color;
  return '#EF4444';
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
  onAnnotationDelete?: (annotation: Annotation) => void;
  onAnnotationEdit?: (annotation: Annotation) => void;
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  selectedAnnotation?: Annotation | null;
  editingAnnotation?: Annotation | null;
  editable?: boolean;
  groups?: Group[];
  onAnnotationMoveToGroup?: (annotationId: string, groupId: string | null) => void;
  showHeatmap?: boolean;
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
  editable = true,
  groups,
  onAnnotationDelete,
  onAnnotationEdit,
  onAnnotationMoveToGroup,
  showHeatmap = false,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const annotationsLayerRef = useRef<L.LayerGroup | null>(null);
  const tempPointsRef = useRef<L.LatLng[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [mapType, setMapType] = useState<'vec' | 'img' | 'terrain'>('vec');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    annotation: Annotation;
    marker: L.Marker;
  } | null>(null);
  const [measureDistance, setMeasureDistance] = useState<number>(0);
  const [showTextInput, setShowTextInput] = useState<L.LatLng | null>(null);
  const [textValue, setTextValue] = useState('');
  const heatLayerRef = useRef<L.Layer | null>(null);

  const vecLayersRef = useRef<L.TileLayer[]>([]);
  const imgLayersRef = useRef<L.TileLayer[]>([]);
  const terrainLayersRef = useRef<L.TileLayer[]>([]);

  const annotationsRef = useRef<Annotation[]>(annotations);
  const onAnnotationMoveRef = useRef(onAnnotationMove);
  const onAnnotationClickRef = useRef(onAnnotationClick);
  const onAnnotationDeleteRef = useRef(onAnnotationDelete);
  const onAnnotationMoveToGroupRef = useRef(onAnnotationMoveToGroup);

  const pendingMoveRef = useRef<{
    marker: L.Marker;
    annotationId: string;
    isDragging: boolean;
  } | null>(null);

  const lastClickTimeRef = useRef(0);

  const createCustomIcon = useCallback((style: PointStyle, highlighted = false): L.DivIcon => {
    const safeIcon = sanitizeIcon(style.icon);
    const safeColor = sanitizeColor(style.color);
    const safeSize = sanitizeSize(style.size || 2);
    const iconData = PRESET_ICONS.find((i) => i.value === safeIcon) || PRESET_ICONS[0];
    const baseSize = safeSize * 3 + 8;
    const size = highlighted ? Math.round(baseSize * 1.35) : baseSize;

    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
        ${highlighted ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:3px solid ${safeColor};opacity:0.5;animation:markerPulse 1.2s ease-in-out infinite"></div>` : ''}
        <div class="marker-icon" style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${safeColor};
          border-radius: 50%;
          border: ${highlighted ? '3px solid #fff' : '2px solid white'};
          box-shadow: ${highlighted ? '0 0 12px rgba(59,130,246,0.6)' : '0 1px 4px rgba(0,0,0,0.3)'};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: ${size * 0.4}px;
          cursor: pointer;
          position:relative;
          z-index:1;
        ">
          ${getIconSvg(iconData.value, size * 0.4)}
        </div>
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  }, []);

  const cleanupTempDrawing = useCallback(() => {
    tempPointsRef.current = [];
    drawLayerRef.current?.clearLayers();
  }, []);

  const updateTempDrawing = useCallback((mouseLatLng?: L.LatLng) => {
    if (!drawLayerRef.current) return;
    drawLayerRef.current.clearLayers();

    const points = tempPointsRef.current;
    if (points.length === 0) return;

    points.forEach((p) => {
      L.circleMarker(p, {
        radius: 4,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 1,
        weight: 2,
      }).addTo(drawLayerRef.current!);
    });

    if (points.length > 1 || mouseLatLng) {
      const linePoints = [...points];
      if (mouseLatLng) linePoints.push(mouseLatLng);
      if (drawMode === 'polygon' && linePoints.length > 2) {
        linePoints.push(linePoints[0]);
      }
      L.polyline(linePoints, {
        color: '#3B82F6',
        weight: 2,
        dashArray: '6, 6',
      }).addTo(drawLayerRef.current!);
    }
  }, [drawMode]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    onAnnotationMoveRef.current = onAnnotationMove;
  }, [onAnnotationMove]);

  useEffect(() => {
    onAnnotationClickRef.current = onAnnotationClick;
  }, [onAnnotationClick]);

  useEffect(() => {
    onAnnotationDeleteRef.current = onAnnotationDelete;
  }, [onAnnotationDelete]);

  useEffect(() => {
    onAnnotationMoveToGroupRef.current = onAnnotationMoveToGroup;
  }, [onAnnotationMoveToGroup]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const vecLayer = L.tileLayer(TIANDITU_LAYERS.vec, { subdomains: TIANDITU_SUBDOMAINS, maxZoom: 18 });
    const cvaLayer = L.tileLayer(TIANDITU_LAYERS.cva, { subdomains: TIANDITU_SUBDOMAINS, maxZoom: 18 });
    const imgLayer = L.tileLayer(TIANDITU_LAYERS.img, { subdomains: TIANDITU_SUBDOMAINS, maxZoom: 18 });
    const ciaLayer = L.tileLayer(TIANDITU_LAYERS.cia, { subdomains: TIANDITU_SUBDOMAINS, maxZoom: 18 });
    const terLayer = L.tileLayer(TIANDITU_LAYERS.ter, { subdomains: TIANDITU_SUBDOMAINS, maxZoom: 18 });

    vecLayersRef.current = [vecLayer, cvaLayer];
    imgLayersRef.current = [imgLayer, ciaLayer];
    terrainLayersRef.current = [terLayer];

    vecLayer.addTo(map);
    cvaLayer.addTo(map);

    const annotationsLayer = L.layerGroup().addTo(map);
    const drawLayer = L.layerGroup().addTo(map);

    annotationsLayerRef.current = annotationsLayer;
    drawLayerRef.current = drawLayer;

    mapRef.current = map;
    setMapInstance(map);
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // 清除所有图层
    vecLayersRef.current.forEach((l) => { if (map.hasLayer(l)) map.removeLayer(l); });
    imgLayersRef.current.forEach((l) => { if (map.hasLayer(l)) map.removeLayer(l); });
    terrainLayersRef.current.forEach((l) => { if (map.hasLayer(l)) map.removeLayer(l); });

    // 添加选中图层
    if (mapType === 'vec') {
      vecLayersRef.current.forEach((l) => { if (!map.hasLayer(l)) l.addTo(map); });
    } else if (mapType === 'img') {
      imgLayersRef.current.forEach((l) => { if (!map.hasLayer(l)) l.addTo(map); });
    } else {
      terrainLayersRef.current.forEach((l) => { if (!map.hasLayer(l)) l.addTo(map); });
    }
  }, [mapType]);

  useEffect(() => {
    if (!annotationsLayerRef.current || !mapReady) return;
    const layer = annotationsLayerRef.current;

    const existingLayers = new Map<string, L.Layer>();
    layer.eachLayer((l) => {
      const anno = (l as L.Layer & { _annotationId?: string })._annotationId;
      if (anno) existingLayers.set(anno, l);
    });

    const currentIds = new Set(annotations.map((a) => a.id));

    existingLayers.forEach((l, annoId) => {
      if (!currentIds.has(annoId)) {
        layer.removeLayer(l);
      }
    });

    annotations.forEach((annotation) => {
      const existing = existingLayers.get(annotation.id);
      if (existing) {
        const isSelected = selectedAnnotation?.id === annotation.id;
        if (existing instanceof L.Polyline) {
          (existing as L.Polyline).setStyle({
            weight: isSelected ? 4 : 3,
            opacity: isSelected ? 1 : 0.8,
          });
        } else if (existing instanceof L.Marker && annotation.type === 'point') {
          const style = annotation.style as PointStyle;
          (existing as L.Marker).setIcon(createCustomIcon(style, isSelected));
        }
        return;
      }

      let leafletLayer: L.Layer & { _annotationId?: string };

      if (annotation.type === 'point') {
        const geom = annotation.geometry as { type: string; coordinates: [number, number] };
        const style = annotation.style as PointStyle;
        const isSelected = selectedAnnotation?.id === annotation.id;
        const icon = createCustomIcon(style, isSelected);
        leafletLayer = L.marker([geom.coordinates[1], geom.coordinates[0]], {
          icon,
          draggable: false,
        });

        if (editable) {
          (leafletLayer as L.Marker).on('contextmenu', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            if (drawMode !== 'none') return;

            setContextMenu({
              x: e.originalEvent.clientX,
              y: e.originalEvent.clientY,
              annotation: annotation,
              marker: e.target as L.Marker,
            });
          });
        }

      } else if (annotation.type === 'text') {
        const geom = annotation.geometry as { type: string; coordinates: [number, number] };
        const style = annotation.style as TextStyle;
        const isSelected = selectedAnnotation?.id === annotation.id;
        const textIcon = L.divIcon({
          className: 'custom-text-marker',
          html: `<div style="
            font-size: ${style.fontSize || 16}px;
            color: ${style.color || '#1a4735'};
            font-weight: 600;
            text-shadow: 0 1px 3px rgba(255,255,255,0.8), 0 0 6px rgba(255,255,255,0.6);
            transform: ${style.rotation ? `rotate(${style.rotation}deg)` : 'none'};
            white-space: nowrap;
            cursor: pointer;
            ${isSelected ? 'outline: 2px solid #1a4735; outline-offset: 4px; border-radius: 4px; padding: 0 4px;' : ''}
          ">${annotation.name}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        leafletLayer = L.marker([geom.coordinates[1], geom.coordinates[0]], {
          icon: textIcon,
          draggable: false,
        });
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

      leafletLayer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        const currentAnnotation = annotationsRef.current.find((a) => a.id === annotation.id) || annotation;
        onAnnotationClickRef.current?.(currentAnnotation);
      });

      layer.addLayer(leafletLayer);
    });
  }, [annotations, createCustomIcon, drawMode, editable, mapReady, selectedAnnotation]);

  useEffect(() => {
    if (!mapRef.current || !selectedAnnotation) return;
    const map = mapRef.current;
    const anno = selectedAnnotation;
    const geom = anno.geometry as { type: string; coordinates: [number, number] | [number, number][] };

    if (anno.type === 'point') {
      const [lng, lat] = geom.coordinates;
      map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    } else if (anno.type === 'line') {
      const bounds = L.latLngBounds(geom.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]));
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6 });
    } else if (anno.type === 'polygon') {
      const bounds = L.latLngBounds(geom.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]));
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6 });
    }
  }, [selectedAnnotation]);

  // 热力图
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // 移除旧热力图
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (showHeatmap) {
      const points = annotations
        .filter((a) => a.type === 'point')
        .map((a) => {
          const g = a.geometry as { coordinates: [number, number] };
          return [g.coordinates[1], g.coordinates[0], 0.8] as [number, number, number];
        });

      if (points.length > 0) {
        try {
          // @ts-expect-error leaflet.heat typings are incomplete
          const heat = (L as any).heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.4: '#1a4735', 0.6: '#2d6b52', 0.8: '#d4954e', 1.0: '#c0392b' },
          }).addTo(map);
          heatLayerRef.current = heat;
        } catch {
          // leaflet.heat not available
        }
      }
    }
  }, [showHeatmap, annotations]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleMouseUp = () => {
      const dragInfo = pendingMoveRef.current;
      if (!dragInfo || !dragInfo.isDragging) return;

      const marker = dragInfo.marker;
      const newPos = marker.getLatLng();
      marker.dragging?.disable();

      const currentAnnotation = annotationsRef.current.find((a) => a.id === dragInfo.annotationId);
      if (currentAnnotation) {
        onAnnotationMoveRef.current?.(currentAnnotation, newPos);
      }

      pendingMoveRef.current = null;
    };

    map.on('mouseup', handleMouseUp);
    return () => {
      map.off('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (drawMode === 'none') return;

      if (drawMode === 'point') {
        onMapClick?.(e.latlng);
        return;
      }

      // 测距模式
      if (drawMode === 'measure') {
        const points = tempPointsRef.current;
        // 检测双击（< 400ms）
        const now = Date.now();
        if (now - lastClickTimeRef.current < 400 && points.length >= 1) {
          lastClickTimeRef.current = 0;
          // 双击结束测量，显示总距离
          if (points.length >= 2) {
            let total = 0;
            for (let i = 1; i < points.length; i++) {
              total += points[i - 1].distanceTo(points[i]);
            }
            setMeasureDistance(total);
          }
          cleanupTempDrawing();
          onDrawModeChange('none');
          return;
        }
        lastClickTimeRef.current = now;

        points.push(e.latlng);
        // 计算距离
        if (points.length >= 2) {
          let total = 0;
          for (let i = 1; i < points.length; i++) {
            total += points[i - 1].distanceTo(points[i]);
          }
          setMeasureDistance(total);
        }
        updateTempDrawing();
        return;
      }

      // 文字标注模式
      if (drawMode === 'text') {
        setShowTextInput(e.latlng);
        setTextValue('');
        return;
      }

      // Detect double-click by interval (< 400ms)
      const now = Date.now();
      if (now - lastClickTimeRef.current < 400) {
        lastClickTimeRef.current = 0;
        const points = tempPointsRef.current;
        if (drawMode === 'line' && points.length >= 2) {
          onMapDrawComplete?.('line', points);
        } else if (drawMode === 'polygon' && points.length >= 3) {
          onMapDrawComplete?.('polygon', points);
        }
        cleanupTempDrawing();
        onDrawModeChange('none');
        return;
      }
      lastClickTimeRef.current = now;

      tempPointsRef.current.push(e.latlng);
      updateTempDrawing();
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if ((drawMode === 'line' || drawMode === 'polygon') && tempPointsRef.current.length > 0) {
        updateTempDrawing(e.latlng);
      }
      if (drawMode === 'measure' && tempPointsRef.current.length > 0) {
        updateTempDrawing(e.latlng);
      }
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);

    if (drawMode !== 'none') {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }

    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = drawMode !== 'none' ? 'crosshair' : '';
    }

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [cleanupTempDrawing, drawMode, onMapClick, onMapDrawComplete, onDrawModeChange, updateTempDrawing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        if (drawMode !== 'none') {
          cleanupTempDrawing();
          onDrawModeChange('none');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cleanupTempDrawing, contextMenu, drawMode, onDrawModeChange]);

  // 右键菜单关闭 - 点击空白处关闭
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    // 延迟添加，避免立即触发生成菜单时的 click 事件
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [contextMenu]);

  const handleMovePoint = useCallback(() => {
    if (!contextMenu) return;
    const marker = contextMenu.marker;
    marker.dragging?.enable();
    pendingMoveRef.current = {
      marker,
      annotationId: contextMenu.annotation.id,
      isDragging: true,
    };
    setContextMenu(null);
  }, [contextMenu]);

  const handleMoveToGroup = useCallback((annotationId: string, groupId: string | null) => {
    onAnnotationMoveToGroupRef.current?.(annotationId, groupId);
  }, []);

  const handleDeleteFromMenu = useCallback((annotation: Annotation) => {
    onAnnotationDeleteRef.current?.(annotation);
  }, []);

  const handleTextAnnotation = useCallback((text: string) => {
    if (!showTextInput) return;
    const latlng = showTextInput;
    // Create a text annotation via onMapDrawComplete or directly
    // We simulate a point annotation with text style
    const mockAnnotation: Annotation = {
      id: crypto.randomUUID(),
      map_id: '',
      type: 'text',
      geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
      name: text,
      description: '',
      style: { color: '#1a4735', fontSize: 16 },
      custom_fields: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Fire annotation click so the text appears
    onAnnotationClickRef.current?.(mockAnnotation);
    // Reset text mode
    setShowTextInput(null);
    setTextValue('');
    onDrawModeChange('none');
  }, [showTextInput, onDrawModeChange]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      <style jsx global>{`
        .marker-icon:hover {
          transform: scale(1.15) !important;
        }
        @keyframes markerPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @media (prefers-reduced-motion: reduce) {
          .marker-icon, .custom-marker *, .search-result-marker * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* 搜索框（支持路名、建筑名搜索定位） */}
      <SearchBox map={mapInstance} />

      <div className="absolute top-16 right-4 z-[1000]">
        <div className="backdrop-blur-md rounded-xl shadow-lg overflow-hidden flex"
          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setMapType('vec')}
            className={`px-3.5 py-2 text-xs font-medium transition-all duration-200 first:rounded-l-xl last:rounded-r-xl ${
              mapType === 'vec' ? 'text-white shadow-sm' : 'hover:bg-white/60'
            }`}
            style={mapType === 'vec' ? { background: 'var(--primary)', color: 'white' } : { color: 'var(--muted)' }}
          >
            矢量
          </button>
          <button
            onClick={() => setMapType('img')}
            className={`px-3.5 py-2 text-xs font-medium transition-all duration-200 first:rounded-l-xl last:rounded-r-xl ${
              mapType === 'img' ? 'text-white shadow-sm' : 'hover:bg-white/60'
            }`}
            style={mapType === 'img' ? { background: 'var(--primary)', color: 'white' } : { color: 'var(--muted)' }}
          >
            卫星
          </button>
          <button
            onClick={() => setMapType('terrain')}
            className={`px-3.5 py-2 text-xs font-medium transition-all duration-200 first:rounded-l-xl last:rounded-r-xl ${
              mapType === 'terrain' ? 'text-white shadow-sm' : 'hover:bg-white/60'
            }`}
            style={mapType === 'terrain' ? { background: 'var(--primary)', color: 'white' } : { color: 'var(--muted)' }}
          >
            地形
          </button>
        </div>
      </div>

      {drawMode !== 'none' && drawMode !== 'measure' && drawMode !== 'text' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2.5 rounded-xl shadow-xl border text-sm flex items-center gap-3 animate-fade-slide-up"
          style={{ background: 'rgba(26,31,36,0.85)', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#2d6b52' }} />
            {drawMode === 'point' && '点击地图放置标注点'}
            {drawMode === 'line' && '依次点击添加折线顶点，双击结束'}
            {drawMode === 'polygon' && '依次点击添加多边形顶点，双击结束'}
          </span>
          <button
            onClick={() => {
              cleanupTempDrawing();
              onDrawModeChange('none');
            }}
            className="ml-1 px-2.5 py-1 text-xs rounded-lg transition"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            取消
          </button>
        </div>
      )}

      {/* 测距模式浮动条 */}
      {drawMode === 'measure' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2.5 rounded-xl shadow-xl border text-sm flex items-center gap-3 animate-fade-slide-up"
          style={{ background: 'rgba(26,31,36,0.85)', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
          <span>📏 测距</span>
          <span className="font-semibold" style={{ color: '#93c5a2' }}>
            {measureDistance > 0 ? `${(measureDistance / 1000).toFixed(2)} km` : '点击起点'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>点击添加测量点 · 双击结束</span>
          <button
            onClick={() => {
              cleanupTempDrawing();
              setMeasureDistance(0);
              onDrawModeChange('none');
            }}
            className="ml-1 px-2.5 py-1 text-xs rounded-lg transition"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            取消
          </button>
        </div>
      )}

	      {/* 右键菜单 */}
	      {contextMenu && (
	        <div
	          className="fixed z-[5000] rounded-xl shadow-xl border py-1 min-w-[160px] backdrop-blur-sm animate-fade-in"
	          style={{ left: contextMenu.x, top: contextMenu.y, background: 'rgba(250,248,244,0.96)', borderColor: '#e3ddd0' }}
	          onClick={(e) => e.stopPropagation()}
	        >
	          <button
	            onClick={() => { onAnnotationClickRef.current?.(contextMenu.annotation); setContextMenu(null); }}
	            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors"
	            style={{ color: '#2c2416' }}
	            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; e.currentTarget.style.color = '#3b82f6'; }}
	            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#2c2416'; }}
	          >
	            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
	            编辑属性
	          </button>
	          <button
	            onClick={handleMovePoint}
	            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors"
	            style={{ color: '#2c2416' }}
	            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,85,43,0.08)'; e.currentTarget.style.color = '#c4552b'; }}
	            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#2c2416'; }}
	          >
	            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
	            移动点位
	          </button>
	          {groups && groups.length > 0 && (
	            <div className="border-t border-gray-100">
	              <div className="px-4 py-1.5 text-xs text-gray-400">移动到分组</div>
	              <button
	                onClick={() => {
	                  contextMenu.annotation;
	                  handleMoveToGroup(contextMenu.annotation.id, null);
	                  setContextMenu(null);
	                }}
	                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-600"
	              >
	                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
	                取消分组
	              </button>
	              {groups.slice(0, 5).map((g) => (
	                <button
	                  key={g.id}
	                  onClick={() => {
	                    handleMoveToGroup(contextMenu.annotation.id, g.id);
	                    setContextMenu(null);
	                  }}
	                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 truncate text-gray-600"
	                  style={{ paddingLeft: '48px' }}
	                >
	                  {g.name}
	                </button>
	              ))}
	            </div>
	          )}
	          <div className="border-t border-gray-100">
	            <button
	              onClick={() => { handleDeleteFromMenu(contextMenu.annotation); setContextMenu(null); }}
	              className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors text-red-600"
	              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
	              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
	            >
	              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
	              删除标注
	            </button>
	          </div>
	        </div>
	      )}

	      {/* 文字标注输入对话框 */}
	      {showTextInput && (
	        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/20 backdrop-blur-sm"
	          onClick={() => setShowTextInput(null)}>
	          <div className="rounded-xl shadow-2xl p-5 w-80 mx-4"
	            style={{ background: 'var(--surface)' }}
	            onClick={(e) => e.stopPropagation()}>
	            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>添加文字标注</h3>
	            <input
	              type="text"
	              value={textValue}
	              onChange={(e) => setTextValue(e.target.value)}
	              placeholder="输入标注文字..."
	              autoFocus
	              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition mb-3"
	              style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
	              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(26,71,53,0.12)'; }}
	              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
	              onKeyDown={(e) => {
	                if (e.key === 'Enter' && textValue.trim()) {
	                  handleTextAnnotation(textValue.trim());
	                  setShowTextInput(null);
	                  setTextValue('');
	                }
	                if (e.key === 'Escape') {
	                  setShowTextInput(null);
	                  setTextValue('');
	                }
	              }}
	            />
	            <div className="flex gap-2 justify-end">
	              <button onClick={() => { setShowTextInput(null); setTextValue(''); }}
	                className="px-4 py-2 rounded-lg text-sm transition"
	                style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
	                取消
	              </button>
	              <button onClick={() => {
	                if (textValue.trim()) {
	                  handleTextAnnotation(textValue.trim());
	                  setShowTextInput(null);
	                  setTextValue('');
	                }
	              }}
	                className="px-4 py-2 text-white rounded-lg text-sm font-medium transition"
	                style={{ background: textValue.trim() ? 'var(--primary)' : 'var(--border)' }}>
	                添加
	              </button>
	            </div>
	          </div>
	        </div>
	      )}
	    </div>
	  );
	}

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
