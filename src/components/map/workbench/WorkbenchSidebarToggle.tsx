'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkbenchSidebarToggleProps {
  open: boolean;
  onToggle: () => void;
  offset: number;
}

export default function WorkbenchSidebarToggle({
  open,
  onToggle,
  offset,
}: WorkbenchSidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={open ? '收起侧边栏' : '展开侧边栏'}
      className="absolute top-6 z-40 rounded-r-2xl p-2 transition-all duration-200 hover:scale-105"
      style={{
        left: open ? `${offset}px` : '0px',
        background: 'rgba(255,252,247,0.94)',
        border: '1px solid var(--border)',
        borderLeft: 'none',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      {open ? (
        <ChevronLeft className="h-4 w-4" style={{ color: 'var(--muted)' }} />
      ) : (
        <ChevronRight className="h-4 w-4" style={{ color: 'var(--muted)' }} />
      )}
    </button>
  );
}
