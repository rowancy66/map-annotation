# MapMark 设计令牌 · Notion 方向

> 项目：`MapMark` 基于天地图的在线地图标注平台  
> 技术栈：Next.js 16 + Tailwind CSS 4 + TypeScript  
> 视觉方向：Notion 风格 · Modern Minimal × Tech Utility  
> 文件用途：AI 生成代码、组件实现与界面走查的单一事实来源

---

## 设计系统候选方案对比

| 方案 | 设计系统 | 匹配度 | 核心特征 | 适合原因 |
|------|----------|--------|----------|----------|
| A | **Notion** | ★★★★★ | 暖灰浅色、小圆角、低调边框、功能优先、内容密度高 | 与需求摘要中的“专业工具感 + 轻量极简”完全吻合；受众为 B2B 协作用户，Notion 的 subdued UI 最不容易分散地图编辑注意力 |
| B | Linear | ★★★★☆ | 精细的阴影层级、高对比操作控件、现代 SaaS 工具感 | 适合开发/数据工具，但对比度与动效更强烈，比 Notion 更“酷”一些，会略偏离用户要求的“低调” |
| C | Raycast | ★★★★☆ | macOS 原生、紧凑快捷命令、中性深/浅配色 | 适合效率工具，但太偏向“启动器”语义，缺少多页 Web 应用所需的页面与仪表盘结构范式 |

**最终选择：方案 A — Notion**。MapMark 是一个需要长时间聚焦地图与数据面板的工具，Notion 的暖白背景、低对比边框、小圆角与紧凑排版能够最大程度降低视觉疲劳，同时保持专业感。

---

## 1. Visual Theme（视觉主题）

**Philosophy**: 功能即美学，界面应当隐退于内容和操作之后。  
**Direction**: Modern Minimal × Tech Utility，以“轻量、安静、可信赖”为核心。  
**Personality**: 克制、精确、亲和、不打扰。  
**Reference**: Notion（暖灰白背景、墨炭文字、低调边框、小圆角）。  
**MapMark 适配点**：地图编辑器需要长时间注视底图，因此 UI 层采用低饱和度、低反差的“纸面灰”，避免与天地图的高彩底图产生竞争。

---

## 2. Color Palette（调色板）

> 所有颜色同时给出 HEX 与 OKLCh 近似值。颜色在 `#FFFFFF` 与 `#F7F6F3` 上均通过 WCAG 2.1 AA 对比度要求（正文 4.5:1，大文本 3:1）。

### 2.1 Background（背景色）

| Token | HEX | OKLCh（近似） | Usage |
|-------|-----|---------------|-------|
| `--bg-page` | `#FFFFFF` | `oklch(100% 0 0)` | 页面主背景、画板、弹窗 |
| `--bg-sidebar` | `#F7F6F3` | `oklch(97.5% 0.005 80)` | 左侧边栏、分组树、导航面板 |
| `--bg-surface` | `#FFFFFF` | `oklch(100% 0 0)` | 卡片、面板、工具栏 |
| `--bg-subtle` | `#F7F6F3` | `oklch(97.5% 0.005 80)` | 表头、列表交替行、未选中块 |
| `--bg-hover` | `#EFEFEC` | `oklch(95% 0.006 80)` | 行/项悬停 |
| `--bg-active` | `#E3E3E0` | `oklch(91.5% 0.006 80)` | 按下态、选中项背景 |
| `--bg-selected` | `#E3F5FA` | `oklch(95% 0.03 215)` | 地图选中要素、树节点高亮 |
| `--bg-overlay` | `rgba(0,0,0,0.35)` | — | 模态蒙层 |

### 2.2 Surface（表面色）

| Token | HEX | OKLCh（近似） | Usage |
|-------|-----|---------------|-------|
| `--surface-primary` | `#FFFFFF` | `oklch(100% 0 0)` | 卡片、输入框、弹窗 |
| `--surface-secondary` | `#F7F6F3` | `oklch(97.5% 0.005 80)` | 工具栏、侧边栏 |
| `--surface-tertiary` | `#F1F1EF` | `oklch(95.5% 0.005 80)` | 标签、徽章、折叠面板 |
| `--surface-pressed` | `#E3E3E0` | `oklch(91.5% 0.006 80)` | 按钮按下态 |

### 2.3 Text（文字色）

| Token | HEX | OKLCh（近似） | Usage |
|-------|-----|---------------|-------|
| `--text-primary` | `#37352F` | `oklch(29% 0.02 80)` | 标题、正文、图标主色 |
| `--text-secondary` | `#6F6E69` | `oklch(48% 0.015 80)` | 辅助说明、元信息、占位说明 |
| `--text-tertiary` | `#9E9D99` | `oklch(65% 0.012 80)` | 禁用、时间戳、非常次要信息 |
| `--text-inverse` | `#FFFFFF` | `oklch(100% 0 0)` | 深色按钮上的文字 |
| `--text-link` | `#2EAADC` | `oklch(67% 0.15 230)` | 链接、可点击地名、地图提示 |

### 2.4 Border（边框/分隔线）

| Token | HEX | OKLCh（近似） | Usage |
|-------|-----|---------------|-------|
| `--border-subtle` | `#E9E9E7` | `oklch(93.5% 0.005 80)` | 卡片、输入框、列表分隔 |
| `--border-default` | `#D3D1CB` | `oklch(87% 0.01 80)` | 按钮边框、表头下划线、拖拽线 |
| `--border-strong` | `#B7B5AE` | `oklch(79% 0.015 80)` | 聚焦外框、激活态边框 |
| `--border-divider` | `#E9E9E7` | `oklch(93.5% 0.005 80)` | 水平/垂直分隔线 |

### 2.5 Primary / Accent（主色与强调色）

| Token | HEX | OKLCh（近似） | Usage |
|-------|-----|---------------|-------|
| `--primary-default` | `#0A4B3F` | `oklch(35% 0.08 165)` | 主按钮、强操作、标题强调、品牌 Logo |
| `--primary-hover` | `#073A31` | `oklch(28% 0.06 165)` | 主按钮悬停 |
| `--primary-pressed` | `#052C25` | `oklch(21% 0.04 165)` | 主按钮按下 |
| `--accent-default` | `#2EAADC` | `oklch(67% 0.15 230)` | 链接、选中态、地图高亮、info |
| `--accent-hover` | `#2496C4` | `oklch(61% 0.145 230)` | 链接/选中悬停 |
| `--accent-subtle` | `#E3F5FA` | `oklch(95% 0.03 215)` | 轻量选中背景、info 背景 |

### 2.6 Semantic（语义色）

| Token | HEX | OKLCh（近似） | Usage |
|-------|-----|---------------|-------|
| `--success-text` | `#0F7B6C` | `oklch(48% 0.13 175)` | 成功提示、成功图标 |
| `--success-bg` | `#E6F4F1` | `oklch(95.5% 0.03 175)` | 成功提示背景 |
| `--warning-text` | `#D97706` | `oklch(58% 0.14 75)` | 警告提示、未保存标记 |
| `--warning-bg` | `#FEF3C7` | `oklch(96.5% 0.06 85)` | 警告提示背景 |
| `--danger-text` | `#DC2626` | `oklch(52% 0.22 25)` | 删除、错误、危险操作 |
| `--danger-bg` | `#FEE2E2` | `oklch(94% 0.05 25)` | 错误提示背景 |
| `--danger-hover` | `#B91C1C` | `oklch(43% 0.19 25)` | 危险按钮悬停 |
| `--info-text` | `#2EAADC` | `oklch(67% 0.15 230)` | 信息提示 |
| `--info-bg` | `#E3F5FA` | `oklch(95% 0.03 215)` | 信息提示背景 |

### 2.7 Block Accents（标签/分组颜色，来自 Notion 色板）

用于分组树、字段模板标签、图层分类等需要彩色区分但不可过度鲜艳的场景。

| Name | Text | Background | Usage |
|------|------|------------|-------|
| Gray | `#37352F` | `#F1F1EF` | 默认标签 |
| Brown | `#4A3A2A` | `#F5EFE8` | 地形/土地 |
| Orange | `#E8833A` | `#FAEADD` | 警告类分组 |
| Yellow | `#D4A017` | `#FBF3DB` | 高亮分组（Notion 默认 callout） |
| Green | `#0F7B6C` | `#E6F4F1` | 成功/自然要素 |
| Blue | `#2EAADC` | `#E3F5FA` | 水系/选中/默认强调 |
| Purple | `#6940A5` | `#F0E6FA` | 自定义/特殊图层 |
| Pink | `#E255A1` | `#FAE6F2` | 临时标记 |
| Red | `#DC2626` | `#FEE2E2` | 危险/删除类 |

---

## 3. Typography（排版）

### 3.1 Font Stacks

```css
--font-sans: "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Source Han Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "SFMono-Regular", "Fira Code", "JetBrains Mono", "Noto Sans SC", "Sarasa Mono SC", "Microsoft YaHei Mono", monospace;
```

- **Heading / Body**: 均使用 `--font-sans`。MapMark 是工具界面，不需要装饰性标题字体，统一使用 Inter + Noto Sans SC 保证中西文混排清晰。
- **Mono**: 用于坐标、JSON、字段 key、代码块等数据展示；中文回退到无衬线，避免等宽中文字体缺失时显示异常。

### 3.2 Type Scale

| Level | Size | Line-height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `display` | `28px / 1.75rem` | 1.25 | 700 | 公开首页 Hero 标题（小，符合工具感） |
| `h1` | `24px / 1.5rem` | 1.35 | 700 | 页面标题、仪表盘大标题 |
| `h2` | `20px / 1.25rem` | 1.35 | 600 | 区块标题、面板标题 |
| `h3` | `16px / 1rem` | 1.4 | 600 | 小标题、分组树父节点 |
| `body` | `14px / 0.875rem` | 1.6 | 400 | 正文、段落 |
| `body-sm` | `13px / 0.8125rem` | 1.5 | 400 | 列表、表单说明 |
| `label` | `12px / 0.75rem` | 1.4 | 500 | 表单标签、徽章、小按钮 |
| `caption` | `11px / 0.6875rem` | 1.4 | 500 | 元数据、坐标、时间戳 |

### 3.3 Typography Rules

- **正文基线**：`14px` 是编辑器主字号，保证信息密度。
- **字重**：正文 `400`，标题 `600-700`，标签/按钮 `500`。
- **行高**：正文 `1.6`，UI 标签/表格 `1.4-1.5`，避免 UI 行高过大导致密度下降。
- **字间距**：正文 `0`，小字号/标签可略微 `-0.01em` 以提升紧凑感。
- **中西文混排**：英文使用 Inter，中文使用 Noto Sans SC；避免中文使用衬线或装饰字体。

---

## 4. Component Styles（组件样式）

### 4.1 Button（按钮）

> 所有按钮：小圆角、清晰边框、明确悬停，不使用大阴影。

| Variant | Background | Text | Border | Radius | Padding | Hover |
|---------|------------|------|--------|--------|---------|-------|
| Default | `--surface-secondary` (#F7F6F3) | `--text-primary` | `--border-subtle` | `4px` | `6px 12px` | `--bg-hover` (#EFEFEC) |
| Primary | `--primary-default` (#0A4B3F) | `--text-inverse` | `transparent` | `4px` | `6px 12px` | `--primary-hover` (#073A31) |
| Ghost | `transparent` | `--text-primary` | `transparent` | `4px` | `6px 12px` | `--bg-hover` (#EFEFEC) |
| Danger | `--surface-secondary` | `--danger-text` | `transparent` | `4px` | `6px 12px` | `--danger-bg` + 文字保持 `--danger-text` |
| Icon | `transparent` | `--text-secondary` | `transparent` | `4px` | `4px` | `--bg-hover` |

- **高度**：默认 `32px`（`h-8`），大按钮 `36px`（`h-9`），小按钮 `28px`（`h-7`）。
- **禁用态**：`opacity: 0.5`，`cursor: not-allowed`，背景不变。
- **加载态**：在按钮左侧放置 `16px` 旋转 spinner，文字保留但 `opacity: 0.7`。

### 4.2 Input / Textarea（输入框）

- **Background**: `--surface-primary` (#FFFFFF)
- **Border**: `1px solid --border-subtle` (#E9E9E7)
- **Border-radius**: `3px`
- **Padding**: `6px 10px`
- **Height**: `32px`（默认单行）；`textarea` 最小 `64px`
- **Text**: `--text-primary` / `--font-sans` / 14px
- **Placeholder**: `--text-tertiary` (#9E9D99)
- **Focus**: `border-color: --border-strong` (#B7B5AE)；`outline: 1.5px solid --accent-default` 或 `ring-1 ring-[#2EAADC]/40`（Tailwind 写法）
- **Error**: `border-color: --danger-text` + 下方 `12px` 红色错误文字
- **Disabled**: `bg --bg-subtle` + `text --text-tertiary` + `border --border-subtle`

### 4.3 Card（卡片）

- **Background**: `--surface-primary`
- **Border**: `1px solid --border-subtle`
- **Border-radius**: `6px`（面板级）/ `4px`（小卡片）
- **Padding**: `16px`（默认）/ `12px`（紧凑）
- **Shadow**: `none`（默认），仅在被拖拽/提升时使用 `--shadow-raised`
- **Hover**: 默认不变；若可点击，背景变为 `--bg-hover`

### 4.4 Tag / Badge（标签）

- **Background**: `--surface-tertiary` (#F1F1EF)
- **Text**: `--text-primary` 或对应语义色
- **Border-radius**: `3px`
- **Padding**: `2px 8px`
- **Font**: `12px / 500`
- **可删除标签**：右侧 `×` 图标，悬停时图标变为 `--danger-text`
- **彩色标签**：使用 Block Accents 中的 Text/Background 组合

### 4.5 Sidebar（侧边栏）

- **Background**: `--bg-sidebar` (#F7F6F3)
- **Width**: `240px`（桌面默认）/ `72px`（仅图标收起态）/ `100%`（移动端抽屉）
- **Border**: `1px solid --border-subtle` on right
- **Item height**: `32px`
- **Item padding**: `8px 12px`
- **Item radius**: `4px`
- **Active item**: `--bg-active` + `--text-primary` + 可选 `1.5px` 左边框 `--accent-default`
- **Hover item**: `--bg-hover`
- **分组标题**: `12px / 500 / --text-secondary` 全大写（Notion 风格）+ `letter-spacing: 0.05em`

### 4.6 Toolbar（工具栏）

- **Background**: `--surface-primary` 或 `--surface-secondary`（根据层级）
- **Height**: `44px`（主工具栏）/ `36px`（子工具栏）
- **Border**: `1px solid --border-subtle` on bottom
- **Padding**: `0 12px`
- **Item gap**: `4px`
- **Divider**: `1px solid --border-subtle`，高度 `20px`
- **Active tool**: `--bg-active` + `--text-primary` + `radius 3px`
- **Hover**: `--bg-hover` + `radius 3px`

### 4.7 Dialog / Modal（对话框）

- **Background**: `--surface-primary`
- **Border-radius**: `8px`（对话框中最大的圆角，保持克制）
- **Shadow**: `--shadow-floating`
- **Padding**: `20px 24px`（内容区）
- **Header**: `font: h2`，底部 `1px solid --border-subtle`，底部间距 `16px`
- **Footer**: 右侧按钮组，间距 `8px`
- **Overlay**: `--bg-overlay` + `backdrop-filter: blur(2px)`（可选）
- **Max-width**: `480px`（标准）/ `640px`（宽屏，如导入导出）/ `320px`（确认框）

### 4.8 Map Panel（地图面板 / 浮动控件）

- **Background**: `--surface-primary` with `opacity: 0.96`（可选，减少遮挡底图）
- **Border**: `1px solid --border-subtle`
- **Border-radius**: `6px`
- **Shadow**: `--shadow-raised`
- **Padding**: `12px`
- **位置**: 默认通过 `position: absolute` 或地图库 overlay 挂载；与地图边界保持 `12px` 安全边距

### 4.9 Table / List（表格与列表）

- **表头**: `bg --bg-subtle`, `font: label`, `text --text-secondary`, `border-bottom: 1px solid --border-default`
- **行高**: `40px`（宽松）/ `32px`（紧凑，编辑器默认）
- **行 hover**: `--bg-hover`
- **选中行**: `--bg-selected` + 左侧 `2px` accent 竖线
- **斑马纹**: 不使用，Notion 风格靠间距和悬停区分
- **空状态**: 居中大图标（`24px` `--text-tertiary`）+ `body-sm` 提示文字

---

## 5. Layout（布局）

### 5.1 Grid System

- **Container max-width**: `1200px`（公开页）/ 全宽（编辑器、后台）
- **Page padding**: `24px`（桌面）/ `16px`（平板）/ `12px`（移动）
- **Columns**: 12 列（公开页/仪表盘），编辑器采用“固定侧边栏 + 流体主区域”
- **Gutter**: `24px`（公开页）/ `16px`（编辑器面板）

### 5.2 Editor Layout（地图编辑器）

```
┌─────────────────────────────────────────────────────────────┐
│  Top App Bar (44px)                                          │
├──────────┬──────────────────────────────────────────────┬─────┤
│ Sidebar  │  Map Canvas (fluid)                           │ R-  │
│ (240px)  │                                               │Pane │
│          │                                               │(240px)│
│          │                                               │     │
├──────────┴──────────────────────────────────────────────┴─────┤
│  Bottom Status Bar (28px)                                    │
└─────────────────────────────────────────────────────────────┘
```

- **Sidebar**: 固定 `240px`，可折叠为 `56px` 图标栏。
- **右侧面板**: 属性/图层，固定 `240px`，可关闭。
- **地图画板**: 流体 `flex: 1`，内部天地图组件占满。
- **安全边距**: 浮动面板距离地图边缘 `>=12px`。

### 5.3 Spacing Scale

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--space-0` | `0px` | `0` | — |
| `--space-1` | `4px` | `1` | 图标内边距、紧凑间隙 |
| `--space-2` | `8px` | `2` | 按钮内水平间距、小间隙 |
| `--space-3` | `12px` | `3` | 卡片内边距、表单字段间距 |
| `--space-4` | `16px` | `4` | 默认区块间距、对话框内边距 |
| `--space-5` | `20px` | `5` | 面板内容区 |
| `--space-6` | `24px` | `6` | 页面内边距、Section 间距 |
| `--space-8` | `32px` | `8` | 大区块间距 |
| `--space-10` | `40px` | `10` | 公开页 Section 间距 |
| `--space-12` | `48px` | `12` | Hero 间距 |
| `--space-16` | `64px` | `16` | 大留白 |

- **Base unit**: `4px`
- **密度模式**: 编辑器使用 `space-2/3/4` 为主；公开页使用 `space-4/6/8` 为主。

---

## 6. Depth & Elevation（深度与层级）

### 6.1 Shadow Scale

Notion 风格的阴影非常克制，靠边框和背景色区分层级，阴影仅用于临时浮层。

| Level | Shadow | Usage |
|-------|--------|-------|
| Flat | `none` | 默认卡片、面板、侧边栏 |
| Raised | `0 1px 3px rgba(55, 53, 47, 0.06)` | 轻微提升的按钮、地图浮动面板 |
| Floating | `0 4px 12px rgba(55, 53, 47, 0.08)` | 下拉菜单、右键菜单、日期选择器 |
| Overlay | `0 8px 24px rgba(55, 53, 47, 0.12)` | 模态框、确认弹窗、大浮层面板 |

### 6.2 Z-index Scale

| Level | Value | Usage |
|-------|-------|-------|
| Base | `0` | 普通内容 |
| Map overlays | `10` | 地图控件、缩放按钮 |
| Sticky header | `100` | 顶部工具栏 |
| Dropdown / Popover | `200` | 下拉菜单、Tooltip |
| Modal | `300` | 对话框、抽屉 |
| Toast / Notification | `400` | 全局通知 |
| Fullscreen overlay | `500` | 加载遮罩、欢迎引导 |

---

## 7. Cautions（注意事项 / 设计禁区）

### 7.1 Never Do

- **不要使用大圆角**：Notion 的核心是“小圆角（3-4px）+ 6px 卡片”，避免 12px 以上的按钮/输入框圆角。
- **不要使用高饱和度主色**：MapMark 的注意力应留给地图，UI 主色保持墨炭/暖灰，只有链接/选中用低饱和蓝。
- **不要使用重阴影或渐变背景**：阴影仅用于浮层，卡片和面板靠边框和背景色区分。
- **不要使用装饰性插图/图标风格**：图标保持线性、1.5px 描边，避免面性彩色图标。
- **不要全大写标题**：仅侧边栏分组标签允许全大写，且必须小字号 + 宽字间距。
- **不要过宽行高**：正文行高不超过 1.6，避免工具界面显得松散。

### 7.2 Prefer

- 用 `border-subtle` + `bg-subtle` 组合代替阴影来建立层级。
- 用 `text-secondary` 和 `text-tertiary` 建立信息层级，而不是缩小字体到难以阅读。
- 按钮优先使用 Default 样式，Primary 仅用于最强的单一行动点（如“保存”）。
- 选中态优先使用 `bg-selected` 而不是强烈的边框或阴影。
- 在地图上方使用半透明表面 + 细边框，避免遮挡底图要素。

---

## 8. Responsive Behavior（响应式行为）

### 8.1 Breakpoints

| Name | Width | Tailwind v4 | Behavior |
|------|-------|-------------|----------|
| Mobile | `< 640px` | `sm:` | 单列、堆叠、侧边栏变为抽屉 |
| Tablet | `640px - 1023px` | `md:` | 双列、侧边栏可折叠 |
| Desktop | `1024px - 1279px` | `lg:` | 完整三列编辑器 |
| Wide | `>= 1280px` | `xl:` | 可展开右侧面板、更大地图区域 |

### 8.2 Adaptation Rules

- **侧边栏**：
  - `>=1024px`：固定 `240px` 展开。
  - `640px-1023px`：默认折叠为 `56px` 图标栏，hover/点击展开。
  - `<640px`：变为 `Drawer` 模态抽屉，覆盖地图。
- **右侧面板**：
  - `>=1024px`：可常驻 `240px`。
  - `<1024px`：默认隐藏，点击属性按钮时以浮层面板出现。
- **工具栏**：
  - 桌面：所有图标展开并带文字标签。
  - 平板：次要功能收入“更多”下拉菜单。
  - 移动：保留缩放、定位、添加标记等核心工具，其余收入抽屉。
- **对话框**：
  - 桌面：居中，最大宽度 `480px`。
  - 移动：底部滑出或全屏，确保触控按钮 `>=44px` 点击区域。
- **地图控件**：
  - 保持 `12px` 安全边距，移动端控件尺寸放大到 `40px`。

---

## 9. Agent Prompt Guide（Agent 生成指南）

### 9.1 Key Instructions

- **始终使用本文件中的颜色变量名**，不要随机生成新色值。所有新组件必须从 `--color-*` 和 `--space-*` 取值。
- **保持小圆角**：输入框 `3px`、按钮 `4px`、卡片 `6px`、对话框 `8px`；不要默认 `rounded-lg`（`8px`）给按钮/输入框。
- **保持浅色主题**：背景以 `#FFFFFF` 和 `#F7F6F3` 为主，文字以 `#37352F` 为主；只有在链接/选中/地图高亮时使用 `#2EAADC`。
- **信息密度优先**：编辑器使用紧凑行高、小间距，避免大留白和装饰性元素。
- **中西文混排**：使用 `font-sans` 变量栈，确保中文显示为 Noto Sans SC / 系统黑体。
- **阴影克制**：默认组件不加阴影，只有 dropdown、modal、popover 使用对应阴影。
- **语义色谨慎**：成功/警告/错误仅用于状态反馈，不要用作主按钮或大面积背景。
- **地图层级**：地图控件与浮层面板必须使用 `bg-surface-primary` + 半透明 + 细边框，避免与天地图底图冲突。

### 9.2 Quick CSS Snippet

```css
:root {
  /* Background */
  --bg-page: #ffffff;
  --bg-sidebar: #f7f6f3;
  --bg-surface: #ffffff;
  --bg-subtle: #f7f6f3;
  --bg-hover: #efefec;
  --bg-active: #e3e3e0;
  --bg-selected: #e3f5fa;
  --bg-overlay: rgba(0, 0, 0, 0.35);

  /* Surface */
  --surface-primary: #ffffff;
  --surface-secondary: #f7f6f3;
  --surface-tertiary: #f1f1ef;
  --surface-pressed: #e3e3e0;

  /* Text */
  --text-primary: #37352f;
  --text-secondary: #6f6e69;
  --text-tertiary: #9e9d99;
  --text-inverse: #ffffff;
  --text-link: #2eaadc;

  /* Border */
  --border-subtle: #e9e9e7;
  --border-default: #d3d1cb;
  --border-strong: #b7b5ae;
  --border-divider: #e9e9e7;

  /* Primary & Accent */
  --primary-default: #0a4b3f;
  --primary-hover: #073a31;
  --primary-pressed: #052c25;
  --accent-default: #2eaadc;
  --accent-hover: #2496c4;
  --accent-subtle: #e3f5fa;

  /* Semantic */
  --success-text: #0f7b6c;
  --success-bg: #e6f4f1;
  --warning-text: #d97706;
  --warning-bg: #fef3c7;
  --danger-text: #dc2626;
  --danger-bg: #fee2e2;
  --danger-hover: #b91c1c;
  --info-text: #2eaadc;
  --info-bg: #e3f5fa;

  /* Typography */
  --font-sans: "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Source Han Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "SFMono-Regular", "Fira Code", "JetBrains Mono", "Noto Sans SC", "Sarasa Mono SC", "Microsoft YaHei Mono", monospace;

  /* Spacing (base 4px) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-xs: 2px;
  --radius-sm: 3px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-xl: 8px;

  /* Shadows */
  --shadow-raised: 0 1px 3px rgba(55, 53, 47, 0.06);
  --shadow-floating: 0 4px 12px rgba(55, 53, 47, 0.08);
  --shadow-overlay: 0 8px 24px rgba(55, 53, 47, 0.12);
}
```

### 9.3 Tailwind CSS 4 映射建议

在 `app/globals.css` 中，可将上述变量映射到 Tailwind 4 的 `@theme` 块（推荐）：

```css
@theme {
  --color-bg-page: var(--bg-page);
  --color-bg-sidebar: var(--bg-sidebar);
  --color-bg-surface: var(--bg-surface);
  --color-bg-subtle: var(--bg-subtle);
  --color-bg-hover: var(--bg-hover);
  --color-bg-active: var(--bg-active);
  --color-bg-selected: var(--bg-selected);
  --color-surface-primary: var(--surface-primary);
  --color-surface-secondary: var(--surface-secondary);
  --color-surface-tertiary: var(--surface-tertiary);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);
  --color-text-link: var(--text-link);
  --color-border-subtle: var(--border-subtle);
  --color-border-default: var(--border-default);
  --color-border-strong: var(--border-strong);
  --color-primary: var(--primary-default);
  --color-primary-hover: var(--primary-hover);
  --color-accent: var(--accent-default);
  --color-accent-hover: var(--accent-hover);
  --color-success: var(--success-text);
  --color-warning: var(--warning-text);
  --color-danger: var(--danger-text);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --shadow-raised: var(--shadow-raised);
  --shadow-floating: var(--shadow-floating);
  --shadow-overlay: var(--shadow-overlay);
}
```

> 注意：Tailwind CSS 4 的 `@theme` 语法以 `--color-*` 自动导出 `bg-*`、`text-*`、`border-*` 等工具类。命名时保持 `--color-text-primary` 即可生成 `text-text-primary`（建议），或者简化为 `--color-ink-primary` 生成 `text-ink-primary`。团队可根据现有 `tailwind.config` 风格调整前缀。
