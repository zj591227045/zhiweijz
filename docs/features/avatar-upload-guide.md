# 头像上传功能使用指南

## 📋 功能概述

头像上传功能支持用户通过多种方式设置个人头像，包括预设头像选择和自定义图片上传。该功能具有完整的向后兼容性，并支持多平台使用。

## 🚀 主要特性

### 1. 向后兼容性
- ✅ 保留原有预设头像选择功能
- ✅ 当文件存储未启用时，自动回退到预设头像模式
- ✅ 支持现有头像数据的无缝迁移

### 2. 多平台支持
- **Web端（桌面）**：支持点击上传、拖拽上传
- **Web端（移动）**：支持点击上传、调用设备相机/相册
- **iOS原生应用**：支持Capacitor相机和相册插件
- **Android原生应用**：支持Capacitor相机和相册插件

### 3. 智能图片处理
- 🖼️ 自动图片压缩和优化
- ✂️ 圆形头像裁剪功能
- 📏 智能尺寸调整（最大1024x1024）
- 🗜️ 自适应压缩质量（根据文件大小）

### 4. 完善的用户体验
- 📊 实时上传进度显示
- ⚠️ 详细错误提示和处理
- 🔒 权限检查和引导
- 📱 响应式设计，适配各种屏幕

## 🛠️ 技术实现

### 核心组件

1. **AvatarUploader** - 主要头像上传组件
2. **ImageCropper** - 图片裁剪组件
3. **UploadProgress** - 上传进度指示器
4. **PlatformFilePicker** - 跨平台文件选择器

### 关键技术

- **文件存储状态检测**：自动检测S3存储配置状态
- **平台能力检测**：动态检测设备相机、相册支持
- **权限管理**：统一的权限请求和处理机制
- **性能优化**：防抖、节流、智能压缩等优化策略

## 📖 使用说明

### 管理员配置

1. **启用文件存储服务**
   ```
   进入管理后台 → 存储管理 → 配置S3存储
   ```

2. **配置存储桶**
   - 头像存储桶：`avatars`
   - 附件存储桶：`transaction-attachments`
   - 临时文件桶：`temp-files`

### 用户使用流程

1. **访问个人资料页面**
   ```
   设置 → 个人资料 → 点击头像
   ```

2. **选择头像来源**
   - 📷 拍照（移动设备）
   - 🖼️ 从相册选择
   - 🎨 选择预设头像

3. **图片处理**
   - 自动显示裁剪界面
   - 拖拽调整裁剪区域
   - 确认裁剪并上传

## 🔧 开发指南

### 集成头像上传组件

```tsx
import { AvatarUploader } from '@/components/profile/avatar-uploader';

function ProfilePage() {
  const handleAvatarChange = (avatarData) => {
    if (avatarData.type === 'preset') {
      // 处理预设头像
      updateAvatarId(avatarData.data.id);
    } else {
      // 处理文件上传
      uploadAvatar(avatarData.data);
    }
  };

  return (
    <AvatarUploader
      currentAvatar={user.avatar}
      username={user.username}
      onAvatarChange={handleAvatarChange}
      isUploading={isUploading}
    />
  );
}
```

### 自定义文件验证

```typescript
import { validateAvatarFile } from '@/lib/file-upload-utils';

const validation = validateAvatarFile(file);
if (!validation.valid) {
  console.error(validation.error);
}
```

### 平台能力检测

```typescript
import { platformFilePicker } from '@/lib/platform-file-picker';

const capabilities = await platformFilePicker.checkCapabilities();
console.log('支持相机:', capabilities.hasCamera);
console.log('支持相册:', capabilities.hasGallery);
```

## 📱 移动端特殊配置

### iOS配置

在 `ios/App/App/Info.plist` 中添加权限：

```xml
<key>NSCameraUsageDescription</key>
<string>需要访问相机来拍摄头像</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册来选择头像</string>
```

### Android配置

在 `android/app/src/main/AndroidManifest.xml` 中添加权限：

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## 🐛 故障排除

### 常见问题

1. **文件上传功能不可用**
   - 检查S3存储配置是否正确
   - 确认存储桶是否存在且可访问
   - 验证网络连接状态

2. **相机/相册无法访问**
   - 检查设备权限设置
   - 确认Capacitor插件是否正确安装
   - 验证平台兼容性

3. **图片压缩失败**
   - 检查浏览器兼容性
   - 确认文件格式是否支持
   - 验证文件大小是否超限

### 调试技巧

1. **启用详细日志**
   ```typescript
   // 在浏览器控制台查看详细日志
   console.log('📷 拍照成功:', result);
   console.log('🗜️ 压缩完成:', processedFile);
   ```

2. **性能监控**
   ```typescript
   import { PerformanceTimer } from '@/lib/performance-utils';
   
   const timer = new PerformanceTimer();
   timer.start('upload');
   // ... 上传操作
   console.log('上传耗时:', timer.end('upload'), 'ms');
   ```

## 🔄 版本更新

### v1.0.0 (当前版本)
- ✅ 基础头像上传功能
- ✅ 多平台支持
- ✅ 图片裁剪和压缩
- ✅ 进度指示和错误处理

### 计划功能
- 🔄 批量头像上传
- 🎨 更多裁剪形状选项
- 📊 上传统计和分析
- 🔗 社交平台头像同步

## 📞 技术支持

如遇到问题，请：

1. 查看浏览器控制台错误信息
2. 检查网络连接和存储配置
3. 参考本文档的故障排除部分
4. 联系技术支持团队
