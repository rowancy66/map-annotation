'use client';

import { ReactNode } from 'react';

interface WorkbenchHeaderProps {
  left: ReactNode;
  center?: ReactNode;
  right: ReactNode;
}

export default function WorkbenchHeader({ left, center, right }: WorkbenchHeaderProps) {
  return (
    <header className="workbench-topbar shrink-0">
      <div className="flex min-w-0 flex-[0.95] items-center gap-2.5">{left}</div>
      {center ? <div className="hidden min-w-0 flex-[1.2] items-center justify-center lg:flex">{center}</div> : <div className="hidden flex-1 lg:flex" />}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">{right}</div>
    </header>
  );
}
