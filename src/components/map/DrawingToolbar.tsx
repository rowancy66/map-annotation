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
    <div className="floating-toolbar rounded-[22px] px-2 py-2">
      <div className="flex items-center gap-1.5">
        {tools.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => onDrawModeChange(tool.mode)}
            className="relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-150"
            style={{
              background: drawMode === tool.mode ? 'var(--primary)' : 'transparent',
              color: drawMode === tool.mode ? '#fff' : 'var(--muted)',
              boxShadow: drawMode === tool.mode ? '0 14px 28px rgba(11,79,69,0.18)' : 'none',
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

      <div className="mx-1 h-6 w-px" style={{ background: 'rgba(52,44,35,0.08)' }} />

      <div className="flex items-center gap-1.5">
        {extraTools.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => onDrawModeChange(drawMode === tool.mode ? 'none' : tool.mode)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-150"
            style={{
              background: drawMode === tool.mode ? 'var(--accent)' : 'transparent',
              color: drawMode === tool.mode ? '#1a1a18' : 'var(--muted)',
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
