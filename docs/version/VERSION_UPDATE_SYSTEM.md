# 版本更新检测系统

## 系统概述

该系统为只为记账应用提供了完整的版本更新检测和管理功能，支持Web端、iOS端、Android端以及管理端的版本更新检测。

## 功能特性

### 🔍 版本检测功能
- **自动检测**: 支持定期自动检测新版本
- **手动检测**: 用户可以手动触发版本检查
- **多平台支持**: 支持Web、iOS、Android三个平台
- **智能提醒**: 根据用户设置和版本状态智能显示更新提醒

### 🎯 用户状态管理
- **推迟更新**: 用户可以推迟非强制更新，支持自定义推迟时间
- **忽略版本**: 用户可以选择忽略特定版本的更新
- **更新记录**: 记录用户的更新行为和状态

### 📱 差异化提示
- **App端**: 提供下载链接或跳转应用商店
- **Web端**: 提供页面刷新更新
- **管理端**: 专门的管理端版本检测和设置

### 🔧 管理端功能
- **版本管理**: 管理员可以创建、发布、管理各平台版本
- **强制更新**: 支持设置强制更新版本
- **发布控制**: 支持版本发布和撤回
- **统计分析**: 提供版本使用统计信息

## 系统架构

### 后端架构
```
server/
├── src/
│   ├── controllers/
│   │   └── version.controller.ts      # 版本管理控制器
│   ├── services/
│   │   └── version.service.ts         # 版本管理服务
│   ├── models/
│   │   └── version.model.ts           # 版本数据模型
│   └── routes/
│       └── version.routes.ts          # 版本管理路由
├── prisma/
│   └── schema.prisma                  # 数据库模型定义
└── migrations/
    └── incremental/
        └── add-user-version-status.sql # 用户版本状态表
```

### 前端架构
```
apps/web/src/
├── components/
│   ├── version/
│   │   ├── VersionUpdateModal.tsx      # 版本更新模态框
│   │   ├── VersionManager.tsx          # 版本管理器
│   │   └── GlobalVersionManager.tsx    # 全局版本管理器
│   └── settings/
│       └── VersionUpdate.tsx           # 版本更新设置组件
├── hooks/
│   └── useVersionCheck.ts              # 版本检查Hook
├── lib/
│   └── api/
│       └── version.ts                  # 版本API接口
└── types/
    └── capacitor.d.ts                  # Capacitor类型定义
```

## 数据库设计

### 版本表 (app_versions)
```sql
- id: 版本ID
- platform: 平台 (WEB/IOS/ANDROID)
- version: 版本号
- build_number: 构建号
- version_code: 版本码
- release_notes: 更新说明
- download_url: 下载链接
- app_store_url: 应用商店链接
- is_force_update: 是否强制更新
- is_enabled: 是否启用
- published_at: 发布时间
- created_at: 创建时间
- updated_at: 更新时间
```

### 用户版本状态表 (user_version_status)
```sql
- id: 状态ID
- user_id: 用户ID
- platform: 平台
- app_version_id: 版本ID
- version: 版本号
- version_code: 版本码
- status: 状态 (PENDING/POSTPONED/IGNORED/UPDATED)
- postponed_until: 推迟到时间
- created_at: 创建时间
- updated_at: 更新时间
```

### 版本检查日志表 (version_check_logs)
```sql
- id: 日志ID
- user_id: 用户ID
- platform: 平台
- current_version: 当前版本
- current_build_number: 当前构建号
- latest_version: 最新版本
- latest_build_number: 最新构建号
- action: 操作类型 (CHECK/UPDATE/SKIP)
- ip_address: IP地址
- user_agent: 用户代理
- created_at: 创建时间
```

## API接口

### 公开接口
- `POST /api/version/check` - 检查版本更新
- `GET /api/version/latest/:platform` - 获取最新版本

### 用户接口
- `POST /api/version/user/status` - 设置用户版本状态
- `GET /api/version/user/status/:platform/:appVersionId` - 获取用户版本状态
- `GET /api/version/user/statuses` - 获取用户所有版本状态
- `POST /api/version/log/update` - 记录更新日志
- `POST /api/version/log/skip` - 记录跳过日志

### 管理员接口
- `POST /api/admin/version` - 创建版本
- `GET /api/admin/version` - 获取版本列表
- `PUT /api/admin/version/:id` - 更新版本
- `DELETE /api/admin/version/:id` - 删除版本
- `POST /api/admin/version/:id/publish` - 发布版本
- `POST /api/admin/version/:id/unpublish` - 取消发布版本

## 使用指南

### 1. 基本集成

在应用根布局中集成全局版本管理器：

```tsx
import { GlobalVersionManager } from '@/components/version/GlobalVersionManager';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        {children}
        <GlobalVersionManager enabled={true} />
      </body>
    </html>
  );
}
```

### 2. 设置页面集成

在设置页面中添加版本更新组件：

```tsx
import { VersionUpdate } from '@/components/settings/VersionUpdate';

export default function SettingsPage() {
  return (
    <div>
      {/* 其他设置项 */}
      <VersionUpdate />
    </div>
  );
}
```

### 3. 管理端集成

在管理端版本页面中添加版本检测：

```tsx
import { VersionUpdate } from '@/components/settings/VersionUpdate';

export default function AdminVersionPage() {
  return (
    <div>
      <h1>版本管理</h1>
      <VersionUpdate isAdmin={true} />
      {/* 其他管理功能 */}
    </div>
  );
}
```

### 4. 手动版本检查

使用ManualVersionCheck组件包装任何元素：

```tsx
import { ManualVersionCheck } from '@/components/version/VersionManager';

export default function SomeComponent() {
  return (
    <ManualVersionCheck>
      <button>检查更新</button>
    </ManualVersionCheck>
  );
}
```

## 配置选项

### 环境变量
```env
# 版本管理功能开关
ENABLE_VERSION_MANAGEMENT=true

# 版本检查API开关
VERSION_CHECK_API_ENABLED=true

# 当前应用版本
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_BUILD_NUMBER=1
```

### 用户设置
用户可以在设置中配置：
- 自动检查更新开关
- 检查间隔时间
- 更新通知开关
- 自动推迟非关键更新

## 最佳实践

### 1. 版本号规范
- 遵循语义化版本控制 (Semantic Versioning)
- 版本号格式：主版本.次版本.修订版本
- 版本码递增：每次发布都要增加版本码

### 2. 强制更新使用
- 仅在安全修复或重要bug修复时使用
- 避免频繁使用强制更新影响用户体验
- 提供详细的更新说明

### 3. 发布策略
- 先发布到测试环境验证
- 逐步发布到生产环境
- 监控更新后的用户反馈和错误率

### 4. 用户体验
- 提供清晰的更新说明
- 合理的推迟时间设置
- 避免打断用户的重要操作

## 故障排除

### 常见问题

1. **版本检查失败**
   - 检查网络连接
   - 验证API接口可用性
   - 查看服务器日志

2. **更新提示不显示**
   - 检查版本管理功能是否启用
   - 确认用户状态设置
   - 验证版本比较逻辑

3. **强制更新无法跳过**
   - 这是预期行为，强制更新必须执行
   - 检查版本设置是否正确

### 调试模式

在开发环境中，可以通过以下方式调试：

```javascript
// 清除用户版本状态
localStorage.removeItem('versionUpdateSettings');

// 强制检查更新
window.dispatchEvent(new Event('forceVersionCheck'));

// 查看当前版本信息
console.log('Current version:', process.env.NEXT_PUBLIC_APP_VERSION);
```

## 更新日志

### v1.0.0 (2024-01-18)
- 初始版本发布
- 基本版本检测功能
- 用户状态管理
- 管理端版本管理
- 多平台支持
- 版本更新模态框
- 自动检测和手动检测功能