# 恺烨地图后台编辑页 A1 重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将后台编辑页重构为浅底、细线、直角、地图优先的冷峻编辑台，并移除旧方案中的大圆角、主题词和展示页气质。

**架构：** 保留现有数据流与功能边界，只重做后台编辑页骨架、全局工作台样式和关键编辑控件。通过 `globals.css` 定义 A1 视觉令牌，在 `AdminEditor` 中重排结构与文案，再同步收敛绘制工具、筛选面板、详情卡和侧栏切换的样式。

**技术栈：** Next.js App Router、React、Tailwind 4、lucide-react

---

### 任务 1：重做全局工作台视觉基底

**文件：**
- 修改：`src/app/globals.css`

- [ ] **步骤 1：调整工作台变量与基础结构**

把当前偏纸感和品牌包装式变量替换为 A1 冷峻编辑台变量，重点收紧背景、边框、阴影和工具按钮体系。

- [ ] **步骤 2：新增 A1 专用工具类**

在 `globals.css` 中补齐以下类并统一其语义：

```css
.workbench-topbar
.workbench-sidebar
.workbench-toolbar-button
.workbench-toolbar-button-active
.workbench-segment
.workbench-segment-active
.workbench-panel
.workbench-field
.workbench-list-row
```

- [ ] **步骤 3：运行 lint 验证纯样式改动未引入问题**

运行：`npm run lint`
预期：PASS

### 任务 2：重构后台编辑页骨架与文案

**文件：**
- 修改：`src/app/admin/AdminEditor.tsx`

- [ ] **步骤 1：清理主题词与包装文案**

删除所有类似以下内容：

```tsx
Kanvon Editing Desk
annotation desk
editor
```

保留工具语言：

```tsx
地图名称
地图管理
导入
导出
设置
退出
```

- [ ] **步骤 2：重排顶部工具带**

将顶部改造成三段：

```tsx
左：返回列表 / 返回前台 / 当前地图名
中：搜索
右：地图管理 / 导入 / 导出 / 设置 / 退出
```

并统一为直角细边框按钮。

- [ ] **步骤 3：重做左侧栏骨架**

把左侧栏改成更硬朗的编辑边栏：

```tsx
标题摘要区
模式切换区（标注 / 分组）
筛选区
列表区
设置区
```

列表项使用激活线而非厚底卡片表达选中。

- [ ] **步骤 4：重做地图区域外框与浮动工具布局**

移除地图主容器大圆角，保留轻边框。确保左上绘制工具、右上浮动工具和右侧详情卡视觉统一。

- [ ] **步骤 5：运行 lint 验证页面结构修改**

运行：`npm run lint`
预期：PASS

### 任务 3：重构关键控件样式

**文件：**
- 修改：`src/components/map/DrawingToolbar.tsx`
- 修改：`src/components/map/AnnotationFilterPanel.tsx`
- 修改：`src/components/map/InfoCard.tsx`
- 修改：`src/components/map/workbench/MapFloatingPanel.tsx`
- 修改：`src/components/map/workbench/WorkbenchSidebarToggle.tsx`

- [ ] **步骤 1：重做绘制工具条**

将 `DrawingToolbar` 从圆角胶囊组改为直角工具组，激活态使用深绿实底或描边，不使用饱满阴影。

- [ ] **步骤 2：重做筛选面板**

将 `AnnotationFilterPanel` 改成查询面板语义：

```tsx
更紧凑
直角输入
轻量分隔
去圆润卡片
```

- [ ] **步骤 3：重做详情卡**

将 `InfoCard` 改成审阅编辑面板：

```tsx
直角或极小倒角
更薄标题栏
更规整字段区
更克制按钮区
```

- [ ] **步骤 4：重做侧栏收起按钮与浮动工具容器**

移除大圆角和漂浮感过重的样式，改成更像系统控制柄。

- [ ] **步骤 5：运行 lint 验证组件修改**

运行：`npm run lint`
预期：PASS

### 任务 4：浏览器验收

**文件：**
- 无新增文件

- [ ] **步骤 1：打开后台编辑页并刷新**

在现有本地开发环境中刷新后台编辑页。

- [ ] **步骤 2：检查验收点**

确认：

```text
没有大圆角主容器
没有主题词/口号文案
地图仍是视觉中心
左侧栏、工具条、详情卡已统一为浅底细线直角体系
```

- [ ] **步骤 3：记录剩余问题并做最后微调**

只修视觉残留问题，不扩展范围。
