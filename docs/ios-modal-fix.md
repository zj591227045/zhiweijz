# iOS 家庭详情模态框全屏覆盖修复

## 问题描述

在 iOS Capacitor 环境中，家庭详情页的全屏模态框没有正确覆盖全屏，顶部工具栏遮盖了模态框内容。

## 问题原因

1. **z-index 值不够高**：原始的 `z-index: 9999` 在 iOS Capacitor 环境中不足以覆盖原生工具栏
2. **缺少 iOS 安全区域适配**：没有正确处理 iOS 的安全区域
3. **缺少 Capacitor 特定样式**：没有针对 Capacitor 环境的特殊处理

## 修复方案

### 1. 提高 z-index 值

```css
/* 主模态框 */
.family-detail-modal-overlay {
  z-index: 99999 !important;
}

/* 内部对话框 */
.modal-dialog {
  z-index: 100000 !important;
}

/* Capacitor iOS 环境 */
.capacitor-ios .family-detail-modal-overlay {
  z-index: 9999999 !important;
}
```

### 2. 添加 iOS 安全区域适配

```css
@supports (padding: max(0px)) {
  .family-detail-modal-overlay {
    padding-top: max(0px, env(safe-area-inset-top)) !important;
    padding-bottom: max(0px, env(safe-area-inset-bottom)) !important;
    padding-left: max(0px, env(safe-area-inset-left)) !important;
    padding-right: max(0px, env(safe-area-inset-right)) !important;
  }
}
```

### 3. 添加 Capacitor 特定处理

```css
.capacitor-ios .family-detail-modal-overlay {
  /* 强制覆盖所有原生元素 */
  -webkit-transform: translateZ(0) !important;
  transform: translateZ(0) !important;
  will-change: transform !important;
}

/* 强制覆盖 Capacitor 状态栏 */
.capacitor-ios .family-detail-modal-overlay::before {
  content: '' !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: env(safe-area-inset-top, 44px) !important;
  background-color: var(--background-color) !important;
  z-index: inherit !important;
  pointer-events: none !important;
}
```

### 4. 动态检测和类管理

```typescript
useEffect(() => {
  if (isOpen) {
    document.body.classList.add('family-detail-modal-open');
    // 检测 iOS 环境并添加相应类
    if (typeof window !== 'undefined') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isCapacitor = !!(window as any).Capacitor;
      if (isIOS) {
        document.body.classList.add('ios-app');
      }
      if (isCapacitor) {
        document.body.classList.add('capacitor-ios');
      }
      // iPhone 16 Pro 检测
      if (window.screen.width === 402 && window.screen.height === 874) {
        document.body.classList.add('iphone-16-pro');
      }
    }
  } else {
    document.body.classList.remove('family-detail-modal-open');
  }

  return () => {
    document.body.classList.remove('family-detail-modal-open');
  };
}, [isOpen]);
```

## 修复的文件

1. **apps/web/src/components/family-detail-modal.tsx**
   - 增加了 z-index 值
   - 添加了 iOS 环境检测
   - 添加了 body 类管理

2. **apps/web/src/components/family-detail-modal.css** (新建)
   - 专用的模态框样式文件
   - iOS 和 Capacitor 特定样式
   - 安全区域适配

## 测试验证

修复后应该验证：

1. ✅ **Web 端正常显示**：模态框正确覆盖全屏
2. ✅ **iOS Capacitor 正常显示**：模态框覆盖原生工具栏
3. ✅ **安全区域适配**：内容不被刘海屏遮挡
4. ✅ **内部对话框正常**：编辑、添加、删除对话框正确显示
5. ✅ **动画效果正常**：进入和退出动画流畅

## 注意事项

- 使用了非常高的 z-index 值来确保覆盖原生元素
- 添加了硬件加速来提升性能
- 使用了 `!important` 来确保样式优先级
- 针对不同 iOS 设备（如 iPhone 16 Pro）进行了特殊处理

## 相关文档

- [iOS 安全区域适配文档](./ios-safe-area.md)
- [全屏模态框开发标准](./App/dynamic-pages-development-standards.md)
- [家庭详情模态框实现文档](./App/family-detail-modal-implementation.md)
