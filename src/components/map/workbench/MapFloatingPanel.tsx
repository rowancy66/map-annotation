'use client';

import { ReactNode } from 'react';

interface MapFloatingPanelProps {
  children: ReactNode;
  className?: string;
}

export default function MapFloatingPanel({ children, className = '' }: MapFloatingPanelProps) {
  return (
    <div className={`floating-toolbar rounded-[22px] px-2 py-2 ${className}`.trim()}>
      {children}
    </div>
  );
}
