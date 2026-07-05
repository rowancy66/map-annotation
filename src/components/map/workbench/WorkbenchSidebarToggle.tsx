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
      className="absolute top-4 z-40 h-10 w-9 border-r p-0 transition-all duration-200"
      style={{
        left: open ? `${offset}px` : '0px',
        background: 'rgba(250,249,244,0.97)',
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
