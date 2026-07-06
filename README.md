# MapMark - 地图标注平台

基于天地图的在线地图标注工具，支持多地图项目管理、点线面标注、分组目录、批量导入导出、自定义字段。

## ✨ 功能特性

### 地图管理
- 🗺️ **多地图项目** — 按项目组织标注（如"土地成交数据"、"混凝土站点分布"），每张地图独立
- 📋 **地图列表** — 卡片式展示所有地图，显示标注数量和更新时间
- 🔗 **卡片快捷操作** — 支持直接进入前台查看、后台编辑、复制公开分享链接
- 🏷️ **分组目录** — 树形分组组织标注，支持多层子分组

### 标注能力
- 📍 **点标注** — 自定义图标、颜色、大小，支持右键菜单编辑/移动/删除
- 📏 **线标注** — 折线绘制，支持颜色、线宽、虚线样式
- 🟦 **面标注** — 多边形绘制，支持填充色和透明度

### 数据管理
- 📊 **批量导入** — 支持 Excel(.xlsx) / CSV 文件批量落点，自动列映射
- ✨ **智能标注入口** — 后台工具条中的“智能标注”直接打开导入面板，用于快速批量生成或更新点标注
- 📥 **数据导出** — 导出标注数据为 Excel / CSV
- 🏷️ **自定义字段模板** — 灵活定义标注属性（文本/数字/日期/选择），新建地图从空模板起步，自由添加字段
- 🔍 **高级搜索** — 搜索标注名称、位置、自定义字段值

### 认证
- 🔐 **管理密码** — 单管理员密码认证，首次部署通过 `/setup` 设置
- 👤 **公开只读** — 前台地图对访客公开，无需登录即可浏览

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 16 | React 全栈框架 |
| TypeScript | 类型安全 |
| Tailwind CSS 4 | 样式 |
| Leaflet | 地图渲染 |
| 天地图 | 底图瓦片服务 |
| **Turso** (libSQL) | 数据库 |
| xlsx | Excel 读写 |
| PapaParse | CSV 解析 |
| Vercel | 部署 |

## 🚀 快速开始

### 1. 克隆并安装

```bash
git clone https://github.com/rowancy66/map-annotation.git
cd map-annotation
npm install
```

### 2. 配置 Turso 数据库

在 [Turso](https://turso.tech) 创建数据库：

```bash
turso db create map-annotation
turso db show map-annotation --url
turso db tokens create map-annotation
```

### 3. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
# Turso 数据库
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Session 加密密钥（随机字符串）
APP_SESSION_SECRET=your-random-secret

# 天地图（可选，已内置 key）
NEXT_PUBLIC_TIANDITU_KEY=e1d6600951ce0b9692ec71ebc7f03170
```

### 4. 启动开发

```bash
npm run dev
```

首次访问 http://localhost:3000/setup 设置管理密码，然后前往 http://localhost:3000/admin 登录。

## 📁 项目结构

```
src/
├── app/
│   ├── admin/AdminDashboard.tsx     # 管理员地图列表
│   ├── admin/AdminEditor.tsx        # 单地图编辑器
│   ├── map/[id]/page.tsx            # 前台单地图查看
│   └── api/                         # 认证、地图、标注、分组 API
├── components/map/
│   ├── MapView.tsx                  # 地图视图（Leaflet）
│   ├── InfoCard.tsx                 # 标注详情卡片
│   ├── FieldTemplateManager.tsx     # 自定义字段模板编辑器
│   ├── DrawingToolbar.tsx           # 点/线/面绘制工具栏
│   └── GroupTree.tsx                # 分组树
├── hooks/useMapData.ts              # 地图数据管理与同步
├── lib/
│   ├── types.ts                     # 类型定义
│   ├── constants.ts                 # 配置常量
│   └── server/                      # 服务端 CRUD + 认证 + Schema
└── app/api/
docs/
├── plans/                           # 实现计划
└── superpowers/specs/               # 设计规格文档
```

## 🎯 使用指南

### 管理员

1. **首次部署** → 访问 `/setup` 设置管理密码
2. **登录** → `/admin` 输入密码
3. **创建地图** → 在管理员首页点击「新建地图」
4. **添加标注** → 进入地图编辑器，使用顶部工具条中的点/线/面标注入口
5. **智能标注** → 点击顶部「智能标注」直接打开导入面板，批量导入或更新点标注
6. **组织分组** → 侧边栏切换到「分组」视图，右键创建分组

### 公开访问

- 前台首页 (`/`) 显示所有地图列表
- 点击地图卡片进入 `/map/[id]` 只读查看

## 🌐 部署

### Vercel

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入
3. 配置环境变量
4. 部署

### 中国加速（可选）

项目包含 Cloudflare Pages 代理配置，详见 `cloudflare/` 和 `functions/` 目录。

## 🗄️ 数据库 Schema

| 表 | 说明 |
|----|------|
| **maps** | 地图项目（名称、描述、中心点、缩放、字段模板、设置） |
| **annotations** | 标注（类型、几何、样式、自定义字段、分组） |
| **groups** | 分组目录（树形结构，支持父子层级） |
| **settings** | 全局设置（管理密码哈希等） |
| **sessions** | 管理员登录会话 |

## ⚠️ 注意事项

1. **天地图**：仅在中国大陆可用
2. **Turso**：免费额度包含 5GB 存储 + 10 亿行读取/月
3. **管理密码**：通过 `/setup` 设置后存储在 Turso，如需重置需手动操作数据库

## 📄 License

MIT
