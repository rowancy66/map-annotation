'use client';

import { DrawMode } from '@/lib/types';
import { MapPin, TrendingUp, Pentagon, MousePointer2, Ruler, Type } from 'lucide-react';

interface DrawingToolbarProps {
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  annotationCount: { point: number; line: number; polygon: number; text: number };
}

export default function DrawingToolbar({ drawMode, onDrawModeChange, annotationCount }: DrawingToolbarProps) {
  const tools: { mode: DrawMode; icon: React.ReactNode; label: string; count?: number }[] = [
    { mode: 'none', icon: <MousePointer2 className="w-4 h-4" aria-hidden="true" />, label: '选择' },
    { mode: 'point', icon: <MapPin className="w-4 h-4" aria-hidden="true" />, label: '点', count: annotationCount.point },
    { mode: 'line', icon: <TrendingUp className="w-4 h-4" aria-hidden="true" />, label: '线', count: annotationCount.line },
    { mode: 'polygon', icon: <Pentagon className="w-4 h-4" aria-hidden="true" />, label: '面', count: annotationCount.polygon },
  ];

  const extraTools: { mode: DrawMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'measure', icon: <Ruler className="w-4 h-4" aria-hidden="true" />, label: '测距' },
    { mode: 'text', icon: <Type className="w-4 h-4" aria-hidden="true" />, label: '文字' },
  ];

  return (
    <div className="flex items-center gap-1">
      {/* 主绘制工具 */}
      <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--bg)' }}>
        {tools.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => onDrawModeChange(tool.mode)}
            className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
            style={{
              background: drawMode === tool.mode ? 'var(--primary)' : 'transparent',
              color: drawMode === tool.mode ? 'white' : 'var(--muted)',
            }}
            title={tool.label}
          >
            {tool.icon}
            <span>{tool.label}</span>
            {tool.count !== undefined && tool.count > 0 && (
              <span className="text-[10px] ml-0.5 font-bold"
                style={{ color: drawMode === tool.mode ? 'rgba(255,255,255,0.7)' : 'var(--faint)' }}>
                {tool.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

      {/* 扩展工具 */}
      <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--bg)' }}>
        {extraTools.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => onDrawModeChange(drawMode === tool.mode ? 'none' : tool.mode)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
            style={{
              background: drawMode === tool.mode ? 'var(--primary)' : 'transparent',
              color: drawMode === tool.mode ? 'white' : 'var(--muted)',
            }}
            title={tool.label}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}