'use client';

import { DrawMode } from '@/lib/types';
import { MapPin, TrendingUp, Pentagon, MousePointer2, Ruler, Type, Eye, EyeOff, Thermometer } from 'lucide-react';

interface DrawingToolbarProps {
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  annotationCount: { point: number; line: number; polygon: number; text: number };
  /** 显示名称开关 */
  showNames?: boolean;
  onShowNamesToggle?: () => void;
  /** 热力图开关 */
  showHeatmap?: boolean;
  onShowHeatmapToggle?: () => void;
}

export default function DrawingToolbar({
  drawMode,
  onDrawModeChange,
  annotationCount,
  showNames,
  onShowNamesToggle,
  showHeatmap,
  onShowHeatmapToggle,
}: DrawingToolbarProps) {
  const tools: { mode: DrawMode; icon: React.ReactNode; label: string; count?: number }[] = [
    { mode: 'none', icon: <MousePointer2 className="w-4 h-4" aria-hidden="true" />, label: '选择' },
    { mode: 'point', icon: <MapPin className="w-4 h-4" aria-hidden="true" />, label: '点', count: annotationCount.point },
    { mode: 'line', icon: <TrendingUp className="w-4 h-4" aria-hidden="true" />, label: '线', count: annotationCount.line },
    { mode: 'polygon', icon: <Pentagon className="w-4 h-4" aria-hidden="true" />, label: '面', count: annotationCount.polygon },
  ];

  const extraTools: { mode: DrawMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'measure', icon: <Ruler className="h-4 w-4" aria-hidden="true" />, label: '测距' },
    { mode: 'text', icon: <Type className="h-4 w-4" aria-hidden="true" />, label: '文字' },
  ];

  return (
    <div className="floating-toolbar workbench-hard-edge px-0.5 py-0.5">
      {/* 绘制工具 */}
      <div className="flex items-center">
        {tools.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => onDrawModeChange(tool.mode)}
            className="relative flex h-8 items-center gap-1.5 border-r px-2.5 text-[11px] font-medium transition-all duration-150 last:border-r-0"
            style={{
              borderColor: 'var(--border)',
              background: drawMode === tool.mode ? 'var(--primary)' : 'transparent',
              color: drawMode === tool.mode ? '#fff' : 'var(--ink)',
            }}
            title={tool.label}
          >
            {tool.icon}
            <span>{tool.label}</span>
            {tool.count !== undefined && tool.count > 0 && (
              <span
                className="ml-0.5 text-[10px] font-bold"
                style={{ color: drawMode === tool.mode ? 'rgba(255,255,255,0.74)' : 'var(--faint)' }}
              >
                {tool.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mx-0 h-7 w-px" style={{ background: 'var(--border)' }} />

      {/* 额外工具（测距、文字） */}
      <div className="flex items-center">
        {extraTools.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => onDrawModeChange(drawMode === tool.mode ? 'none' : tool.mode)}
            className="flex h-8 items-center gap-1.5 border-r px-2.5 text-[11px] font-medium transition-all duration-150 last:border-r-0"
            style={{
              borderColor: 'var(--border)',
              background: drawMode === tool.mode ? 'rgba(11,79,69,0.12)' : 'transparent',
              color: drawMode === tool.mode ? 'var(--ink)' : 'var(--ink)',
            }}
            title={tool.label}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* 视图控制 */}
      {(onShowNamesToggle !== undefined || onShowHeatmapToggle !== undefined) && (
        <>
          <div className="mx-0 h-7 w-px" style={{ background: 'var(--border)' }} />
          <div className="flex items-center">
            {onShowNamesToggle !== undefined && (
              <button
                onClick={onShowNamesToggle}
                className={`flex h-8 items-center gap-1.5 border-r px-2.5 text-[11px] font-medium transition-all duration-150 last:border-r-0`}
                style={{
                  borderColor: 'var(--border)',
                  background: showNames ? 'rgba(11,79,69,0.12)' : 'transparent',
                  color: showNames ? 'var(--ink)' : 'var(--faint)',
                }}
                title="显示名称"
              >
                {showNames ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                <span>名称</span>
              </button>
            )}
            {onShowHeatmapToggle !== undefined && (
              <button
                onClick={onShowHeatmapToggle}
                className={`flex h-8 items-center gap-1.5 px-2.5 text-[11px] font-medium transition-all duration-150`}
                style={{
                  background: showHeatmap ? 'rgba(11,79,69,0.12)' : 'transparent',
                  color: showHeatmap ? 'var(--primary)' : 'var(--faint)',
                }}
                title="热力图"
              >
                <Thermometer className="h-4 w-4" aria-hidden="true" />
                <span>热力</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}