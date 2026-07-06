# 后台地图编辑页参考图对齐实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将后台地图编辑页重构为参考图式专业 GIS 工作台，完成顶部横向工具条、左侧一体化工作面板、地图内辅助浮层、右侧轻量控件列的整体改造。

**架构：** 以 `AdminEditor` 为主骨架重组页面，把现有分散工具与筛选逻辑收编进新的顶部工具带和左侧工作台。保留现有业务数据流与地图交互逻辑，优先改造组件组织、状态映射和视觉层级。对 `MapView`、`AnnotationFilterPanel`、`GroupTree`、`DrawingToolbar` 做配套改造，让地图控件与页面骨架统一到同一套参考图式语言。

**技术栈：** Next.js 16、React 19、Tailwind 4、Leaflet、lucide-react

---

### 任务 1：重构 `AdminEditor` 页面骨架

**文件：**
- 修改：`src/app/admin/AdminEditor.tsx`
- 修改：`src/app/globals.css`
- 测试：`npm run lint`

- [ ] **步骤 1：编写页面骨架变更清单**

将 `AdminEditor` 顶部结构调整为：

```tsx
<div className="workbench-shell">
  <div className="paper-panel workbench-frame">
    <header className="map-workbench-header">
      <div className="map-workbench-topline">{/* logo / title / search / account */}</div>
      <div className="map-workbench-toolbar">{/* name toggle / smart / point / line / polygon / tool / export / refresh / map admin / settings */}</div>
    </header>
    <div className="map-workbench-body">
      <aside className="map-workbench-sidebar">{/* unified panel */}</aside>
      <main className="map-workbench-canvas">{/* map */}</main>
    </div>
  </div>
</div>
```

- [ ] **步骤 2：实现新头部与工具条**

在 `src/app/admin/AdminEditor.tsx` 中：

```tsx
const workbenchTabs = ['地图', '标注', '分组', '分类', '筛选'] as const;
const [panelMode, setPanelMode] = useState<typeof workbenchTabs[number]>('标注');
```

将现有双层 header 替换为单层参考图式头部，保留功能：

```tsx
<header className="map-workbench-header">
  <div className="map-workbench-topline">
    <div className="map-workbench-brand">{/* return, home, project */}</div>
    <div className="map-workbench-search">{/* keyword search */}</div>
    <div className="map-workbench-account">{/* logout / account */}</div>
  </div>
  <div className="map-workbench-toolbar">
    <button>显示名称</button>
    <button>智能标注</button>
    <button>点标注</button>
    <button>线标注</button>
    <button>面标注</button>
    <button>工具</button>
    <button>出图</button>
    <button>刷新</button>
    <Link href="/admin">地图管理</Link>
    <button>设置</button>
  </div>
</header>
```

- [ ] **步骤 3：实现新左侧工作面板框架**

在 `AdminEditor` 中新增：

```tsx
<aside className="map-workbench-sidebar">
  <div className="map-workbench-panel-tabs">
    {workbenchTabs.map((tab) => (
      <button key={tab} onClick={() => setPanelMode(tab)}>{tab}</button>
    ))}
  </div>
  <div className="map-workbench-panel-body">{/* content by panelMode */}</div>
</aside>
```

- [ ] **步骤 4：运行 lint 验证骨架改动可编译**

运行：`npm run lint`
预期：PASS，无 ESLint 报错

- [ ] **步骤 5：Commit**

```bash
git add src/app/admin/AdminEditor.tsx src/app/globals.css
git commit -m "feat: rebuild admin editor workbench shell"
```

### 任务 2：把左侧栏改成参考图式一体化工作面板

**文件：**
- 修改：`src/app/admin/AdminEditor.tsx`
- 修改：`src/components/map/AnnotationFilterPanel.tsx`
- 修改：`src/components/map/GroupTree.tsx`
- 修改：`src/app/globals.css`
- 测试：`npm run lint`

- [ ] **步骤 1：改造筛选面板为工具型密排结构**

在 `AnnotationFilterPanel.tsx` 中改掉当前分段卡片结构，收为：

```tsx
<div className="map-filter-panel">
  <div className="map-filter-panel-header">{/* title + reset */}</div>
  <div className="map-filter-panel-section">{/* keyword */}</div>
  <div className="map-filter-panel-section">{/* group/type */}</div>
  <div className="map-filter-panel-section">{/* field filters */}</div>
</div>
```

按钮、输入框、类型切换全部压缩成参考图式细线控件。

- [ ] **步骤 2：改造分组树为目录式列表**

在 `GroupTree.tsx` 中将每一行收为更轻的目录行：

```tsx
<div className="group-tree-row" data-active={isSelected}>
  <button>{isExpanded ? <ChevronDown /> : <ChevronRight />}</button>
  <span className="group-tree-dot" />
  <span className="group-tree-name">{group.name}</span>
  <span className="group-tree-count">{count}</span>
</div>
```

去掉当前偏卡片化、偏 hover 漂浮的视觉表现。

- [ ] **步骤 3：在 `AdminEditor` 中按 `panelMode` 组织内容**

实现如下映射：

```tsx
if (panelMode === '标注') { /* filtered list */ }
if (panelMode === '分组') { /* GroupTree */ }
if (panelMode === '筛选') { /* AnnotationFilterPanel */ }
if (panelMode === '地图' || panelMode === '分类') { /* contextual placeholder using existing data */ }
```

注意：本次 `分类` 不新增后端模型，只做参考图式前端容器与快捷入口占位。

- [ ] **步骤 4：运行 lint 验证左侧栏重构**

运行：`npm run lint`
预期：PASS，无 ESLint 报错

- [ ] **步骤 5：Commit**

```bash
git add src/app/admin/AdminEditor.tsx src/components/map/AnnotationFilterPanel.tsx src/components/map/GroupTree.tsx src/app/globals.css
git commit -m "feat: redesign admin sidebar as unified work panel"
```

### 任务 3：重组顶部绘制工具与地图内辅助工具

**文件：**
- 修改：`src/app/admin/AdminEditor.tsx`
- 修改：`src/components/map/DrawingToolbar.tsx`
- 修改：`src/components/map/MapView.tsx`
- 修改：`src/app/globals.css`
- 测试：`npm run lint`

- [ ] **步骤 1：将主绘制能力上收到顶部工具条**

在 `AdminEditor.tsx` 顶部工具条中，把点/线/面作为主入口：

```tsx
const setPrimaryDrawMode = (mode: DrawMode) => {
  setDrawMode((prev) => (prev === mode ? 'none' : mode));
};
```

将按钮统一映射到该方法。

- [ ] **步骤 2：缩减地图左上 `DrawingToolbar` 为辅助工具**

在 `DrawingToolbar.tsx` 中，移除与顶部重复的主绘制组，只保留：

```tsx
const extraTools = [
  { mode: 'none', label: '选择' },
  { mode: 'measure', label: '测距' },
  { mode: 'text', label: '文字' },
];
```

使其成为地图内轻量辅助条，而不是第二套主工具条。

- [ ] **步骤 3：调整 `MapView` 内地图浮层位置与风格**

在 `MapView.tsx` 中：

```tsx
<div className="absolute left-3 top-3 z-[1000]">
  <SearchBox map={mapInstance} />
</div>

<div className="absolute right-3 top-3 z-[1000]">
  {/* lightweight map type segment */}
</div>
```

保留地图搜索与图层切换，但将样式压成更像参考图的轻量条。

- [ ] **步骤 4：运行 lint 验证工具重组**

运行：`npm run lint`
预期：PASS，无 ESLint 报错

- [ ] **步骤 5：Commit**

```bash
git add src/app/admin/AdminEditor.tsx src/components/map/DrawingToolbar.tsx src/components/map/MapView.tsx src/app/globals.css
git commit -m "feat: align drawing controls with reference toolbar"
```

### 任务 4：改造右侧地图控件列与信息层级

**文件：**
- 修改：`src/app/admin/AdminEditor.tsx`
- 修改：`src/components/map/MapView.tsx`
- 修改：`src/app/globals.css`
- 测试：`npm run lint`

- [ ] **步骤 1：将右侧地图控件改成参考图式竖列**

在 `MapView.tsx` 中将现有图层/图例/缩放相关控件样式统一：

```tsx
<div className="map-side-rail">
  <button>图层</button>
  <button>图例</button>
  <div className="map-zoom-rail">{/* zoom */}</div>
</div>
```

维持现有功能，不新增复杂逻辑。

- [ ] **步骤 2：整理 `AdminEditor` 右上状态控件**

将当前 `名称 / 热力` 悬浮组改为右侧轻控件风格入口，避免与顶部工具条重复抢视觉中心。

- [ ] **步骤 3：确保信息卡与右侧控件不冲突**

在 `AdminEditor.tsx` 中调整：

```tsx
<div className="absolute right-3 top-[72px] z-[1000]">
  <InfoCard ... />
</div>
```

并在 `globals.css` 中通过固定宽度和间距保证不会压住右侧控件列。

- [ ] **步骤 4：运行 lint 验证右侧控件改造**

运行：`npm run lint`
预期：PASS，无 ESLint 报错

- [ ] **步骤 5：Commit**

```bash
git add src/app/admin/AdminEditor.tsx src/components/map/MapView.tsx src/app/globals.css
git commit -m "feat: refine map side controls and overlay hierarchy"
```

### 任务 5：最终样式收束与构建验证

**文件：**
- 修改：`src/app/globals.css`
- 测试：`npm run lint`
- 测试：`npm run build`

- [ ] **步骤 1：统一参考图式样式变量和新类**

在 `globals.css` 中补齐并收束这些类：

```css
.map-workbench-header {}
.map-workbench-topline {}
.map-workbench-toolbar {}
.map-workbench-sidebar {}
.map-workbench-panel-tabs {}
.map-workbench-panel-body {}
.map-side-rail {}
.group-tree-row {}
.map-filter-panel {}
```

要求：更白、更细、更轻、更密，激活态才用恺烨绿。

- [ ] **步骤 2：运行 lint**

运行：`npm run lint`
预期：PASS

- [ ] **步骤 3：运行 build**

运行：`npm run build`
预期：PASS，`/admin` 页面构建成功

- [ ] **步骤 4：Commit**

```bash
git add src/app/globals.css src/app/admin/AdminEditor.tsx src/components/map/AnnotationFilterPanel.tsx src/components/map/GroupTree.tsx src/components/map/DrawingToolbar.tsx src/components/map/MapView.tsx
git commit -m "feat: complete reference-inspired admin workbench redesign"
```

