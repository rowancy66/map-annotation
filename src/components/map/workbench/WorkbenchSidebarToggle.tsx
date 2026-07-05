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
      className="absolute top-3 z-40 h-9 w-9 p-0 transition-all duration-200"
      style={{
        left: open ? `${offset}px` : '0px',
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid var(--border)',
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
