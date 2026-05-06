# MapMark - 地图标注平台

基于天地图的在线地图标注工具，支持点、线、面标注，批量导入导出，自定义字段。

## ✨ 功能特性

- 🗺️ **天地图底图** - 支持矢量/卫星地图切换
- 📍 **点标注** - 点击地图添加，支持自定义图标、颜色、大小
- 📏 **线标注** - 依次点击绘制折线，支持颜色和线宽设置
- 🟦 **面标注** - 依次点击绘制多边形，支持填充色和透明度
- 📊 **批量导入** - 支持上传 Excel(.xlsx) / CSV 文件批量落点
- 📥 **数据导出** - 导出标注数据为 Excel / CSV
- 🏷️ **自定义字段** - 灵活定义标注属性（文本/数字/日期/选择）
- 🔐 **用户认证** - 邮箱密码登录 + 微信登录入口
- 📱 **响应式设计** - 桌面优先，移动端可查看

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 16 | React 全栈框架 |
| TypeScript | 类型安全 |
| Tailwind CSS 4 | 样式 |
| Leaflet | 地图渲染 |
| 天地图 | 底图瓦片服务 |
| Supabase | 数据库 + 认证 |
| xlsx | Excel 读写 |
| PapaParse | CSV 解析 |
| Vercel | 部署 |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/你的用户名/map-annotation.git
cd map-annotation
npm install
```

### 2. 配置 Supabase

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在 SQL Editor 中运行 `supabase/migrations/001_initial.sql`
3. 复制项目的 URL 和 anon key

### 3. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_项目_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_anon_key
NEXT_PUBLIC_TIANDITU_KEY=e1d6600951ce0b9692ec71ebc7f03170

# 微信登录（可选）
NEXT_PUBLIC_WECHAT_APP_ID=你的微信开放平台_app_id
WECHAT_APP_SECRET=你的微信开放平台_app_secret
```

### 4. 启动开发

```bash
npm run dev
```

访问 http://localhost:3000

## 📦 部署到 Vercel

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量（同 `.env.local` 中的变量）
4. 部署

## 🎯 使用指南

### 添加标注

1. 点击左侧工具栏选择标注类型（点/线/面）
2. 在地图上点击放置标注
3. 线和面：依次点击添加顶点，双击结束
4. 按 ESC 取消当前绘制

### 编辑标注

1. 点击地图上的标注，弹出信息卡片
2. 点击"编辑"按钮修改属性
3. 可修改名称、描述、样式、自定义字段

### 批量导入

1. 点击顶部"导入"按钮
2. 上传 Excel 或 CSV 文件
3. 映射列到字段（必须包含经度和纬度列）
4. 确认导入

导入文件示例：

| 名称 | 纬度 | 经度 | 描述 |
|------|------|------|------|
| 天安门 | 39.9087 | 116.3975 | 北京市中心 |
| 故宫 | 39.9163 | 116.3972 | 明清皇家宫殿 |

### 自定义字段

1. 点击顶部 ⚙️ 设置按钮
2. 在侧边栏底部展开"自定义字段"
3. 添加字段（文本/数字/日期/选择）

## 📁 项目结构

```
src/
├── app/                    # Next.js 页面
│   ├── auth/              # 认证页面
│   ├── dashboard/         # 用户面板
│   ├── map/               # 地图编辑器（核心页面）
│   └── layout.tsx         # 根布局
├── components/
│   ├── auth/              # 认证组件
│   ├── map/               # 地图相关组件
│   │   ├── MapView.tsx    # 地图视图
│   │   ├── DrawingToolbar.tsx  # 绘制工具栏
│   │   ├── InfoCard.tsx   # 信息卡片
│   │   └── FieldTemplateManager.tsx  # 字段管理
│   └── import/            # 导入组件
│       └── ImportDialog.tsx
├── lib/
│   ├── types.ts           # 类型定义
│   ├── constants.ts       # 天地图配置
│   ├── supabase.ts        # Supabase 客户端
│   └── utils.ts           # 工具函数
└── supabase/
    └── migrations/        # 数据库迁移脚本
```

## 🗄️ 数据库 Schema

- **maps** - 地图项目（名称、描述、中心点、缩放、字段模板）
- **annotations** - 标注（类型、几何、样式、自定义字段）
- **auth.users** - 用户（Supabase Auth 管理）

所有表启用了 RLS（行级安全），用户只能访问自己的数据。

## ⚠️ 注意事项

1. **天地图 Key**：已内置在代码中，如需更换请修改 `src/lib/constants.ts`
2. **微信登录**：需要[微信开放平台](https://open.weixin.qq.com/)注册网站应用
3. **Supabase**：免费额度足够个人使用
4. **浏览器兼容**：推荐 Chrome / Edge / Safari 最新版

## 📄 License

MIT
