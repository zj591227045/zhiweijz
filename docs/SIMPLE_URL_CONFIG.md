# 简化版本检测URL配置

## 📁 **唯一配置文件**

只需要修改一个文件：`apps/web/.env.local`

## 🔧 **配置方法**

### 开发环境 (默认)
```bash
# apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=
```
- **留空**即为开发环境
- 自动使用相对路径
- 适用于：localhost、127.0.0.1、内网IP

### 生产环境
```bash
# apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com
```
- **设置完整域名**即为生产环境
- 将 `your-domain.com` 替换为实际域名

## 🚀 **环境切换**

### 方法1: 手动修改
直接编辑 `apps/web/.env.local` 文件中的 `NEXT_PUBLIC_API_BASE_URL` 值

### 方法2: 使用脚本
```bash
# 查看当前环境
node scripts/switch-env.js status

# 切换到开发环境
node scripts/switch-env.js dev

# 切换到生产环境
node scripts/switch-env.js prod
```

## 📱 **各端生效情况**

### 🌐 Web端
- ✅ 直接生效
- 🔄 修改后需重启开发服务器

### 🍎 iOS端
- ✅ 打包时自动生效
- 📦 使用 `npm run build:ios` 构建
- 🔄 构建前确保 `.env.local` 配置正确

### 🤖 Android端
- ✅ 打包时自动生效
- 📦 使用 `npm run build:android` 构建
- 🔄 构建前确保 `.env.local` 配置正确

## 🧪 **测试和验证**

### 访问测试页面
```
http://localhost:3000/test-version
```

### 检查配置
- 查看 "URL配置调试" 部分
- 确认 "检测环境" 显示正确
- 测试API端点是否正常

## ⚠️ **注意事项**

1. **修改后重启**: 修改 `.env.local` 后需要重启开发服务器
2. **域名替换**: 生产环境记得将 `your-domain.com` 替换为实际域名
3. **移动端构建**: iOS/Android打包前确保配置正确
4. **HTTPS要求**: 生产环境建议使用HTTPS

## 🔍 **智能环境检测**

系统会自动检测当前环境：
- **localhost/127.0.0.1** → 开发环境
- **内网IP (192.168.x.x)** → 开发环境
- **其他域名** → 生产环境

## 📋 **完整配置示例**

```bash
# apps/web/.env.local

# 应用版本信息
NEXT_PUBLIC_APP_VERSION=0.5.1
NEXT_PUBLIC_BUILD_NUMBER=501

# API配置 - 开发环境留空，生产环境设置域名
NEXT_PUBLIC_API_BASE_URL=

# 版本管理功能开关
NEXT_PUBLIC_ENABLE_VERSION_CHECK=true

# 版本检查间隔 (毫秒)
NEXT_PUBLIC_VERSION_CHECK_INTERVAL=86400000

# 自动检查开关
NEXT_PUBLIC_AUTO_VERSION_CHECK=true
```

## 🎯 **快速切换示例**

### 开发 → 生产
```bash
# 1. 切换配置
node scripts/switch-env.js prod

# 2. 修改域名 (编辑 .env.local)
NEXT_PUBLIC_API_BASE_URL=https://api.yourapp.com

# 3. 构建应用
npm run build:web      # Web版
npm run build:ios      # iOS版
npm run build:android  # Android版
```

### 生产 → 开发
```bash
# 1. 切换配置
node scripts/switch-env.js dev

# 2. 重启开发服务器
npm run dev
```
