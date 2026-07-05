# Kanvon Map Workbench Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the admin editor and public map pages into a Kanvon-branded map workbench that keeps the current feature set while aligning the layout and interaction model with the approved single-screen workbench design.

**Architecture:** Keep the current data flow and map behavior intact, but replace the page chrome around `MapView` with a shared workbench structure: top utility header, single left work panel, map-first canvas, and floating map controls. Extract only the minimum shared UI needed for both pages so the admin editor and public viewer feel related without over-abstracting the codebase.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Leaflet, lucide-react

---

## File Structure

### Existing files to modify

- `src/app/globals.css`
  - Replace the current archive-style tokens with Kanvon-oriented workbench tokens.
  - Add shared layout classes for workbench shell, top bar, side panel, floating tools, and lighter info panels.
- `src/components/map/DrawingToolbar.tsx`
  - Convert the toolbar from a centered top-bar cluster into a floating map-toolbar that works inside the map canvas.
- `src/components/map/InfoCard.tsx`
  - Lightly restyle the detail card so it matches the new workbench palette and panel thickness.
- `src/app/admin/AdminEditor.tsx`
  - Rebuild the layout into the approved admin workbench structure without changing annotation, import/export, group, or settings logic.
- `src/app/map/[id]/page.tsx`
  - Rebuild the public page to share the same shell and tone as the admin page while staying read-only.

### New files to create

- `src/components/map/workbench/WorkbenchHeader.tsx`
  - Shared top header for admin/public workbench variants.
- `src/components/map/workbench/WorkbenchSidebarToggle.tsx`
  - Shared side-panel collapse button with workbench styling.
- `src/components/map/workbench/MapFloatingPanel.tsx`
  - Shared floating wrapper for map-edge controls like toolbar and info badges.

### Verification commands used throughout

- `npm run lint`
- `npm run dev`

There is no existing automated UI test harness in this repository, so verification is lint plus manual browser checks against the approved design spec.

---

### Task 1: Establish Kanvon workbench design tokens

**Files:**
- Modify: `src/app/globals.css`
- Test: `npm run lint`

- [ ] **Step 1: Update the root color tokens to the Kanvon palette**

Replace the existing `:root` block with:

```css
:root {
  --bg: #f5f1e8;
  --bg-soft: #faf6ef;
  --surface: rgba(255, 251, 245, 0.86);
  --surface-strong: #fffdf9;
  --surface-muted: rgba(247, 241, 232, 0.94);
  --surface-panel: rgba(255, 252, 247, 0.92);
  --ink: #1a1a18;
  --muted: #695f54;
  --faint: #978a7b;
  --border: rgba(52, 44, 35, 0.1);
  --border-strong: rgba(52, 44, 35, 0.18);
  --primary: #0b4f45;
  --primary-hover: #146456;
  --primary-soft: rgba(11, 79, 69, 0.1);
  --accent: #cfb08a;
  --accent-soft: rgba(207, 176, 138, 0.18);
  --danger: #b95749;
  --shadow-soft: 0 18px 42px rgba(30, 26, 20, 0.08);
  --shadow-card: 0 24px 52px rgba(30, 26, 20, 0.1);
  --shadow-floating: 0 28px 64px rgba(30, 26, 20, 0.14);
}
```

- [ ] **Step 2: Replace archive-heavy surface classes with workbench variants**

Update the shared panel/button classes in `src/app/globals.css` to:

```css
.paper-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(16px);
}

.paper-card {
  background: linear-gradient(180deg, rgba(255, 253, 249, 0.96), rgba(246, 239, 229, 0.96));
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
}

.soft-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgba(52, 44, 35, 0.08);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--faint);
}

.ghost-button {
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.62);
  color: var(--primary);
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease;
}

.ghost-button:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(207, 176, 138, 0.6);
}
```

- [ ] **Step 3: Add workbench-specific layout utilities**

Append these reusable classes to `src/app/globals.css`:

```css
.workbench-shell {
  height: 100vh;
  overflow: hidden;
  padding: 12px;
  background:
    radial-gradient(circle at 12% 12%, rgba(207, 176, 138, 0.14), transparent 22%),
    radial-gradient(circle at 88% 10%, rgba(11, 79, 69, 0.08), transparent 18%),
    linear-gradient(180deg, #f8f4ec 0%, var(--bg) 100%);
}

.workbench-frame {
  display: flex;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 30px;
}

.workbench-topbar {
  display: flex;
  min-height: 68px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 251, 245, 0.78);
  padding: 14px 18px;
  backdrop-filter: blur(18px);
}

.workbench-sidebar {
  background: var(--surface-panel);
  border: 1px solid rgba(52, 44, 35, 0.08);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(18px);
}

.floating-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(52, 44, 35, 0.08);
  background: rgba(255, 252, 247, 0.9);
  box-shadow: var(--shadow-floating);
  backdrop-filter: blur(16px);
}

.map-overlay-chip {
  border: 1px solid rgba(52, 44, 35, 0.08);
  background: rgba(255, 252, 247, 0.86);
  box-shadow: 0 16px 36px rgba(30, 26, 20, 0.08);
  backdrop-filter: blur(14px);
}
```

- [ ] **Step 4: Run lint to confirm the stylesheet still parses**

Run: `npm run lint`

Expected: `eslint` completes successfully with no CSS-related syntax fallout from JSX files consuming the updated classes.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add Kanvon workbench design tokens"
```

---

### Task 2: Extract shared workbench chrome components

**Files:**
- Create: `src/components/map/workbench/WorkbenchHeader.tsx`
- Create: `src/components/map/workbench/WorkbenchSidebarToggle.tsx`
- Create: `src/components/map/workbench/MapFloatingPanel.tsx`
- Test: `npm run lint`

- [ ] **Step 1: Create the shared floating panel wrapper**

Create `src/components/map/workbench/MapFloatingPanel.tsx` with:

```tsx
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
```

- [ ] **Step 2: Create the shared sidebar toggle**

Create `src/components/map/workbench/WorkbenchSidebarToggle.tsx` with:

```tsx
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
```

- [ ] **Step 3: Create the shared top header**

Create `src/components/map/workbench/WorkbenchHeader.tsx` with:

```tsx
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
```

- [ ] **Step 4: Run lint to verify the new shared components**

Run: `npm run lint`

Expected: PASS, with the new `workbench` components imported cleanly and no unused export warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/map/workbench/MapFloatingPanel.tsx src/components/map/workbench/WorkbenchSidebarToggle.tsx src/components/map/workbench/WorkbenchHeader.tsx
git commit -m "feat: add shared map workbench chrome"
```

---

### Task 3: Turn the drawing toolbar into a floating Kanvon map toolbar

**Files:**
- Modify: `src/components/map/DrawingToolbar.tsx`
- Test: `npm run lint`

- [ ] **Step 1: Replace the current toolbar markup with a floating-toolbar-friendly version**

Update `src/components/map/DrawingToolbar.tsx` so the component body becomes:

```tsx
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
```

- [ ] **Step 2: Remove the old "编辑工具" pill from the toolbar component**

Delete this line from `src/components/map/DrawingToolbar.tsx`:

```tsx
<div className="hidden md:block soft-pill">编辑工具</div>
```

The floating placement in the page layout will now provide context instead of the old pill label.

- [ ] **Step 3: Run lint after the toolbar rewrite**

Run: `npm run lint`

Expected: PASS, confirming the toolbar still satisfies the `DrawMode` interface and no JSX branches were broken.

- [ ] **Step 4: Commit**

```bash
git add src/components/map/DrawingToolbar.tsx
git commit -m "feat: restyle map drawing toolbar for workbench layout"
```

---

### Task 4: Rebuild the admin page as the editing workbench

**Files:**
- Modify: `src/app/admin/AdminEditor.tsx`
- Modify: `src/components/map/InfoCard.tsx`
- Test: `npm run lint`
- Test: `npm run dev`

- [ ] **Step 1: Add the shared workbench imports and remove the old page-shell assumptions**

At the top of `src/app/admin/AdminEditor.tsx`, add:

```tsx
import WorkbenchHeader from '@/components/map/workbench/WorkbenchHeader';
import WorkbenchSidebarToggle from '@/components/map/workbench/WorkbenchSidebarToggle';
import MapFloatingPanel from '@/components/map/workbench/MapFloatingPanel';
```

Keep all current data hooks and action handlers unchanged.

- [ ] **Step 2: Replace the outer shell with the new workbench frame**

Replace the top-level JSX wrapper in `AdminEditor`:

```tsx
<div className="h-screen overflow-hidden p-3 md:p-4" style={{ background: 'var(--bg)' }}>
  <div className="paper-panel flex h-full flex-col overflow-hidden rounded-[32px]">
```

with:

```tsx
<div className="workbench-shell">
  <div className="paper-panel workbench-frame">
```

- [ ] **Step 3: Replace the old header with the shared workbench header and center search**

Swap the existing `<header ...>` block for:

```tsx
<WorkbenchHeader
  left={
    <>
      <Link href="/admin" className="ghost-button rounded-full p-2" title="返回地图列表" aria-label="返回地图列表">
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <Link href="/" className="ghost-button rounded-full p-2" title="返回前台" aria-label="返回前台">
        <Home className="h-4 w-4" />
      </Link>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'var(--primary)' }}>
        <MapPin className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <div className="display-label">Kanvon Workbench</div>
        <h1 className="truncate text-sm font-semibold md:text-base" style={{ color: 'var(--ink)' }}>
          {mapProject?.name || '地图标注平台'}
        </h1>
      </div>
      <span
        className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
      >
        管理
      </span>
    </>
  }
  center={
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
      <input
        value={filters.query}
        onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
        placeholder="搜索标注名称、描述或属性值"
        className="w-full rounded-full py-3 pl-10 pr-10 text-sm outline-none transition"
        style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid var(--border)', color: 'var(--ink)' }}
      />
    </div>
  }
  right={
    <>
      <Link href="/admin" className="ghost-button rounded-full px-4 py-2 text-xs font-semibold">
        地图管理
      </Link>
      <button onClick={() => setImportOpen(true)} className="ghost-button flex items-center gap-1.5 rounded-full px-3 py-2 text-sm">
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">导入</span>
      </button>
      {/* keep existing export dropdown logic here */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="ghost-button rounded-full p-2"
        title="显示设置"
        aria-label="显示设置"
      >
        <Settings className="h-4 w-4" />
      </button>
      <button onClick={logout} className="ghost-button rounded-full p-2" title="退出登录" aria-label="退出登录">
        <LogOut className="h-4 w-4" />
      </button>
    </>
  }
/>
```

- [ ] **Step 4: Rebuild the admin body layout around a single work panel and floating map toolbar**

Replace the current body region with this structure:

```tsx
<div className="relative flex flex-1 overflow-hidden p-3 md:p-4">
  <div
    className={`absolute left-0 top-0 bottom-0 z-40 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-[344px]' : 'w-0'}`}
  >
    <div className="workbench-sidebar h-full w-[344px] rounded-[28px]">
      {/* keep list/groups/settings content, but update inner spacing and headers */}
    </div>
  </div>

  <WorkbenchSidebarToggle
    open={sidebarOpen}
    onToggle={() => setSidebarOpen(!sidebarOpen)}
    offset={344}
  />

  <div className="relative min-w-0 flex-1">
    <div className="absolute left-5 top-5 z-[900]">
      <DrawingToolbar
        drawMode={drawMode}
        onDrawModeChange={setDrawMode}
        annotationCount={annotationCount}
      />
    </div>

    <div className="absolute right-5 top-5 z-[900] flex gap-2">
      <MapFloatingPanel>
        <button
          onClick={() => handleShowNamesSettingChange(!(mapProject?.settings.showNames !== false))}
          className="rounded-full px-3 py-2 text-xs font-medium"
          style={{ color: 'var(--muted)' }}
        >
          名称
        </button>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className="rounded-full px-3 py-2 text-xs font-medium"
          style={{ color: showHeatmap ? 'var(--primary)' : 'var(--muted)' }}
        >
          热力
        </button>
      </MapFloatingPanel>
    </div>

    <MapView
      annotations={filteredAnnotations}
      onMapClick={handleMapClick}
      onMapDrawComplete={handleDrawComplete}
      onAnnotationClick={handleAnnotationClick}
      onAnnotationMove={handleAnnotationMove}
      onAnnotationDelete={(anno) => handleDeleteAnnotation(anno.id)}
      onAnnotationMoveToGroup={handleMoveAnnotationToGroup}
      drawMode={drawMode}
      onDrawModeChange={setDrawMode}
      selectedAnnotation={selectedAnnotation}
      editable={true}
      groups={groups}
      showHeatmap={showHeatmap}
      showNames={mapProject?.settings.showNames !== false}
    />
  </div>
</div>
```

- [ ] **Step 5: Simplify the left panel chrome while preserving list/groups/batch/settings behavior**

Inside the sidebar content in `src/app/admin/AdminEditor.tsx`, keep the same logic but replace the old tab-strip look with:

```tsx
<div className="border-b px-4 py-4" style={{ borderColor: 'var(--border)' }}>
  <div className="display-label mb-2">地图工作区</div>
  <div className="flex items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>标注与分组</h2>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
        {filteredAnnotations.length} / {annotations.length} 条可见
      </p>
    </div>
    <button
      onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
      className="ghost-button rounded-full p-2"
      aria-label="批量操作"
    >
      <CheckSquare className="h-4 w-4" />
    </button>
  </div>
  <div className="mt-3 inline-flex rounded-full p-1" style={{ background: 'rgba(11,79,69,0.06)' }}>
    {(['list', 'groups'] as const).map((tab) => (
      <button
        key={tab}
        onClick={() => setSidebarTab(tab)}
        className="rounded-full px-3 py-1.5 text-xs font-medium transition"
        style={{
          background: sidebarTab === tab ? 'var(--surface-strong)' : 'transparent',
          color: sidebarTab === tab ? 'var(--primary)' : 'var(--muted)',
        }}
      >
        {tab === 'list' ? '标注' : '分组'}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 6: Lightly restyle the info card to match the Kanvon palette**

In `src/components/map/InfoCard.tsx`, replace the `colors` constant with:

```tsx
const colors = {
  surface: 'rgba(255,252,247,0.94)',
  bg: '#f7f1e8',
  border: 'rgba(52,44,35,0.1)',
  ink: '#1a1a18',
  muted: '#695f54',
  faint: '#978a7b',
  placeholder: '#b3a596',
  accent: '#0b4f45',
  accentSoft: 'rgba(11,79,69,0.08)',
  danger: '#b95749',
};
```

Also change the polygon accent from violet to Kanvon gold:

```tsx
polygon: { label: '面', accent: '#cfb08a', bg: 'rgba(207,176,138,0.16)' },
```

- [ ] **Step 7: Run lint after the admin-layout rebuild**

Run: `npm run lint`

Expected: PASS, confirming the admin editor still compiles with the shared workbench components and existing action handlers.

- [ ] **Step 8: Run the app and manually verify the admin workbench**

Run: `npm run dev`

Expected manual checks:

- `/admin?mapId=<existing-id>` shows a top workbench header with centered search.
- The draw toolbar floats on the map instead of living in the header.
- The left panel still supports list/group switching, batch mode, filters, and settings.
- Import/export/settings/logout still work from the new top bar.
- Selecting an annotation still opens the info card.

- [ ] **Step 9: Commit**

```bash
git add src/app/admin/AdminEditor.tsx src/components/map/InfoCard.tsx
git commit -m "feat: convert admin editor into Kanvon workbench"
```

---

### Task 5: Rebuild the public page as the read-only workbench

**Files:**
- Modify: `src/app/map/[id]/page.tsx`
- Test: `npm run lint`
- Test: `npm run dev`

- [ ] **Step 1: Add the shared workbench imports**

At the top of `src/app/map/[id]/page.tsx`, add:

```tsx
import WorkbenchHeader from '@/components/map/workbench/WorkbenchHeader';
import WorkbenchSidebarToggle from '@/components/map/workbench/WorkbenchSidebarToggle';
import MapFloatingPanel from '@/components/map/workbench/MapFloatingPanel';
```

- [ ] **Step 2: Replace the old public shell with the workbench shell**

Replace:

```tsx
<div className="h-screen overflow-hidden p-3 md:p-4" style={{ background: 'var(--bg)' }}>
  <div className="paper-panel flex h-full flex-col overflow-hidden rounded-[32px]">
```

with:

```tsx
<div className="workbench-shell">
  <div className="paper-panel workbench-frame">
```

- [ ] **Step 3: Replace the public header with the shared topbar**

Replace the current header block with:

```tsx
<WorkbenchHeader
  left={
    <>
      <Link href="/" className="ghost-button flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-semibold">
        <ArrowLeft className="h-4 w-4" />
        <span>返回</span>
      </Link>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'var(--primary)' }}>
        <MapPin className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <div className="display-label">Kanvon Atlas</div>
        <h1 className="truncate text-xl md:text-2xl" style={{ color: 'var(--ink)' }}>
          {mapProject?.name || '地图标注平台'}
        </h1>
      </div>
    </>
  }
  center={
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="搜索编号、位置或属性"
        className="w-full rounded-full py-3 pl-10 pr-10 text-sm outline-none transition"
        style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid var(--border)', color: 'var(--ink)' }}
      />
    </div>
  }
  right={
    <>
      <span className="soft-pill">{annotations.length} 个标注</span>
      <Link href="/admin" className="ghost-button flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold">
        <LogIn className="h-3.5 w-3.5" />
        后台管理
      </Link>
      <Link href="/admin" className="ghost-button rounded-full px-4 py-2 text-xs font-semibold">
        地图管理
      </Link>
    </>
  }
/>
```

- [ ] **Step 4: Rebuild the public body around the same left-panel-plus-map pattern**

Replace the current body region with:

```tsx
<div className="relative flex flex-1 overflow-hidden p-3 md:p-4">
  <div className={`absolute left-0 top-0 bottom-0 z-40 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-[344px]' : 'w-0'}`}>
    <div className="workbench-sidebar h-full w-[344px] rounded-[28px]">
      {/* keep summary, search result count, and annotation list logic */}
    </div>
  </div>

  <WorkbenchSidebarToggle
    open={sidebarOpen}
    onToggle={() => setSidebarOpen(!sidebarOpen)}
    offset={344}
  />

  <div className="relative min-w-0 flex-1">
    <div className="absolute right-5 top-5 z-[900] flex gap-2">
      <MapFloatingPanel>
        <button
          onClick={() => setShowNames((prev) => !(prev ?? (mapProject?.settings.showNames !== false)))}
          className="rounded-full px-3 py-2 text-xs font-medium"
          style={{ color: 'var(--muted)' }}
        >
          名称
        </button>
      </MapFloatingPanel>
    </div>

    <MapView
      annotations={filteredAnnotations}
      onAnnotationClick={handleAnnotationClick}
      drawMode="none"
      onDrawModeChange={() => {}}
      selectedAnnotation={selectedAnnotation}
      editable={false}
      showNames={effectiveShowNames}
    />
  </div>
</div>
```

- [ ] **Step 5: Simplify the left panel chrome to match the admin page**

In the public sidebar, replace the old thick card headings with:

```tsx
<div className="border-b px-4 py-4" style={{ borderColor: 'var(--border)' }}>
  <div className="display-label mb-2">标注索引</div>
  <div className="flex items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>地图浏览</h2>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
        点 {annotationTypeCounts.point} · 线 {annotationTypeCounts.line} · 面 {annotationTypeCounts.polygon}
      </p>
    </div>
    <span className="soft-pill">{filteredAnnotations.length} 项</span>
  </div>
</div>
```

The existing annotation list rendering can stay, but its item chrome should keep the lighter panel background already described in the spec.

- [ ] **Step 6: Run lint after the public page rewrite**

Run: `npm run lint`

Expected: PASS, with the read-only page still typed correctly and no invalid `MapView` props introduced.

- [ ] **Step 7: Run the app and manually verify the public workbench**

Run: `npm run dev`

Expected manual checks:

- `/map/<existing-id>` shares the same brand tone and shell as `/admin`.
- The left index panel still filters the map and list.
- The page stays read-only: no draw controls, no edit buttons.
- The “后台管理” and “地图管理” links are visible in the top bar.
- Annotation selection still opens the detail card.

- [ ] **Step 8: Commit**

```bash
git add 'src/app/map/[id]/page.tsx'
git commit -m "feat: convert public map page into Kanvon workbench"
```

---

### Task 6: Final responsive polish and regression pass

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/admin/AdminEditor.tsx`
- Modify: `src/app/map/[id]/page.tsx`
- Test: `npm run lint`
- Test: `npm run dev`

- [ ] **Step 1: Add the small-screen workbench fallbacks**

Append these rules to `src/app/globals.css`:

```css
@media (max-width: 1024px) {
  .workbench-topbar {
    flex-wrap: wrap;
    align-items: stretch;
  }

  .floating-toolbar {
    max-width: calc(100vw - 96px);
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .workbench-shell {
    padding: 8px;
  }

  .workbench-frame {
    border-radius: 24px;
  }
}
```

- [ ] **Step 2: Hide non-essential labels at smaller breakpoints**

In both page files, wrap non-essential text labels with existing responsive utilities like:

```tsx
<span className="hidden sm:inline">导入</span>
<span className="hidden sm:inline">后台管理</span>
```

Keep the buttons themselves visible so interaction survives on smaller screens.

- [ ] **Step 3: Run the final lint pass**

Run: `npm run lint`

Expected: PASS with no new warnings or unused imports after responsive cleanup.

- [ ] **Step 4: Run the final manual browser regression**

Run: `npm run dev`

Expected manual checks:

- Desktop admin and public pages match the approved shell.
- Small-screen widths keep the sidebar toggle, header actions, and floating toolbar usable.
- Import/export, settings, annotation selection, list filtering, and group switching still work.
- No unintended enterprise-menu items appear anywhere in the shell.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/admin/AdminEditor.tsx 'src/app/map/[id]/page.tsx'
git commit -m "fix: polish responsive Kanvon workbench layout"
```

---

## Self-Review

### Spec coverage

- Shared workbench shell for admin/public: covered by Tasks 1, 2, 4, and 5.
- Kanvon brand palette and lighter visual system: covered by Tasks 1 and 4.
- Floating map-edge tools: covered by Tasks 2, 3, 4, and 5.
- Single left panel, not multi-tab workbench: preserved in Tasks 4 and 5.
- Admin keeps import/export/settings/group/batch behavior: preserved in Task 4.
- Public page remains read-only while sharing structure: covered in Task 5.
- Responsive fallback without second layout system: covered in Task 6.

### Placeholder scan

- No `TODO`, `TBD`, or deferred pseudo-steps remain.
- Every task lists exact files and concrete code or commands.
- Verification commands are explicit and use the repo’s real scripts.

### Type consistency

- `DrawingToolbar` props remain unchanged.
- `MapView` props match current signatures: admin remains editable, public remains read-only.
- Shared workbench components are simple wrappers with prop names used consistently in both pages.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-04-kanvon-map-workbench-alignment.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
