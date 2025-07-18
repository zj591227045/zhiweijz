# 版本管理系统

## 概述

智慧记账项目采用统一的版本管理系统，支持Web、iOS、Android三平台的版本控制和更新管理。系统包含版本发布、更新检测、强制更新等功能。

## 环境变量配置

### 后端环境变量 (server/.env)

```bash
# 版本管理功能开关
ENABLE_VERSION_MANAGEMENT=false

# 版本检查间隔 (秒)
VERSION_CHECK_INTERVAL=86400

# 强制更新宽限期 (秒)
FORCE_UPDATE_GRACE_PERIOD=604800

# 版本检查API开关
VERSION_CHECK_API_ENABLED=true

# 更新通知开关
UPDATE_NOTIFICATION_ENABLED=true
```

### 前端环境变量 (apps/web/.env.local)

```bash
# 应用版本信息
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_BUILD_NUMBER=1

# 版本管理功能开关
NEXT_PUBLIC_ENABLE_VERSION_CHECK=true

# 版本检查间隔 (毫秒)
NEXT_PUBLIC_VERSION_CHECK_INTERVAL=86400000

# 自动检查开关
NEXT_PUBLIC_AUTO_VERSION_CHECK=true
```

## 功能特性

### 1. 统一版本管理
- 支持Web、iOS、Android三平台统一管理
- 版本号、构建号、版本码统一管理
- 发布状态管理（草稿、已发布、已下线）

### 2. 版本检查机制
- 自动版本检查（可配置间隔）
- 手动版本检查
- 页面可见性检查（切换回应用时检查）
- 强制更新支持

### 3. 更新方式
- **Web**: 自动刷新页面
- **iOS**: 跳转App Store
- **Android**: 下载APK文件

### 4. 管理功能
- 版本发布管理
- 更新强制性控制
- 版本使用统计
- 更新日志分析

## API接口

### 公开接口
- `POST /api/version/check` - 版本检查
- `GET /api/version/latest/:platform` - 获取最新版本

### 用户接口
- `POST /api/version/log/update` - 记录更新操作
- `POST /api/version/log/skip` - 记录跳过操作

### 管理员接口
- `GET /api/admin/version` - 获取版本列表
- `POST /api/admin/version` - 创建版本
- `PUT /api/admin/version/:id` - 更新版本
- `DELETE /api/admin/version/:id` - 删除版本
- `POST /api/admin/version/:id/publish` - 发布版本
- `POST /api/admin/version/:id/unpublish` - 下线版本
- `GET /api/admin/version/stats` - 版本统计
- `GET /api/admin/version/config` - 配置管理
- `GET /api/admin/version/logs` - 日志查看

## 使用示例

### 1. 在应用中启用版本管理

```tsx
// 在根组件中添加VersionProvider
import { VersionProvider } from '@/components/version/VersionProvider';

function App() {
  return (
    <VersionProvider
      enabled={process.env.NEXT_PUBLIC_ENABLE_VERSION_CHECK === 'true'}
      autoCheck={process.env.NEXT_PUBLIC_AUTO_VERSION_CHECK === 'true'}
      checkInterval={Number(process.env.NEXT_PUBLIC_VERSION_CHECK_INTERVAL) || 86400000}
    >
      <YourAppContent />
    </VersionProvider>
  );
}
```

### 2. 手动检查版本

```tsx
import { useManualVersionCheck } from '@/components/version/VersionProvider';

function SettingsPage() {
  const checkVersion = useManualVersionCheck();
  
  return (
    <button onClick={checkVersion}>
      检查更新
    </button>
  );
}
```

### 3. 获取版本信息

```tsx
import { useVersionInfo } from '@/components/version/VersionProvider';

function AboutPage() {
  const { 
    currentVersion, 
    currentBuildNumber, 
    platform, 
    hasUpdate, 
    isForceUpdate 
  } = useVersionInfo();
  
  return (
    <div>
      <p>当前版本: {currentVersion} (Build {currentBuildNumber})</p>
      <p>平台: {platform}</p>
      {hasUpdate && (
        <p>有新版本可用 {isForceUpdate && '(强制更新)'}</p>
      )}
    </div>
  );
}
```

## 版本号管理

### 语义化版本 (Semantic Versioning)

使用 `MAJOR.MINOR.PATCH` 格式：

- **MAJOR**: 不兼容的API修改
- **MINOR**: 向后兼容的功能性新增
- **PATCH**: 向后兼容的问题修正

### Android versionCode 计算

```
versionCode = MAJOR * 10000 + MINOR * 100 + PATCH
```

示例：
- `1.0.0` → versionCode: `10000`
- `1.2.3` → versionCode: `10203`
- `2.0.0` → versionCode: `20000`

## 数据库表结构

### app_versions (应用版本表)
- id: 主键
- platform: 平台 (web/ios/android)
- version: 版本号
- build_number: 构建号
- version_code: 版本码 (用于比较)
- release_notes: 发布说明
- download_url: 下载链接 (Android)
- app_store_url: App Store链接 (iOS)
- is_force_update: 是否强制更新
- is_enabled: 是否启用
- published_at: 发布时间
- created_by: 创建者

### version_configs (版本配置表)
- id: 主键
- key: 配置键
- value: 配置值
- description: 描述

### version_check_logs (版本检查日志表)
- id: 主键
- user_id: 用户ID
- platform: 平台
- current_version: 当前版本
- latest_version: 最新版本
- action: 操作类型 (check/update/skip)
- ip_address: IP地址
- user_agent: 用户代理
- created_at: 创建时间

## 部署指南

### 1. 数据库迁移

```bash
# 运行版本管理数据库迁移
cd server
npm run migrate:upgrade
```

### 2. 环境变量设置

在对应的环境文件中设置版本管理相关的环境变量。

### 3. 启用版本管理

```bash
# 通过环境变量启用
export ENABLE_VERSION_MANAGEMENT=true

# 或在.env文件中设置
ENABLE_VERSION_MANAGEMENT=true
```

## 最佳实践

1. **版本号管理**: 使用语义化版本号
2. **渐进式更新**: 避免一次性强制所有用户更新
3. **测试策略**: 新版本发布前充分测试
4. **回滚机制**: 出现问题时快速回滚
5. **用户通知**: 及时通知用户重要更新内容

## 故障排除

1. **版本检查失败**: 检查网络连接和API状态
2. **更新提示不显示**: 检查环境变量配置
3. **强制更新无效**: 检查版本码设置
4. **下载失败**: 检查下载链接可用性

## 版本历史

| 版本 | 发布日期 | 主要更新 |
|------|----------|----------|
| 1.0.0 | 2025-07-18 | 版本管理系统实现 |
| 0.2.0 | 2025-06-13 | 修复版本管理，统一前端显示版本号 | 