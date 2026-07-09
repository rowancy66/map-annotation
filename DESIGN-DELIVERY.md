# MapMark · Notion 风格原型交付说明

> **项目**：MapMark — 基于天地图的在线地图标注平台
> **视觉方向**：Notion 风格 · Modern Minimal × Tech Utility
> **状态**：审查通过，可进入开发落地

---

## 1. 项目概述

MapMark 是一款面向 B2B 协作场景的在线地图标注工具，底层使用天地图，用户可在地图上创建、编辑、分组、筛选点 / 线 / 面标注，并导出结构化数据。

本次交付的是 **Notion 风格的交互式高保真原型**，包含两屏核心界面：

- **Admin 地图列表**：展示用户创建的所有地图卡片、统计信息、新建 / 删除操作。
- **地图编辑器**：完整的地图标注工作界面，含左侧标注 / 分组 / 分类 / 筛选面板、地图画布、工具栏、测量浮层、属性信息卡、状态栏。

原型采用纯 HTML + 内联 CSS + 内联 SVG 实现，**无需任何外部依赖**，浏览器直接打开即可预览与交互。

---

## 2. 交付文件清单

| 文件名 | 路径 | 大小 | 说明 |
|--------|------|------|------|
| `notion-style-preview.html` | `/Users/cy/Documents/cola输出文件/map/map-annotation/notion-style-preview.html` | 62 KB | 主原型文件，含 Admin 列表与地图编辑器两屏，所有资源内联 |
| `notion-style-preview.pdf` | `/Users/cy/Documents/cola输出文件/map/map-annotation/notion-style-preview.pdf` | 446 KB | PDF 快照，横向 A4，两屏分页，便于分享与评审 |
| `design-tokens.md` | `/Users/cy/Documents/cola输出文件/map/map-annotation/design-tokens.md` | 24 KB | 设计令牌与组件规范，开发落地的唯一事实来源 |
| `DESIGN-DELIVERY.md` | `/Users/cy/Documents/cola输出文件/map/map-annotation/DESIGN-DELIVERY.md` | — | 本交付说明文件 |

### 依赖说明

- `notion-style-preview.html` **零外部依赖**：CSS、SVG 图标、地图占位图形全部内联，无 CDN、无外部字体、无图片链接。
- 兼容主流浏览器：Chrome / Edge / Safari / Firefox（推荐 Chrome / Safari 获得最佳字体渲染）。

---

## 3. 设计决策说明

### 3.1 为什么选 Notion 风格

在候选方案中（Notion / Linear / Raycast），最终选择 **Notion** 作为核心视觉系统，原因如下：

| 维度 | 决策依据 |
|------|----------|
| **任务场景** | MapMark 是长时间专注型工具，用户需要持续注视地图与数据面板，低饱和度 UI 不会与天地图底图产生视觉竞争。 |
| **品牌气质** | 用户要求“专业工具感 + 轻量极简”，Notion 的暖灰白背景、墨炭文字、低调边框、小圆角完美契合。 |
| **可扩展性** | Notion 的组件范式（侧边栏、卡片、标签、对话框、工具栏）天然适配地图编辑器的信息密度需求。 |
| **落地成本** | 变量系统与 Tailwind CSS 4 的 `@theme` 机制高度兼容，可直接映射为开发变量。 |

### 3.2 做了哪些定制

在保留 Notion 核心特征的基础上，针对 MapMark 的地图场景做了以下适配：

1. **地图层级优先**
   - UI 主色调整为 `--primary-default: #0A4B3F`（墨绿），用于主按钮、强操作与品牌 Logo，既保留品牌识别又避免高饱和色彩抢夺地图注意力。
   - 强调色 `--accent-default: #2EAADC` 仅用于链接、选中态、地图高亮、info 提示。

2. **编辑器布局定制**
   - 采用“固定侧边栏（240px）+ 流体地图画布 + 底部状态栏（28px）+ 顶部工具栏（44px）”的三明治结构。
   - 侧边栏支持 56px 图标收起态（响应式），移动端变为 Drawer。

3. **组件密度提升**
   - 按钮默认高度 32px、输入框 32px、行高 1.4-1.6，保证编辑器的信息密度。
   - 卡片使用 6px 圆角、1px 细边框，不使用阴影，保持纸面感。

4. **语义色克制使用**
   - 成功 / 警告 / 错误仅用于状态反馈和标签，不作为主按钮或大面积背景。
   - 危险操作（删除）使用 `--danger-text` 文字，悬停时填充 `--danger-bg`。

5. **中文排版优化**
   - 字体栈使用 `Inter + Noto Sans SC + PingFang SC + Microsoft YaHei + system-ui`，确保中西文混排清晰。
   - 正文基线 14px，标题最大 28px，避免装饰性字体干扰。

---

## 4. 质量审查报告摘要

### 4.1 第二轮 5 维评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 设计哲学 | 4 / 5 | Notion 风格与 MapMark 工具属性高度契合，信息层级清晰，无明显过度设计。 |
| 视觉层次 | 4 / 5 | 卡片、工具栏、地图、侧边栏的层级通过背景色与边框明确区分，热力图/显示名称切换增加了状态可读性。 |
| 执行质量 | 4 / 5 | 所有组件样式一致，交互状态（hover / active / disabled）完整，SVG 图标与地图占位图形均内联。 |
| 特异性 | 4 / 5 | 针对地图标注场景做了专属布局（测量浮层、图层切换、信息卡、地图控件），不只是通用模板的套用。 |
| 克制 | 4 / 5 | 未使用大圆角、重阴影、渐变背景、装饰性插图，整体保持低调专业。 |

**总分：20 / 25**

### 4.2 审查结论

- **结论**：通过，P0 问题已全部修复。
- **状态**：可进入开发落地阶段。

### 4.3 剩余 P1 建议（非阻塞）

以下建议可在后续迭代中优化，不影响当前交付与开发启动：

1. **空状态**：Admin 列表和地图编辑器的标注列表面板可增加空状态占位图，提升无数据时的引导感。
2. **右侧面板**：当前编辑器只有左侧边栏，未来可补充 240px 右侧面板用于显示属性 / 图层，与桌面端宽屏配合。
3. **键盘快捷键**：工具栏可补充 `Esc` 取消测距、`Del` 删除选中标注等快捷键提示。
4. **动画强度**：地图标记悬停缩放、信息卡出现等动效可进一步收敛，保持 Notion 的“无感”体验。

---

## 5. 如何查看原型

### 5.1 浏览器打开（推荐）

直接在文件系统中双击或拖拽以下文件到浏览器：

```
/Users/cy/Documents/cola输出文件/map/map-annotation/notion-style-preview.html
```

打开后：

- 顶部可见 **“Admin 地图列表”** 与 **“地图编辑器”** 两个切换按钮。
- 点击 **“地图编辑器”** 进入地图标注工作界面。
- 点击地图卡片或编辑按钮也可进入编辑器。
- 编辑器中可点击左侧“标注 / 分组 / 分类 / 筛选”标签切换侧边栏面板。
- 点击地图卡片上的删除按钮或顶部新建按钮可触发对话框。

### 5.2 PDF 查看

直接打开：

```
/Users/cy/Documents/cola输出文件/map/map-annotation/notion-style-preview.pdf
```

PDF 为横向 A4 两页，分别展示 Admin 列表与地图编辑器，适合打印、邮件分享或评审会议使用。

---

## 6. 如何落地到代码

项目技术栈：**Next.js 16 + Tailwind CSS 4 + TypeScript**

### 6.1 替换全局样式

将 `design-tokens.md` 中 `9.2 Quick CSS Snippet` 的 `:root` 变量复制到 `app/globals.css` 顶部，并追加 `9.3` 中的 `@theme` 块，完成 Tailwind 4 映射：

```css
/* app/globals.css */
:root {
  --bg-page: #ffffff;
  --bg-sidebar: #f7f6f3;
  --bg-surface: #ffffff;
  /* ... 完整变量见 design-tokens.md 9.2 ... */
}

@theme {
  --color-bg-page: var(--bg-page);
  --color-bg-sidebar: var(--bg-sidebar);
  --color-bg-surface: var(--bg-surface);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-border-subtle: var(--border-subtle);
  --color-primary: var(--primary-default);
  --color-accent: var(--accent-default);
  /* ... 完整映射见 design-tokens.md 9.3 ... */
}
```

### 6.2 按组件拆分实现

建议按以下组件拆分，与原型结构一一对应：

| 原型区域 | 建议组件 | 主要 Tailwind 类参考 |
|----------|----------|----------------------|
| 顶部切换栏 | `PrototypeSwitcher` | `fixed top-0 h-12 bg-surface-primary border-b border-border-subtle` |
| Admin 控制台头部 | `AdminHeader` | `sticky top-0 h-14 bg-surface-primary border-b` |
| 统计卡片 | `StatCard` | `w-40 p-3 border rounded-lg` |
| 地图卡片 | `MapCard` | `card border border-border-subtle rounded-lg hover:border-border-default` |
| 工具栏 | `EditorToolbar` | `h-11 bg-surface-primary border-b flex items-center gap-1` |
| 侧边栏 | `Sidebar` | `w-60 bg-bg-sidebar border-r` |
| 标注列表项 | `AnnotationItem` | `flex items-center gap-2 px-3 py-2 rounded hover:bg-bg-hover active:bg-bg-selected` |
| 地图画布 | `MapCanvas` | `flex-1 relative bg-surface-tertiary overflow-hidden` |
| 信息卡 | `InfoCard` | `absolute top-3 right-3 w-70 bg-white/96 border rounded-lg shadow-raised` |
| 状态栏 | `StatusBar` | `h-7 bg-surface-secondary border-t flex items-center justify-between` |
| 对话框 | `Dialog` | `fixed inset-0 bg-bg-overlay backdrop-blur-sm flex items-center justify-center` |

### 6.3 关键落地注意事项

1. **圆角保持克制**：输入框 3px、按钮 4px、卡片 6px、对话框 8px；避免使用默认 `rounded-lg` 给按钮/输入框。
2. **阴影仅用于浮层**：默认卡片和面板不加阴影，只有 `dropdown / modal / popover / map panel` 使用对应阴影变量。
3. **颜色取值来源**：所有新组件必须从 `design-tokens.md` 中的变量取值，不要随机生成新色值。
4. **地图控件层级**：地图上的浮动控件（缩放、图层切换、信息卡、测量浮层）必须使用半透明表面 + 细边框，避免遮挡天地图底图要素。
5. **中文回退**：字体栈中保留 `PingFang SC / Microsoft YaHei / system-ui`，避免 Windows 设备上中文字体缺失。
6. **响应式断点**：
   - `>=1024px`：完整三列编辑器，侧边栏 240px。
   - `640px-1023px`：侧边栏折叠为 56px 图标栏。
   - `<640px`：侧边栏变为 Drawer 覆盖地图。

### 6.4 天地图集成建议

原型中的地图画布使用 SVG 占位图，开发落地时替换为真实天地图组件：

- 使用 `react-leaflet` 或天地图官方 JS API 加载底图。
- 将标注数据（点 / 线 / 面）渲染为地图叠加层。
- 保持地图控件（缩放、图层切换、测量、信息卡）的 DOM 位置与原型一致，通过 `position: absolute` 或地图库的 overlay 机制挂载。
- 地图标记颜色与 `design-tokens.md` 语义色保持一致（住宅-红、商业-橙、交通-蓝等）。

---

## 7. 交付确认

- [x] HTML 原型已验证为独立可运行文件（CSS / SVG 全部内联，无外部 CDN）。
- [x] PDF 版本已生成，横向 A4，两屏分页。
- [x] 设计令牌文件 `design-tokens.md` 已随原型一并交付。
- [x] 本交付说明文件已包含项目概述、文件清单、设计决策、审查摘要、查看方式与落地说明。

---

> **交付人**：导出交付专家（交付达）  
> **交付日期**：2026-07-09  
> **下一步**：建议将 `design-tokens.md` 作为开发唯一事实来源，按第 6 节指引替换 `globals.css` 并拆分组件。
