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
      <div className="flex min-w-0 flex-1 items-center gap-3">{left}</div>
      {center ? <div className="hidden min-w-0 flex-[1.1] items-center justify-center lg:flex">{center}</div> : <div className="hidden flex-1 lg:flex" />}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{right}</div>
    </header>
  );
}
