'use client';

import { DrawMode } from '@/lib/types';
import { MapPin, TrendingUp, Pentagon, MousePointer2 } from 'lucide-react';

interface DrawingToolbarProps {
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  annotationCount: { point: number; line: number; polygon: number };
}

export default function DrawingToolbar({ drawMode, onDrawModeChange, annotationCount }: DrawingToolbarProps) {
  const tools: { mode: DrawMode; icon: React.ReactNode; label: string; count: number }[] = [
    { mode: 'none', icon: <MousePointer2 className="w-5 h-5" />, label: '选择', count: 0 },
    { mode: 'point', icon: <MapPin className="w-5 h-5" />, label: '添加点', count: annotationCount.point },
    { mode: 'line', icon: <TrendingUp className="w-5 h-5" />, label: '画线', count: annotationCount.line },
    { mode: 'polygon', icon: <Pentagon className="w-5 h-5" />, label: '画面', count: annotationCount.polygon },
  ];

  return (
    <div className="absolute left-4 top-4 z-[1000] bg-white rounded-xl shadow-lg p-1.5 flex flex-col gap-1">
      {tools.map((tool) => (
        <button
          key={tool.mode}
          onClick={() => onDrawModeChange(tool.mode)}
          className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all ${
            drawMode === tool.mode
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title={tool.label}
        >
          {tool.icon}
          <span className="text-[10px] mt-0.5">{tool.label}</span>
          {tool.count > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center font-bold ${
              drawMode === tool.mode ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {tool.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
