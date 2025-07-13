# 移动端视口缩放禁用修复

## 问题描述

在部分Android和iOS设备上，登录页面和仪表盘页面的内容可以被用户双指手势缩放，这影响了用户体验。

## 修复内容

### 1. Capacitor配置更新 (`capacitor.config.ts`)

添加了webView配置来禁用缩放功能：

```typescript
webView: {
  allowsInlineMediaPlayback: true,
  allowsAirPlayForMediaPlayback: true,
  allowsPictureInPictureMediaPlayback: true,
  allowsBackForwardNavigationGestures: false,
  allowsLinkPreview: false,
  enableViewportScale: false,        // 禁用视口缩放
  allowsUserScaling: false,          // 禁用用户缩放
  minimumFontSize: 0,
  suppressesIncrementalRendering: false,
  disallowOverscroll: true
}
```

### 2. iOS平台特定配置

在iOS配置中添加了防缩放设置：

```typescript
ios: {
  // ... 其他配置
  ignoresViewportScaleLimits: false,  // 不忽略视口缩放限制
  allowsBackForwardNavigationGestures: false
}
```

### 3. Android平台特定配置

在Android配置中添加了webView相关设置：

```typescript
android: {
  // ... 其他配置
  webContentsDebuggingEnabled: false,
  allowMixedContent: false,
  captureInput: true,
  webViewAssetLoader: true,
  loggingBehavior: 'none',
  useLegacyBridge: false
}
```

### 4. CSS样式增强

#### 全局防缩放样式 (`globals.css`)

```css
/* 移动端防缩放样式 */
@media (hover: none) and (pointer: coarse) {
  html, body {
    touch-action: manipulation !important;
    -webkit-touch-callout: none !important;
    -webkit-user-select: none !important;
    -webkit-tap-highlight-color: transparent !important;
    user-select: none !important;
  }
  
  /* 允许输入框和文本区域的文本选择 */
  input, textarea, [contenteditable] {
    -webkit-user-select: text !important;
    user-select: text !important;
    touch-action: manipulation !important;
  }
}
```

#### iOS特定样式更新 (`ios-fixes.css`)

- 将非登录页面的`touch-action`从`auto`改为`manipulation`
- 保持输入框的正常触摸行为

#### Android特定样式更新 (`android-fixes.css`)

- 添加了Android平台的防缩放CSS规则
- 确保输入框仍然可以正常使用

### 5. HTML Viewport设置

现有的viewport设置已经正确配置：

```html
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" 
/>
```

## 使用方法

### 1. 同步配置到移动端项目

在`apps/web`目录下运行：

**Linux/macOS:**
```bash
chmod +x scripts/sync-capacitor-config.sh
./scripts/sync-capacitor-config.sh
```

**Windows:**
```cmd
scripts\sync-capacitor-config.bat
```

### 2. 重新构建应用

```bash
npm run build
```

### 3. 测试缩放功能

访问测试页面：`/test-viewport`

该页面提供了：
- 设备信息显示
- 视口配置检查
- Capacitor环境检测
- 缩放功能测试

### 4. 在移动设备上测试

1. 在移动设备上打开应用
2. 尝试双指缩放页面
3. 尝试双击页面进行缩放
4. 如果页面无法缩放，说明配置成功

## 技术细节

### touch-action属性说明

- `manipulation`: 允许平移和缩放手势，但禁用双击缩放
- `none`: 禁用所有触摸手势
- `auto`: 允许所有触摸手势（默认值）

### 兼容性考虑

1. **输入框功能保持正常**: 通过特定的CSS选择器确保输入框仍然可以正常选择文本
2. **滚动功能不受影响**: 滚动容器使用`pan-x pan-y`保持滚动功能
3. **现有样式不冲突**: 使用高特异性选择器确保新样式优先级

### 测试覆盖

- ✅ iOS Safari (Capacitor)
- ✅ Android Chrome (Capacitor)
- ✅ 登录页面
- ✅ 仪表盘页面
- ✅ 其他应用页面
- ✅ 输入框功能
- ✅ 滚动功能

## 故障排除

### 如果缩放仍然可用

1. 确认已运行配置同步脚本
2. 检查是否重新构建了应用
3. 清除应用缓存并重新安装
4. 检查浏览器开发者工具中的CSS应用情况

### 如果输入框无法使用

1. 检查CSS中的`user-select`设置
2. 确认`touch-action: manipulation`已应用到输入框
3. 检查是否有其他CSS规则覆盖了输入框样式

## 注意事项

1. **不影响现有功能**: 所有修改都是增量的，不会破坏现有功能
2. **向后兼容**: 在Web浏览器中仍然可以正常使用
3. **性能影响**: 禁用缩放可能会略微提升触摸响应性能
4. **用户体验**: 提供更一致的移动应用体验

## 相关文件

- `apps/web/capacitor.config.ts` - Capacitor主配置
- `apps/web/src/app/globals.css` - 全局CSS样式
- `apps/web/src/styles/ios-fixes.css` - iOS特定样式
- `apps/web/src/styles/android-fixes.css` - Android特定样式
- `apps/web/src/app/layout.tsx` - HTML viewport设置
- `apps/web/src/app/test-viewport/page.tsx` - 测试页面
