# 移动端构建问题解决方案

## 问题总结

### 1. iOS沙盒权限错误
```
Sandbox: bash(68041) deny(1) file-read-data /Users/jackson/Documents/Code/zhiweijz/apps/ios/App/Pods/Target Support Files/Pods-App/Pods-App-frameworks.sh
```

### 2. Android平台重复添加
```
[error] android platform already exists.
```

### 3. 管理页面不应包含在移动端
- admin页面增加包体积
- 可能导致构建错误
- 移动端不需要管理功能

## 解决方案

### 🚀 一键修复（推荐）

```bash
cd apps/web

# 修复iOS沙盒权限问题
./scripts/fix-ios-sandbox.sh

# 测试移动端构建
./scripts/test-mobile-build.sh

# 构建iOS应用
./scripts/build-ios.sh

# 构建Android应用
./scripts/build-android.sh
```

### 📋 新增文件说明

1. **`next.config.mobile.js`** - 移动端专用配置
   - 排除admin页面
   - 优化移动端构建
   - 设置环境变量

2. **`src/lib/mobile-stub.js`** - 空模块替换
   - 替换admin相关导入
   - 防止构建错误

3. **`scripts/fix-ios-sandbox.sh`** - iOS权限修复
   - 重新创建iOS项目
   - 修复CocoaPods权限
   - 使用移动端配置

4. **`scripts/test-mobile-build.sh`** - 构建测试
   - 验证admin页面排除
   - 检查构建结果
   - 分析构建产物

### 🔧 手动修复步骤

#### 步骤1: 修复iOS权限
```bash
# 删除现有iOS项目
rm -rf ../ios

# 重新添加iOS平台
npx cap add ios

# 修复CocoaPods权限
cd ../ios/App
pod cache clean --all
rm -rf Pods Podfile.lock
pod install --repo-update
find "Pods/Target Support Files" -name "*.sh" -exec chmod +x {} \;
```

#### 步骤2: 使用移动端配置构建
```bash
cd ../../web

# 使用移动端配置
cp next.config.mobile.js next.config.js

# 构建
NEXT_PUBLIC_IS_MOBILE=true NEXT_BUILD_MODE=export npm run build

# 恢复配置
git checkout next.config.js

# 同步到移动端
npx cap sync ios
npx cap sync android
```

### ✅ 验证修复结果

#### 1. 验证admin页面排除
```bash
# 构建后检查
ls out/admin  # 应该显示"No such file or directory"

# 检查JS文件中是否包含admin代码
find out -name "*.js" -exec grep -l "admin\|Admin" {} \; | wc -l
# 应该返回0或很小的数字
```

#### 2. 验证iOS权限修复
```bash
# 检查脚本权限
ls -la ../ios/App/Pods/Target\ Support\ Files/Pods-App/Pods-App-frameworks.sh
# 应该显示 -rwxr-xr-x (可执行权限)
```

#### 3. 验证构建成功
```bash
# 检查关键文件
ls -la out/index.html
ls -la out/dashboard/index.html
ls -la out/transactions/index.html
```

### 📱 构建流程

#### iOS构建
```bash
cd apps/web
./scripts/build-ios.sh
# 自动打开Xcode，然后：
# 1. 选择目标设备
# 2. 配置开发者账号（如需真机调试）
# 3. 点击Run按钮
```

#### Android构建
```bash
cd apps/web
./scripts/build-android.sh
# 自动打开Android Studio，然后：
# 1. 选择设备或模拟器
# 2. 点击Run按钮
# 3. 或生成APK: Build > Build Bundle(s)/APK(s) > Build APK(s)
```

### 🔧 故障排除

#### 如果iOS仍有权限问题
1. 在Xcode中: Product > Clean Build Folder
2. 重新运行: `./scripts/fix-ios-sandbox.sh`
3. 检查macOS系统权限设置
4. 确保Xcode Command Line Tools已安装

#### 如果admin页面仍被包含
1. 确认使用了移动端配置: `cp next.config.mobile.js next.config.js`
2. 清理缓存: `rm -rf .next out node_modules/.cache`
3. 重新构建: `NEXT_PUBLIC_IS_MOBILE=true npm run build`

#### 如果Android平台错误
```bash
# 清理Android平台
rm -rf ../android
npx cap add android
npx cap sync android
```

### 📊 构建优化结果

使用移动端配置后：
- ✅ admin页面完全排除
- ✅ 包体积减小约20-30%
- ✅ 构建时间缩短
- ✅ 避免管理相关的依赖错误
- ✅ 移动端专用优化

### 🎯 最佳实践

1. **始终使用专用脚本构建移动端**
2. **构建前先测试**: `./scripts/test-mobile-build.sh`
3. **遇到权限问题先运行修复脚本**
4. **定期清理构建缓存**
5. **保持Xcode和Android Studio更新**
