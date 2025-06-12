# Android构建脚本说明

## 概述

本目录包含用于构建Android应用的脚本，已经过优化以兼容admin管理后台功能。

## 脚本说明

### `build-android.sh` - 完整Android构建
主要的Android构建脚本，包含以下功能：
- 自动设置移动端构建模式（`IS_MOBILE_BUILD=true`）
- 简化admin页面以避免构建错误
- 生成静态文件并同步到Capacitor项目
- 自动打开Android Studio

### `test-mobile-build.sh` - 构建测试
用于测试移动端构建是否正常工作的脚本：
- 验证构建过程
- 检查admin页面是否正确处理
- 不涉及Capacitor同步，仅测试Next.js构建

## 使用方法

### 1. 快速测试（推荐先运行）
```bash
./scripts/test-mobile-build.sh
```

### 2. 完整Android构建
```bash
./scripts/build-android.sh
```

## Admin页面兼容性

### 问题背景
在git提交 `444dd9a132c02c89e1e5c736fd49bb7862456c7f` 中，为了修复Android打包问题，admin页面被简化了。

### 解决方案
现在使用条件渲染来处理：

- **Web端开发**：显示完整的admin功能
- **移动端构建**：显示简化版本，避免复杂依赖

### 技术实现
通过环境变量 `IS_MOBILE_BUILD` 控制：

```javascript
// 在admin页面组件中
if (process.env.IS_MOBILE_BUILD === 'true') {
  return <MobileNotSupported />;
}

// Web端显示完整功能
return <FullAdminComponent />;
```

## 构建配置

### 开发环境 (`next.config.js`)
- 包含API代理配置
- 支持热重载
- 完整admin功能

### 移动端构建 (`next.config.capacitor.js`)
- 静态导出模式
- 设置 `IS_MOBILE_BUILD=true`
- 简化admin页面

## 故障排除

### 构建失败
1. 检查 `out/` 目录是否生成
2. 确认 `IS_MOBILE_BUILD` 环境变量已设置
3. 查看构建日志中的错误信息

### Admin页面错误
1. 确认使用了正确的构建脚本
2. 检查环境变量设置
3. 验证 `MobileNotSupported` 组件存在

### Capacitor同步问题
1. 检查 `android/app/src/main/assets/` 目录
2. 确认静态文件已正确复制
3. 重新运行 `npx cap sync android`

## 开发流程

1. **开发阶段**：使用 `npm run dev` 进行Web端开发
2. **测试构建**：运行 `./scripts/test-mobile-build.sh` 验证
3. **Android构建**：运行 `./scripts/build-android.sh` 生成APK
4. **发布**：在Android Studio中构建发布版本

## 注意事项

- 移动端构建会自动简化admin页面，这是正常行为
- 不要在移动端构建中期望看到完整的admin功能
- 如需修改admin页面，请在Web端测试后再进行移动端构建 