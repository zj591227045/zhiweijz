# 版本配置指南

## 概述

智慧记账应用支持 Web、iOS、Android 三个平台，每个平台的版本配置方式略有不同。

## 配置文件位置

### 🌐 Web端
- **配置文件**: `apps/web/.env.local`
- **生效范围**: 仅 Web 端
- **配置项**:
  ```env
  NEXT_PUBLIC_APP_VERSION=0.5.1
  NEXT_PUBLIC_BUILD_NUMBER=501
  ```

### 🍎 iOS端
- **主配置文件**: `ios/App/App/Info.plist`
- **关键配置**:
  ```xml
  <key>CFBundleShortVersionString</key>
  <string>0.5.1</string>
  <key>CFBundleVersion</key>
  <string>501</string>
  ```
- **同步配置**: `apps/web/.env.local` (用于网页部分)

### 🤖 Android端
- **主配置文件**: `android/app/build.gradle`
- **关键配置**:
  ```gradle
  android {
      defaultConfig {
          versionName "0.5.1"
          versionCode 501
      }
  }
  ```
- **同步配置**: `apps/web/.env.local` (用于网页部分)

## 版本检查逻辑

### 平台检测
```typescript
// 自动检测当前平台
function getCurrentPlatform(): 'web' | 'ios' | 'android' {
  if (window.Capacitor) {
    // Capacitor 环境 - 真实移动应用
    return window.Capacitor.getPlatform();
  } else {
    // 浏览器环境 - 检查 User Agent
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    return 'web';
  }
}
```

### 版本信息获取
```typescript
// Web端：使用环境变量
const webVersion = {
  version: process.env.NEXT_PUBLIC_APP_VERSION,
  buildNumber: parseInt(process.env.NEXT_PUBLIC_BUILD_NUMBER)
};

// iOS/Android端：使用 Capacitor API
if (window.Capacitor?.Plugins?.App) {
  const appInfo = await window.Capacitor.Plugins.App.getInfo();
  const mobileVersion = {
    version: appInfo.version,
    buildNumber: parseInt(appInfo.build)
  };
}
```

## 版本同步策略

### 开发阶段
1. **更新 Web 配置**: 修改 `apps/web/.env.local`
2. **更新 iOS 配置**: 修改 `ios/App/App/Info.plist`
3. **更新 Android 配置**: 修改 `android/app/build.gradle`
4. **数据库版本**: 在管理端创建对应的版本记录

### 自动化同步 (推荐)
创建脚本自动同步所有平台的版本配置：

```bash
#!/bin/bash
# scripts/sync-version.sh

VERSION="0.5.1"
BUILD_NUMBER="501"

# 更新 Web 配置
echo "NEXT_PUBLIC_APP_VERSION=$VERSION" > apps/web/.env.local
echo "NEXT_PUBLIC_BUILD_NUMBER=$BUILD_NUMBER" >> apps/web/.env.local

# 更新 iOS 配置 (需要 plist 工具)
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" ios/App/App/Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" ios/App/App/Info.plist

# 更新 Android 配置
sed -i "s/versionName \".*\"/versionName \"$VERSION\"/" android/app/build.gradle
sed -i "s/versionCode .*/versionCode $BUILD_NUMBER/" android/app/build.gradle

echo "版本同步完成: $VERSION ($BUILD_NUMBER)"
```

## 测试验证

### 验证配置是否生效
1. **Web端**: 访问 `/test-version` 页面
2. **iOS端**: 在真机或模拟器中检查版本信息
3. **Android端**: 在真机或模拟器中检查版本信息

### 版本检查测试
```typescript
// 测试所有平台的版本检查
const platforms = ['web', 'ios', 'android'];
for (const platform of platforms) {
  const result = await fetch('/api/version/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform,
      currentVersion: '0.5.1',
      currentBuildNumber: 501
    })
  });
  console.log(`${platform}:`, await result.json());
}
```

## 注意事项

1. **版本码必须递增**: 每次发布新版本时，版本码必须比之前的版本大
2. **平台一致性**: 同一版本在所有平台的版本号应该保持一致
3. **环境变量前缀**: Web端环境变量必须以 `NEXT_PUBLIC_` 开头才能在客户端访问
4. **Capacitor 同步**: 修改原生配置后需要运行 `npx cap sync` 同步到 Capacitor

## 发布流程

1. **更新版本配置** (所有平台)
2. **创建数据库版本记录** (管理端)
3. **构建应用**
4. **测试版本检查功能**
5. **发布到各平台**
