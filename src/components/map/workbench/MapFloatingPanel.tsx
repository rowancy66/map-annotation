'use client';

import { ReactNode } from 'react';

interface MapFloatingPanelProps {
  children: ReactNode;
  className?: string;
}

export default function MapFloatingPanel({ children, className = '' }: MapFloatingPanelProps) {
  return (
    <div className={`floating-toolbar workbench-hard-edge px-0.5 py-0.5 ${className}`.trim()}>
      {children}
    </div>
  );
}
