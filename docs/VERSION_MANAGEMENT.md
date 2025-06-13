# 版本管理指南

## 概述

智慧记账项目使用统一的版本管理系统，确保所有组件的版本号保持同步。

## 版本号位置

项目中的版本号分布在以下文件中：

1. **根项目版本** - `package.json`
2. **Web应用版本** - `apps/web/package.json`
3. **Android应用版本** - `apps/android/app/build.gradle`
   - `versionCode`: 数字版本号，用于应用商店更新检测
   - `versionName`: 显示给用户的版本号
4. **前端页面显示版本** - 自动更新以下文件中的硬编码版本号：
   - `apps/web/src/app/settings/page.tsx` - 设置页面底部版本显示
   - `apps/web/src/app/settings/about/page.tsx` - 关于页面版本信息
   - `apps/web/src/components/admin/AdminSidebar.tsx` - 管理员侧边栏版本显示

## 版本管理工具

### 查看当前版本

```bash
# 方法1: 使用npm脚本
npm run version:show

# 方法2: 直接运行脚本
node scripts/update-version.js
```

输出示例：
```
📋 智慧记账版本管理工具

📋 当前版本信息:
📦 根项目版本: 0.2.0
🌐 Web应用版本: 0.2.0
📱 Android versionCode: 200
📱 Android versionName: 0.2.0
```

### 更新版本号

```bash
# 更新到指定版本
node scripts/update-version.js 1.2.0

# 或使用npm脚本
npm run version:update 1.2.0
```

## 版本号规则

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

## 发布流程

### 1. 更新版本号

```bash
# 例如发布 1.1.0 版本
node scripts/update-version.js 1.1.0
```

### 2. 构建Android APK

```bash
# 方法1: 使用npm脚本
npm run android:build

# 方法2: 直接运行构建脚本
cd apps/android && ./build-release.sh
```

### 3. 验证构建结果

构建脚本会自动显示版本信息和构建结果。

## 版本历史

| 版本 | 发布日期 | 主要更新 |
|------|----------|----------|
| 0.2.0 | 2025-06-13 | 修复版本管理，统一前端显示版本号 |
| 1.0.0 | 2025-06-13 | 初始版本 |

## 注意事项

1. **版本号格式**: 必须使用语义化版本格式 `x.y.z`
2. **versionCode递增**: Android的versionCode必须递增，不能回退
3. **同步更新**: 使用版本管理脚本确保所有文件同步更新
4. **发布前检查**: 构建前会显示当前版本信息，请确认无误

## 常见问题

### Q: 如何回退版本号？
A: 不建议回退Android的versionCode，如需回退，请手动编辑相关文件。

### Q: 版本号不同步怎么办？
A: 使用版本管理脚本重新设置统一版本号。

### Q: 构建时版本号显示错误？
A: 检查 `apps/android/app/build.gradle` 文件中的版本配置是否正确。 