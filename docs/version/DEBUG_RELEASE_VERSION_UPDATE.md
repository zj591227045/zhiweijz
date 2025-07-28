# 调试版本与生产版本更新配置

## 概述

本文档说明如何为调试版本和生产版本配置不同的版本更新源，确保两个版本从不同的API端点获取更新信息。

## 版本区分机制

### 1. 包名区分
- **生产版本**: `cn.jacksonz.pwa.twa.zhiweijz`
- **调试版本**: `cn.jacksonz.pwa.twa.zhiweijz.debug`

### 2. 构建类型标识
- **环境变量**: `NEXT_PUBLIC_BUILD_TYPE` (debug/release)
- **调试标识**: `NEXT_PUBLIC_IS_DEBUG_BUILD` (true/false)

### 3. API端点区分
- **生产版本**: `/api/version/check`
- **调试版本**: `/api/version/check/debug`

## 配置方法

### 1. 环境变量配置

在 `apps/web/.env.local` 文件中添加：

```env
# 生产版本更新检查API配置
NEXT_PUBLIC_API_BASE_URL=https://your-production-domain.com

# 调试版本更新检查API配置（可选，调试版本专用）
NEXT_PUBLIC_DEBUG_API_BASE_URL=https://your-debug-domain.com
```

> **注意**: 使用 `.env.local` 文件而不是 `.env` 文件，因为：
> - `.env.local` 文件不会被提交到版本控制系统
> - 可以包含敏感的生产环境配置
> - 会自动覆盖 `.env` 和 `.env.example` 中的同名变量

### 2. 构建脚本配置

调试版本构建时会自动设置以下环境变量：
- `NEXT_PUBLIC_BUILD_TYPE=debug`
- `NEXT_PUBLIC_IS_DEBUG_BUILD=true`

### 3. 服务器端配置

#### 调试版本API路由
```typescript
// server/src/routes/version.routes.ts
router.post('/check/debug', versionController.checkVersion);
router.get('/latest/:platform/debug', versionController.getLatestVersion);
```

#### 版本检查逻辑
服务器会根据请求路径自动识别调试版本请求，并可以返回不同的版本信息。

## 使用场景

### 1. 开发测试
- 调试版本可以连接到测试服务器
- 获取测试版本的更新信息
- 不影响生产版本的更新流程

### 2. 内部测试
- 调试版本可以提前获取新版本
- 测试版本更新功能
- 验证更新流程

### 3. 版本隔离
- 调试版本和生产版本完全隔离
- 避免测试数据污染生产环境
- 独立的版本管理

## API端点说明

### 生产版本API
```
POST /api/version/check
GET /api/version/latest/{platform}
```

### 调试版本API
```
POST /api/version/check/debug
GET /api/version/latest/{platform}/debug
```

### 请求参数
```typescript
{
  platform: 'android',
  currentVersion: '1.0.0',
  currentBuildNumber: 1,
  buildType: 'debug',        // 新增字段
  packageName: 'cn.jacksonz.pwa.twa.zhiweijz.debug'  // 新增字段
}
```

## 构建流程

### 调试版本构建
```bash
# 运行调试版本构建脚本
./scripts/build-apk.sh

# 自动设置调试版本配置
# 自动修改包名为 .debug 后缀
# 自动设置应用名称为 "只为记账-dev"
```

### 生产版本构建
```bash
# 运行标准构建流程
npm run build:mobile
npx cap sync android
# 在Android Studio中构建release版本
```

## 版本检测逻辑

### 客户端检测
1. 检查环境变量 `NEXT_PUBLIC_BUILD_TYPE`
2. 检查环境变量 `NEXT_PUBLIC_IS_DEBUG_BUILD`
3. 通过Capacitor获取应用包名
4. 检查包名是否包含 `.debug` 后缀
5. 开发环境默认为调试版本

### 服务器端处理
1. 根据请求路径识别调试版本
2. 根据 `buildType` 参数选择版本数据
3. 可以为调试版本返回不同的更新信息

## 注意事项

1. **环境变量优先级**: 构建时环境变量 > 包名检测 > 开发环境默认
2. **API兼容性**: 调试版本API与生产版本API保持兼容
3. **数据隔离**: 建议为调试版本使用独立的数据库或数据标识
4. **版本管理**: 可以在管理后台为调试版本创建专门的版本记录

## 故障排除

### 1. 版本检测失败
- 检查环境变量是否正确设置
- 确认包名是否正确
- 查看控制台日志

### 2. API请求失败
- 检查API端点配置
- 确认服务器路由配置
- 验证网络连接

### 3. 更新源混乱
- 清除应用缓存
- 重新安装应用
- 检查构建配置
