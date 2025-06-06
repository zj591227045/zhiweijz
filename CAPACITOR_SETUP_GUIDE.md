# Capacitor 原生应用开发完整指南

## 📱 概述

Capacitor允许将Next.js PWA转换为真正的原生Android和iOS应用，包含完整前端资源，支持完全离线运行。

## 🛠️ 环境要求

### Android开发
- **Node.js** 16+
- **Java JDK** 11+
- **Android Studio** (最新版本)
- **Android SDK** (通过Android Studio安装)

### iOS开发 (仅macOS)
- **macOS** 10.15+
- **Xcode** 12+
- **iOS模拟器** (通过Xcode安装)
- **CocoaPods** (依赖管理)

## 🚀 完整配置步骤

### 1. 安装Capacitor依赖

```bash
# 安装核心包
npm install @capacitor/core@latest @capacitor/cli@latest --legacy-peer-deps

# 安装平台支持
npm install @capacitor/android@latest --legacy-peer-deps
npm install @capacitor/ios@latest --legacy-peer-deps

# 安装常用插件
npm install @capacitor/app@latest @capacitor/haptics@latest @capacitor/keyboard@latest @capacitor/status-bar@latest @capacitor/splash-screen@latest --legacy-peer-deps
```

### 2. 初始化Capacitor项目

```bash
npx cap init "只为记账" "cn.jacksonz.pwa.twa.zhiweijz" --web-dir=out
```

### 3. 创建Capacitor配置文件

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cn.jacksonz.pwa.twa.zhiweijz',
  appName: '只为记账',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#4CAF50",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#4CAF50'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    App: {
      launchUrl: 'https://localhost'
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  },
  ios: {
    scheme: '只为记账',
    buildOptions: {
      developmentTeam: undefined,
      packageType: 'development'
    },
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: true
  }
};

export default config;
```

### 4. 添加平台支持

```bash
# 添加Android平台
npx cap add android

# 添加iOS平台（仅macOS）
npx cap add ios
```

### 5. 创建Capacitor专用Next.js配置

```javascript
// next.config.capacitor.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  
  // Capacitor静态导出配置
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  
  // 图片优化配置
  images: {
    unoptimized: true
  },
  
  // 禁用服务端功能
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  
  // 构建配置
  generateBuildId: () => 'capacitor-build',
  
  // 忽略构建错误
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 安全头配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: capacitor:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https: capacitor:; style-src 'self' 'unsafe-inline' https: capacitor:; img-src 'self' data: blob: https: capacitor:; connect-src 'self' https: capacitor: ws: wss:;"
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
```

## 📱 构建流程

### Android构建

```bash
#!/bin/bash
# build-android.sh

# 1. 使用Capacitor配置构建Next.js应用
cp next.config.capacitor.js next.config.js
npm run build
cp next.config.js.backup next.config.js

# 2. 同步到Capacitor
npx cap sync android

# 3. 打开Android Studio
npx cap open android
```

### iOS构建

```bash
#!/bin/bash
# build-ios.sh

# 1. 使用Capacitor配置构建Next.js应用
cp next.config.capacitor.js next.config.js
npm run build
cp next.config.js.backup next.config.js

# 2. 同步到Capacitor
npx cap sync ios

# 3. 打开Xcode
npx cap open ios
```

## 🔧 iOS安全区域适配

### 问题：灵动岛遮挡

iPhone X系列及更新设备的刘海屏/灵动岛会遮挡顶部工具栏。

### 解决方案：

```css
/* ios-safe-area.css */
@supports (padding-top: env(safe-area-inset-top)) {
  :root {
    --safe-area-inset-top: env(safe-area-inset-top);
    --safe-area-inset-right: env(safe-area-inset-right);
    --safe-area-inset-bottom: env(safe-area-inset-bottom);
    --safe-area-inset-left: env(safe-area-inset-left);
  }
}

.capacitor-ios .header {
  padding-top: max(12px, var(--safe-area-inset-top));
  min-height: calc(56px + var(--safe-area-inset-top));
}

/* iPhone 16 Pro特殊处理 */
@media only screen 
  and (device-width: 402px) 
  and (device-height: 874px) 
  and (-webkit-device-pixel-ratio: 3) {
  .header {
    padding-top: max(32px, var(--safe-area-inset-top)) !important;
  }
}
```

### JavaScript检测：

```typescript
// ios-safe-area.ts
export function applySafeAreaStyles() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isCapacitor = !!(window as any).Capacitor;
  
  if (isIOS && isCapacitor) {
    document.body.classList.add('capacitor-ios');
    
    // iPhone 16 Pro特殊处理
    if (window.screen.width === 402 && window.screen.height === 874) {
      document.body.classList.add('iphone-16-pro');
    }
  }
}
```

## 🏗️ 开发环境配置

### Android环境

```bash
# 环境变量配置
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

### iOS环境

```bash
# CocoaPods安装
sudo gem install cocoapods
```

## 📦 应用特性对比

| 特性 | PWABuilder | Capacitor |
|------|------------|-----------|
| **应用大小** | ~500KB | ~15-30MB |
| **离线支持** | 访问后缓存 | 完全预装 |
| **首次启动** | 需要网络 | 完全离线 |
| **原生功能** | 有限 | 完整支持 |
| **App Store** | 不支持 | 完全支持 |

## 🔍 常用命令

```bash
# 添加新插件
npm install @capacitor/[plugin-name]
npx cap sync

# 更新Capacitor
npm update @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap sync

# 清理并重新构建
npx cap sync android --force
npx cap sync ios --force

# 在设备上运行
npx cap run android
npx cap run ios

# 查看日志
npx cap run android -l
npx cap run ios -l
```

## 🐛 常见问题

### Q: 构建失败，提示找不到Android SDK
A: 确保设置了ANDROID_HOME环境变量，并重启终端

### Q: iOS应用安装后无法打开
A: 检查Content Security Policy配置，确保允许capacitor:协议

### Q: 热更新不工作
A: Capacitor应用需要重新构建和安装才能看到更改

## 📋 检查清单

### Android开发环境
- [ ] Java JDK 11+已安装
- [ ] Android Studio已安装
- [ ] Android SDK已配置
- [ ] ANDROID_HOME环境变量已设置
- [ ] ADB可用

### iOS开发环境
- [ ] macOS系统
- [ ] Xcode已安装
- [ ] iOS模拟器已安装
- [ ] CocoaPods已安装
- [ ] 开发者账号已配置（真机测试）

---
*记录时间：2025年6月*
*Capacitor版本：7.x*
*适用平台：Android、iOS* 