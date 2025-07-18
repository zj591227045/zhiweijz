# 版本检测URL配置详解

## 📡 API端点概览

### 主要版本检测端点
- **版本检查**: `POST /api/version/check`
- **获取最新版本**: `GET /api/version/latest/{platform}`
- **管理端版本管理**: `GET /api/admin/version`

## 🌐 Web端配置

### 开发环境
- **基础URL**: `http://localhost:3000`
- **版本检查URL**: `http://localhost:3000/api/version/check`

### 生产环境
- **基础URL**: `https://your-domain.com`
- **版本检查URL**: `https://your-domain.com/api/version/check`

### 配置文件位置
```typescript
// apps/web/src/lib/api/version.ts
export const versionApi = {
  async checkVersion(data: VersionCheckRequest): Promise<VersionCheckResponse> {
    const response = await fetch('/api/version/check', {  // ← 这里配置URL
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // ...
  }
};
```

### 使用的组件
1. **设置页面**: `apps/web/src/components/settings/VersionUpdate.tsx`
2. **管理端**: `apps/web/src/app/admin/version/page.tsx`
3. **测试页面**: `apps/web/src/app/test-version/page.tsx`

## 🍎 iOS端配置

### URL配置
- **开发环境**: 通过 Capacitor 访问 `http://localhost:3000/api/version/check`
- **生产环境**: 通过 Capacitor 访问 `https://your-domain.com/api/version/check`

### Capacitor配置
```typescript
// apps/web/capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'cn.jacksonz.pwa.twa.zhiweijz',
  appName: '只为记账',
  webDir: 'out',
  server: {
    androidScheme: 'https'  // ← 影响URL scheme
  },
  // ...
};
```

### 网络权限配置
```xml
<!-- ios/App/App/Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>  <!-- 允许HTTP请求（开发环境） -->
</dict>
```

### 修改URL的位置
1. **开发环境**: 无需修改，自动使用相对路径
2. **生产环境**: 需要在构建时配置正确的域名

## 🤖 Android端配置

### URL配置
- **开发环境**: 通过 Capacitor 访问 `http://localhost:3000/api/version/check`
- **生产环境**: 通过 Capacitor 访问 `https://your-domain.com/api/version/check`

### 网络权限配置
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<application
    android:usesCleartextTraffic="true">  <!-- 允许HTTP请求（开发环境） -->
    <!-- ... -->
</application>
```

### 修改URL的位置
1. **开发环境**: 无需修改，自动使用相对路径
2. **生产环境**: 需要在构建时配置正确的域名

## 🔧 URL修改方法

### 方法1: 环境变量配置（推荐）
```typescript
// apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com

// apps/web/src/lib/api/version.ts
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const response = await fetch(`${baseUrl}/api/version/check`, {
  // ...
});
```

### 方法2: 配置文件
```typescript
// apps/web/src/config/api.ts
export const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:3000'
  },
  production: {
    baseUrl: 'https://your-domain.com'
  }
};

const baseUrl = API_CONFIG[process.env.NODE_ENV as keyof typeof API_CONFIG].baseUrl;
```

### 方法3: 直接修改API文件
```typescript
// apps/web/src/lib/api/version.ts
const response = await fetch('https://your-domain.com/api/version/check', {
  // ...
});
```

## 🚀 部署时的URL配置

### 开发环境
- **Web**: `http://localhost:3000/api/version/check`
- **iOS**: 通过Capacitor代理到开发服务器
- **Android**: 通过Capacitor代理到开发服务器

### 生产环境
- **Web**: `https://your-domain.com/api/version/check`
- **iOS**: 打包时自动使用生产URL
- **Android**: 打包时自动使用生产URL

### 配置步骤
1. **设置环境变量**:
   ```bash
   # apps/web/.env.production
   NEXT_PUBLIC_API_BASE_URL=https://your-domain.com
   ```

2. **更新API配置**:
   ```typescript
   const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
   ```

3. **构建应用**:
   ```bash
   npm run build:web      # Web版本
   npm run build:ios      # iOS版本
   npm run build:android  # Android版本
   ```

## 🔍 调试和测试

### 检查当前使用的URL
```typescript
// 在浏览器控制台中运行
console.log('当前API基础URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
console.log('版本检查URL:', '/api/version/check');
```

### 测试版本检查
```bash
# 直接测试API
curl -X POST http://localhost:3000/api/version/check \
  -H "Content-Type: application/json" \
  -d '{"platform":"web","currentVersion":"0.5.1","currentBuildNumber":501}'
```

### 移动端调试
1. **iOS**: 在Safari中打开Web Inspector
2. **Android**: 在Chrome中打开DevTools
3. **通用**: 查看Network面板中的请求URL

## ⚠️ 注意事项

1. **CORS配置**: 确保服务器允许跨域请求
2. **HTTPS要求**: 生产环境建议使用HTTPS
3. **网络权限**: 移动端需要配置网络访问权限
4. **缓存问题**: 注意API响应的缓存策略
5. **错误处理**: 处理网络错误和超时情况
