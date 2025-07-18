# 版本检查和更新系统

这是一个完整的版本检查和更新管理系统，支持自动检查、用户交互和平台差异化处理。

## 功能特性

### 🔄 自动版本检查
- 用户登录时自动检查
- 应用启动时自动检查
- 页面可见性变化时检查
- 网络重连时检查
- 定时检查（可配置间隔）

### 🎯 用户交互
- 美观的版本更新对话框
- 三种用户操作：
  - **推迟1天**：延迟提醒
  - **立即更新**：执行更新
  - **跳过此版本**：忽略当前版本

### 🌐 平台支持
- **Web端**：刷新页面
- **iOS端**：跳转App Store
- **Android端**：下载APK文件

### 💾 数据持久化
- localStorage存储用户偏好
- 跳过版本列表管理
- 推迟更新时间管理
- 检查历史记录

## 快速开始

### 1. 基础集成

在应用的根组件中集成版本检查提供者：

```tsx
import { EnhancedVersionProvider, AutoVersionChecker } from '@/components/version';

function App() {
  return (
    <EnhancedVersionProvider
      enabled={true}
      autoCheck={true}
      checkInterval={24 * 60 * 60 * 1000} // 24小时
      checkOnLogin={true}
      checkOnVisibilityChange={true}
      showIndicator={true}
      showNetworkStatus={true}
    >
      <YourAppContent />
      
      <AutoVersionChecker
        checkOnMount={true}
        checkOnLogin={true}
        checkOnFocus={true}
        checkOnVisibilityChange={true}
        checkOnNetworkReconnect={true}
        checkInterval={24 * 60 * 60 * 1000}
        minCheckInterval={5 * 60 * 1000}
        debug={process.env.NODE_ENV === 'development'}
      />
    </EnhancedVersionProvider>
  );
}
```

### 2. 手动版本检查

在任何组件中使用手动版本检查：

```tsx
import { useManualVersionCheck, useVersionInfo } from '@/components/version';

function SettingsPage() {
  const manualCheck = useManualVersionCheck();
  const versionInfo = useVersionInfo();

  const handleCheckUpdate = async () => {
    await manualCheck();
  };

  return (
    <div>
      <p>当前版本: {versionInfo.currentVersion}</p>
      <button onClick={handleCheckUpdate}>检查更新</button>
      {versionInfo.hasUpdate && (
        <p>发现新版本: {versionInfo.latestVersion?.version}</p>
      )}
    </div>
  );
}
```

### 3. 版本设置页面

使用内置的版本设置组件：

```tsx
import { VersionCheckSettings } from '@/components/version';

function VersionSettingsPage() {
  return (
    <div>
      <h1>版本管理</h1>
      <VersionCheckSettings />
    </div>
  );
}
```

## 配置选项

### EnhancedVersionProvider 配置

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | true | 是否启用版本检查 |
| `autoCheck` | boolean | true | 是否自动检查 |
| `checkInterval` | number | 24小时 | 检查间隔（毫秒） |
| `checkOnLogin` | boolean | true | 登录时检查 |
| `checkOnVisibilityChange` | boolean | true | 页面可见性变化时检查 |
| `showIndicator` | boolean | true | 显示状态指示器 |
| `showNetworkStatus` | boolean | true | 显示网络状态 |
| `indicatorPosition` | string | 'top-right' | 指示器位置 |

### AutoVersionChecker 配置

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `checkOnMount` | boolean | true | 组件挂载时检查 |
| `checkOnLogin` | boolean | true | 用户登录时检查 |
| `checkOnFocus` | boolean | true | 页面获得焦点时检查 |
| `checkOnVisibilityChange` | boolean | true | 页面可见性变化时检查 |
| `checkOnNetworkReconnect` | boolean | true | 网络重连时检查 |
| `checkInterval` | number | 24小时 | 定时检查间隔 |
| `minCheckInterval` | number | 5分钟 | 最小检查间隔 |
| `debug` | boolean | false | 调试模式 |

## 环境变量

在 `.env` 文件中配置版本信息：

```env
# 应用版本信息
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_BUILD_NUMBER=1

# API配置
NEXT_PUBLIC_API_BASE_URL=

# 构建模式
BUILD_MODE=web
IS_MOBILE_BUILD=false
```

## API接口

版本检查依赖以下服务器端API：

- `POST /api/version/check` - 检查版本更新
- `GET /api/version/latest/:platform` - 获取最新版本
- `POST /api/version/user/status` - 设置用户版本状态
- `POST /api/version/log/update` - 记录更新日志

## 数据结构

### localStorage 数据结构

```json
{
  "versionCheck": {
    "skippedVersions": ["1.2.0", "1.2.1"],
    "postponedVersion": "1.3.0",
    "postponedUntil": "2024-01-15T10:00:00Z",
    "lastCheckTime": "2024-01-14T10:00:00Z"
  }
}
```

## 调试工具

在开发环境中，可以访问调试页面：

```
/debug/version-check
```

调试面板提供以下功能：
- 查看当前版本检查状态
- 手动触发版本检查
- 查看用户偏好设置
- 清除本地数据
- 模拟各种检查场景

## 最佳实践

### 1. 版本号管理
- 使用语义化版本号（如 1.2.3）
- 构建号应该递增
- 在CI/CD中自动设置版本信息

### 2. 用户体验
- 避免频繁弹窗打扰用户
- 提供清晰的更新说明
- 尊重用户的选择（推迟/跳过）

### 3. 错误处理
- 网络错误时优雅降级
- 提供重试机制
- 记录错误日志

### 4. 性能优化
- 设置合理的检查间隔
- 避免重复检查
- 使用防抖机制

## 故障排除

### 常见问题

1. **版本检查不工作**
   - 检查API接口是否正常
   - 确认环境变量配置
   - 查看浏览器控制台错误

2. **更新对话框不显示**
   - 检查版本比较逻辑
   - 确认用户是否跳过了版本
   - 查看localStorage数据

3. **平台检测错误**
   - 检查User-Agent解析
   - 确认平台特定的更新URL

### 调试步骤

1. 开启调试模式：`debug={true}`
2. 查看控制台日志
3. 使用调试面板测试
4. 检查网络请求
5. 验证localStorage数据

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础版本检查功能
- 实现用户交互界面
- 添加平台差异化处理
- 提供调试工具
