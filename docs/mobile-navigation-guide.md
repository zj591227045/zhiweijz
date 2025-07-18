# 移动端导航管理系统使用指南

## 概述

本系统解决了基于Capacitor的混合应用在Android和iOS平台上的手势后退问题，实现了正确的页面层级导航逻辑。

## 问题背景

### 原有问题
1. **Android端**：手势后退会执行浏览器历史后退，跳过模态框层级
2. **iOS端**：手势后退完全不生效
3. **缺乏统一的页面层级管理**

### 解决方案
- 实现页面层级管理（0级仪表盘 → 1级功能页面 → 2级模态框）
- 统一的后退处理逻辑
- 平台特定的手势处理
- Capacitor硬件后退按钮集成

## 系统架构

### 核心组件

1. **NavigationManager** (`/lib/mobile-navigation.ts`)
   - 页面层级状态管理
   - 导航历史记录
   - 后退逻辑处理

2. **PlatformGestureHandler** (`/lib/platform-gesture-handler.ts`)
   - 平台特定手势检测
   - 边缘滑动处理
   - 键盘和鼠标手势

3. **CapacitorIntegration** (`/lib/capacitor-integration.ts`)
   - 硬件后退按钮监听
   - 应用生命周期管理
   - 双击退出逻辑

4. **ModalNavigationProvider** (`/components/navigation/modal-navigation-provider.tsx`)
   - 模态框状态管理
   - 模态框导航历史
   - 统一的模态框渲染

## 使用方法

### 1. 页面级别使用

```tsx
import { useMobileBackHandler } from '@/hooks/use-mobile-back-handler';
import { PageLevel } from '@/lib/mobile-navigation';

export default function MyPage() {
  const { goBack, canGoBack } = useMobileBackHandler({
    pageId: 'my-page',
    pageLevel: PageLevel.FEATURE,
    enableHardwareBack: true,
    enableBrowserBack: true,
    onBack: () => {
      // 自定义后退逻辑
      console.log('处理后退');
      return false; // 返回false继续默认处理
    },
  });

  return (
    <div>
      <button onClick={goBack} disabled={!canGoBack}>
        返回
      </button>
      {/* 页面内容 */}
    </div>
  );
}
```

### 2. 模态框使用

```tsx
import { useModalBackHandler } from '@/hooks/use-mobile-back-handler';

export default function MyModal({ onClose }: { onClose: () => void }) {
  const { handleBack } = useModalBackHandler('my-modal', onClose);

  return (
    <div className="modal">
      <button onClick={onClose}>关闭</button>
      {/* 模态框内容 */}
    </div>
  );
}
```

### 3. 使用模态框导航提供者

```tsx
import { useModalNavigation } from '@/components/navigation/modal-navigation-provider';

export default function MyComponent() {
  const { openModal, closeModal } = useModalNavigation();

  const handleOpenModal = () => {
    openModal({
      id: 'example-modal',
      title: '示例模态框',
      component: MyModalComponent,
      props: { data: 'example' },
      size: 'md',
      closable: true,
      maskClosable: true,
      onClose: () => console.log('模态框关闭'),
    });
  };

  return (
    <button onClick={handleOpenModal}>
      打开模态框
    </button>
  );
}
```

## 页面层级定义

### 0级 - 仪表盘页面
- 路径：`/dashboard`, `/`
- 特点：应用根页面，无法后退
- 后退行为：双击退出应用

### 1级 - 功能页面
- 路径：`/settings`, `/transactions`, `/budgets` 等
- 特点：主要功能页面
- 后退行为：返回仪表盘

### 2级 - 模态框页面
- 路径：详情页面、编辑页面等
- 特点：临时性页面，通常以模态框形式展示
- 后退行为：关闭模态框，返回上一级页面

## 配置选项

### 手势配置
```typescript
initializePlatformGestures({
  enabled: true,
  sensitivity: 0.3,      // 手势灵敏度 (0-1)
  minDistance: 50,       // 最小滑动距离 (px)
  maxTime: 300,          // 最大滑动时间 (ms)
  edgeWidth: 20,         // 边缘检测区域宽度 (px)
});
```

### Capacitor配置
```typescript
initializeCapacitorIntegration({
  enabled: true,
  doubleClickExitInterval: 2000,  // 双击退出间隔 (ms)
  exitConfirmation: false,        // 是否显示退出确认
  customExitHandler: () => {      // 自定义退出处理
    // 返回true表示已处理，false继续默认逻辑
    return false;
  },
});
```

## 平台特定行为

### Android
- 监听硬件后退按钮
- 支持边缘滑动手势
- 双击后退按钮退出应用
- 禁用浏览器默认滑动导航

### iOS
- 主要依赖边缘滑动手势
- 禁用默认的后退手势
- 自定义触摸事件处理
- 支持状态栏和键盘适配

### Web
- 支持键盘快捷键（ESC、Alt+左箭头）
- 支持鼠标侧键
- 浏览器历史管理
- 响应式手势检测

## 调试和监控

### 日志输出
系统会输出详细的调试日志，前缀包括：
- `📱 [Navigation]` - 导航管理器
- `🎯 [GestureHandler]` - 手势处理器
- `🔌 [Capacitor]` - Capacitor集成
- `🎭 [ModalNavigation]` - 模态框导航

### 状态检查
```typescript
import { navigationManager } from '@/lib/mobile-navigation';

// 获取当前导航状态
const state = navigationManager.getNavigationState();
console.log('当前页面栈:', state.pageStack);
console.log('模态框栈:', state.modalStack);
console.log('是否可以退出应用:', state.canExitApp());
```

## 最佳实践

### 1. 页面注册
- 每个页面都应该使用 `useMobileBackHandler` 注册
- 正确设置页面ID和层级
- 提供合适的后退处理逻辑

### 2. 模态框管理
- 使用 `ModalNavigationProvider` 统一管理模态框
- 避免直接操作DOM显示/隐藏模态框
- 正确处理模态框的生命周期

### 3. 性能优化
- 避免在后退处理中执行耗时操作
- 合理使用防抖和节流
- 及时清理事件监听器

### 4. 用户体验
- 提供清晰的视觉反馈
- 保持一致的导航行为
- 考虑不同平台的用户习惯

## 故障排除

### 常见问题

1. **后退不生效**
   - 检查是否正确注册了页面
   - 确认 `onBack` 函数返回值
   - 查看控制台日志

2. **模态框无法关闭**
   - 检查模态框是否正确注册
   - 确认 `onClose` 回调是否正确
   - 检查模态框栈状态

3. **手势冲突**
   - 检查CSS的 `touch-action` 属性
   - 确认事件监听器的 `passive` 设置
   - 调整手势检测参数

### 调试步骤

1. 开启详细日志输出
2. 检查导航状态
3. 验证事件监听器
4. 测试不同平台行为
5. 检查Capacitor配置

## 更新和维护

### 版本兼容性
- Capacitor 5.x+
- React 18+
- Next.js 13+

### 更新注意事项
- 检查Capacitor插件版本
- 测试不同设备和系统版本
- 验证手势检测准确性
- 确保向后兼容性

---

## 总结

本移动端导航管理系统提供了完整的解决方案，解决了混合应用中的导航问题。通过正确的配置和使用，可以为用户提供原生应用般的导航体验。
