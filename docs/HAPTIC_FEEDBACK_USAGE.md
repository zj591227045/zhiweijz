# 震动反馈使用指南

## 📱 概述

本文档介绍如何在智能记账应用中使用震动反馈功能，提升用户交互体验。

## 🔧 技术架构

### 核心组件
1. **震动反馈工具** (`apps/web/src/utils/haptic-feedback.ts`)
   - 底层震动API封装
   - 支持Capacitor Haptics和Web Vibration API
   - 提供多种震动类型和模式

2. **震动反馈Hook** (`apps/web/src/hooks/use-haptic-feedback.ts`)
   - React Hook封装
   - 提供分类的震动反馈函数
   - 支持配置和安全调用

3. **增强的Button组件** (`apps/web/src/components/ui/button.tsx`)
   - 内置震动反馈支持
   - 根据按钮类型自动选择震动强度

## 🎯 震动反馈类型

### 基础震动类型
- **轻微震动** (`light`): 50ms，用于轻触、选择等
- **中等震动** (`medium`): 100ms，用于确认、提交等
- **重度震动** (`heavy`): 200ms，用于重要操作
- **成功震动** (`success`): [100, 50, 100]，用于操作成功
- **警告震动** (`warning`): [150, 100, 150]，用于警告提示
- **错误震动** (`error`): [200, 100, 200, 100, 200]，用于错误提示
- **选择震动** (`selection`): 30ms，用于选择操作

### 录音专用震动
- **开始录音** (`start`): 中等震动
- **停止录音** (`stop`): 轻微震动
- **取消录音** (`cancel`): 警告震动
- **录音成功** (`success`): 成功震动
- **录音错误** (`error`): 错误震动
- **按钮触摸** (`touch`): 轻微震动

## 📝 使用方法

### 1. 使用震动反馈Hook

```typescript
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

function MyComponent() {
  const haptic = useHapticFeedback();

  const handleSave = async () => {
    // 触发保存震动
    await haptic.form.save();
    // 执行保存逻辑
    await saveData();
  };

  const handleDelete = async () => {
    // 触发危险操作震动
    await haptic.button.destructive();
    // 执行删除逻辑
    await deleteData();
  };

  return (
    <div>
      <button onClick={handleSave}>保存</button>
      <button onClick={handleDelete}>删除</button>
    </div>
  );
}
```

### 2. 使用增强的Button组件

```typescript
import { Button } from '@/components/ui/button';

function MyForm() {
  return (
    <div>
      {/* 自动轻微震动 */}
      <Button variant="default">确认</Button>
      
      {/* 自动警告震动 */}
      <Button variant="destructive">删除</Button>
      
      {/* 禁用震动 */}
      <Button enableHaptic={false}>静默按钮</Button>
    </div>
  );
}
```

### 3. 使用高阶函数包装

```typescript
import { withHapticFeedback } from '@/hooks/use-haptic-feedback';

function MyComponent() {
  const originalClick = () => {
    console.log('按钮被点击');
  };

  // 包装点击事件，自动添加震动反馈
  const handleClick = withHapticFeedback(originalClick, 'primary');

  return <button onClick={handleClick}>点击我</button>;
}
```

### 4. 直接使用震动工具

```typescript
import { haptic, recordingHaptics } from '@/utils/haptic-feedback';

// 基础震动
await haptic.light();
await haptic.success();

// 录音震动
await recordingHaptics.start();
await recordingHaptics.error();
```

## 🎨 最佳实践

### 按钮类型震动映射
- **主要按钮** (保存、确认、提交): `medium` 震动
- **次要按钮** (取消、返回): `light` 震动
- **危险按钮** (删除、清空): `warning` 震动
- **添加按钮**: `light` 震动
- **编辑按钮**: `light` 震动

### 表单操作震动映射
- **保存成功**: `success` 震动
- **提交表单**: `medium` 震动
- **重置表单**: `warning` 震动
- **验证失败**: `error` 震动

### 导航操作震动映射
- **切换标签页**: `selection` 震动
- **返回/前进**: `light` 震动
- **菜单操作**: `light` 震动

## 🔧 配置选项

### 全局配置
```typescript
import { useConfiguredHapticFeedback } from '@/hooks/use-haptic-feedback';

const haptic = useConfiguredHapticFeedback({
  enabled: true,              // 总开关
  buttonFeedback: true,       // 按钮反馈
  formFeedback: true,         // 表单反馈
  navigationFeedback: true,   // 导航反馈
  recordingFeedback: true     // 录音反馈
});
```

### 组件级配置
```typescript
// 禁用特定组件的震动反馈
const haptic = useHapticFeedback(false);

// 或者使用配置对象
const haptic = useConfiguredHapticFeedback({
  enabled: false
});
```

## 📱 平台支持

### Android
- ✅ Capacitor Haptics插件（推荐）
- ✅ Web Vibration API（备用）
- ✅ 支持复杂震动模式

### iOS
- ✅ Capacitor Haptics插件（推荐）
- ❌ Web Vibration API（不支持）
- ⚠️ 震动模式可能有所不同

### Web浏览器
- ⚠️ Web Vibration API（部分支持）
- ❌ 复杂震动模式支持有限
- ✅ 基础震动功能可用

## 🐛 错误处理

### 自动降级
```typescript
// 系统会自动按以下顺序尝试：
// 1. Capacitor Haptics插件
// 2. Web Vibration API
// 3. 静默失败（不影响功能）
```

### 错误监控
```typescript
import { getHapticSupport } from '@/utils/haptic-feedback';

const support = getHapticSupport();
console.log('震动支持情况:', support);
// {
//   capacitor: boolean,
//   web: boolean,
//   supported: boolean
// }
```

## 📊 性能考虑

### 最佳实践
1. **避免频繁调用**: 不要在短时间内连续触发震动
2. **用户设置**: 提供震动开关，尊重用户偏好
3. **电池优化**: 震动会消耗电池，适度使用
4. **无障碍**: 震动可以作为视觉反馈的补充

### 性能监控
```typescript
// 监控震动执行时间
const startTime = performance.now();
await haptic.medium();
const duration = performance.now() - startTime;
console.log(`震动执行时间: ${duration}ms`);
```

## 🧪 测试指南

### 功能测试
1. 在不同设备上测试震动效果
2. 验证震动强度是否合适
3. 检查震动时机是否准确
4. 测试错误处理和降级

### 用户体验测试
1. 收集用户对震动强度的反馈
2. 观察用户是否会禁用震动
3. 测试震动对操作流畅度的影响
4. 验证震动是否增强了交互体验

## 📝 已集成组件列表

### ✅ 已完成
- [x] 智能记账模态框录音功能
- [x] 智能记账模态框相机功能
- [x] 底部导航栏添加按钮
- [x] 添加账本按钮
- [x] 添加分类按钮
- [x] 通用Button组件
- [x] 确认对话框
- [x] 删除确认对话框
- [x] 签到按钮
- [x] 分类删除确认对话框
- [x] 管理员确认模态框

### 🔄 待集成
- [ ] 表单提交按钮
- [ ] 编辑按钮
- [ ] 标签页切换
- [ ] 菜单操作
- [ ] 搜索功能
- [ ] 筛选功能

## 🚀 扩展功能

### 自定义震动模式
```typescript
import { triggerHapticFeedback, HapticType } from '@/utils/haptic-feedback';

// 创建自定义震动类型
const customPattern = {
  capacitorType: 'impact',
  capacitorStyle: 'medium',
  webPattern: [100, 50, 100, 50, 100]
};

// 使用自定义震动
await triggerHapticFeedback(HapticType.CUSTOM);
```

### 震动反馈分析
```typescript
// 收集震动使用数据
const hapticAnalytics = {
  trackHapticUsage: (type: string) => {
    // 发送分析数据
    analytics.track('haptic_feedback_used', { type });
  }
};
```

## 📚 参考资料

- [Capacitor Haptics文档](https://capacitorjs.com/docs/apis/haptics)
- [Web Vibration API文档](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [iOS触觉反馈指南](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- [Android震动模式指南](https://developer.android.com/guide/topics/ui/haptics)
