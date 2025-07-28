# 安卓客户端模态框手势回退问题修复

## 问题描述

在安卓客户端下，在仪表盘页面打开编辑交易模态框时，使用手势回退会导致直接退出应用，看起来像是没有检测到模态框这个次级窗口，直接从仪表盘页面退出应用了。

## 问题分析

### 根本原因

1. **多个后退处理器冲突**：
   - 仪表盘页面使用 `useMobileBackHandler` 并有自定义的 `onBack` 处理逻辑
   - TransactionEditModal 使用 `useModalBackHandler`，它内部也调用了 `useMobileBackHandler`
   - 当模态框打开时，两个后退处理器同时活跃

2. **处理优先级问题**：
   - 在 `useMobileBackHandler` 的处理逻辑中，自定义的 `onBack` 处理会优先于导航管理器的模态框处理
   - 仪表盘的后退处理会先执行，可能会干扰模态框的正确处理

3. **手势监听器注册顺序**：
   - 手势处理器按注册顺序遍历监听器，没有考虑页面层级优先级
   - 模态框的监听器可能不是最先被处理的

4. **上下文脱离问题**（关键发现）：
   - TransactionEditModal 使用 `createPortal` 直接渲染到 document.body
   - 这导致它脱离了 ModalNavigationProvider 的 React 上下文
   - 原本使用的 `useModalBackHandler` 无法访问到 ModalNavigationProvider 的上下文
   - 存在两个同名的 `useModalBackHandler` 函数，导致混淆

## 修复方案

### 1. 修改仪表盘页面的后退处理逻辑

**文件**: `apps/web/src/app/dashboard/page.tsx`

**修改内容**:
- 在仪表盘的自定义后退处理中，首先检查导航管理器中是否有模态框
- 如果有模态框存在，跳过仪表盘的处理，让模态框处理器处理
- 避免了多个处理器之间的冲突

```typescript
onBack: () => {
  // 检查导航管理器中是否有模态框
  const navigationState = navigationManager.getNavigationState();
  if (navigationState.modalStack.length > 0) {
    console.log('🏠 [Dashboard] 检测到模态框存在，跳过仪表盘后退处理');
    return false; // 不处理，让模态框处理器处理
  }

  if (currentView === 'calendar') {
    setCurrentView('dashboard');
    return true; // 已处理
  }

  return false; // 未处理，允许退出应用
},
```

### 2. 优化手势处理器的优先级机制

**文件**: `apps/web/src/lib/platform-gesture-handler.ts`

**修改内容**:
1. **引入优先级机制**：
   - 为手势监听器添加优先级和页面层级信息
   - 模态框层级优先级最高（100），功能页面中等（50），仪表盘最低（10）

2. **修改监听器数据结构**：
   ```typescript
   interface GestureListener {
     handler: (direction: 'left' | 'right') => boolean;
     priority: number; // 优先级，数字越大优先级越高
     pageLevel?: PageLevel; // 页面层级
   }
   ```

3. **按优先级排序处理**：
   - 在处理手势时，按优先级从高到低排序监听器
   - 确保模态框的处理器优先执行

### 3. 修改手势监听器注册方法

**文件**: `apps/web/src/hooks/use-mobile-back-handler.ts`

**修改内容**:
- 在注册手势监听器时传递页面层级信息
- 确保不同层级的页面有正确的处理优先级

```typescript
platformGestureHandler.addGestureListener(gestureListener, pageLevel);
```

### 4. 修复重复方法定义

**文件**: `apps/web/src/lib/platform-gesture-handler.ts`

**修改内容**:
- 移除了重复的 `removeGestureListener` 方法定义
- 确保代码的正确性和一致性

## 修复效果

1. **模态框优先处理**：模态框的后退处理现在有最高优先级，确保在模态框打开时手势回退会正确关闭模态框而不是退出应用

2. **避免处理器冲突**：仪表盘页面的后退处理器会检查是否有模态框存在，避免与模态框处理器冲突

3. **保持iOS兼容性**：所有修改都是针对通用的手势处理逻辑，不会影响iOS应用的正常功能

4. **向后兼容**：修改保持了原有的API接口，不会影响其他页面的正常使用

## 测试建议

1. **安卓设备测试**：
   - 在仪表盘页面打开编辑交易模态框
   - 使用手势回退，确认模态框正确关闭而不是退出应用
   - 测试多层模态框的情况

2. **iOS设备测试**：
   - 确认iOS设备上的手势回退功能仍然正常工作
   - 验证模态框的回退处理没有受到影响

3. **其他页面测试**：
   - 测试其他页面的模态框回退功能
   - 确认修改没有影响到其他功能页面的导航

## 注意事项

1. **仅影响安卓应用**：修改主要针对安卓平台的手势处理问题，不会影响iOS应用的正常功能

2. **优先级机制**：新的优先级机制确保了正确的处理顺序，但需要在添加新的后退处理器时注意设置正确的页面层级

3. **调试信息**：增加了详细的调试日志，便于后续问题排查和性能优化
