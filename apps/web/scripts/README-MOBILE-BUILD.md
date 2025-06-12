# 移动端构建指南

本指南解决iOS沙盒权限问题和管理页面排除问题。

## 问题说明

### 1. iOS沙盒权限问题
- **错误**: `Sandbox: bash(68041) deny(1) file-read-data`
- **原因**: CocoaPods脚本权限问题，Xcode沙盒限制
- **影响**: 无法在Xcode中正常构建iOS应用

### 2. 管理页面打包问题
- **问题**: admin管理页面被包含在移动端构建中
- **影响**: 增加包体积，可能导致构建错误
- **需求**: 移动端不需要管理功能

## 解决方案

### 方案1: 快速修复（推荐）

```bash
# 在 apps/web 目录下运行
./scripts/fix-ios-sandbox.sh
```

这个脚本会：
1. ✅ 清理并重新创建iOS项目
2. ✅ 修复CocoaPods权限问题
3. ✅ 使用移动端专用配置（排除admin页面）
4. ✅ 重新同步项目文件

### 方案2: 手动修复

#### 步骤1: 修复iOS权限问题

```bash
# 删除现有iOS项目
rm -rf ../ios

# 重新添加iOS平台
npx cap add ios

# 进入iOS项目目录
cd ../ios/App

# 清理CocoaPods
pod cache clean --all
rm -rf Pods Podfile.lock

# 重新安装
pod install --repo-update

# 修复脚本权限
find "Pods/Target Support Files" -name "*.sh" -exec chmod +x {} \;
```

#### 步骤2: 使用移动端配置构建

```bash
# 回到web目录
cd ../../web

# 使用移动端配置构建
cp next.config.mobile.js next.config.js
NEXT_PUBLIC_IS_MOBILE=true NEXT_BUILD_MODE=export npm run build

# 恢复原配置
git checkout next.config.js

# 同步到iOS
npx cap sync ios
```

## 新增文件说明

### 1. `next.config.mobile.js`
- 移动端专用Next.js配置
- 排除admin页面
- 优化移动端构建

### 2. `src/lib/mobile-stub.js`
- 空模块，替换admin相关导入
- 防止构建错误

### 3. `scripts/fix-ios-sandbox.sh`
- 一键修复iOS权限问题
- 自动使用移动端配置

## 构建脚本更新

### iOS构建 (`scripts/build-ios.sh`)
- ✅ 使用 `next.config.mobile.js`
- ✅ 排除admin页面
- ✅ 增强错误处理

### Android构建 (`scripts/build-android.sh`)
- ✅ 使用 `next.config.mobile.js`
- ✅ 排除admin页面
- ✅ 验证构建结果

## 验证方法

### 1. 验证admin页面已排除
```bash
# 构建后检查
ls out/admin  # 应该显示"No such file or directory"
```

### 2. 验证iOS权限修复
```bash
# 检查脚本权限
ls -la ../ios/App/Pods/Target\ Support\ Files/Pods-App/Pods-App-frameworks.sh
# 应该显示 -rwxr-xr-x (可执行权限)
```

## 使用流程

### iOS构建流程
```bash
cd apps/web
./scripts/build-ios.sh
# 或者先修复权限问题
./scripts/fix-ios-sandbox.sh
```

### Android构建流程
```bash
cd apps/web
./scripts/build-android.sh
```

## 故障排除

### 如果仍有iOS权限问题
1. 在Xcode中: Product > Clean Build Folder
2. 重新运行修复脚本
3. 检查macOS系统权限设置

### 如果admin页面仍被包含
1. 确认使用了 `next.config.mobile.js`
2. 清理构建缓存: `rm -rf .next out`
3. 重新构建

### 如果构建失败
1. 检查Node.js版本 (推荐 18+)
2. 清理node_modules: `rm -rf node_modules && npm install`
3. 检查环境变量设置

## 环境变量

移动端构建使用以下环境变量：
- `NEXT_PUBLIC_IS_MOBILE=true` - 标识移动端构建
- `IS_MOBILE_BUILD=true` - 构建时标识
- `NEXT_BUILD_MODE=export` - 静态导出模式
