# iOS 灵动岛适配修复文档

## 问题描述

在iOS设备上，特别是iPhone 14 Pro、iPhone 15 Pro、iPhone 16 Pro等具有灵动岛（Dynamic Island）的设备上，应用的顶部工具栏与灵动岛区域发生重叠，影响用户体验。

## 修复方案

### 1. 顶部工具栏适配

**修改文件：** `apps/web/src/styles/ios-fixes.css`

- 增加顶部工具栏的 `padding-top`，确保内容不与灵动岛重叠
- 使用 `calc(env(safe-area-inset-top, 0px) + 20px)` 提供额外的保护间距
- 通过伪元素让背景延伸到安全区域，包括灵动岛区域

### 2. 登录页面主题选择器适配

**修改文件：** `apps/web/src/styles/ios-fixes.css`

- 调整主题切换器的 `margin-top`，避免与灵动岛重叠
- 登录页面使用更大的顶部间距：`calc(env(safe-area-inset-top, 0px) + 2.5rem)`
- 确保在动态背景之上显示

### 3. 背景延伸处理

**修改文件：** `apps/web/src/styles/ios-fixes.css`

- 确保页面背景延伸到屏幕顶部，包括灵动岛区域
- 使用负边距和伪元素技术实现背景延伸
- 保持内容在安全区域内，背景覆盖整个屏幕

### 4. 设备特定适配

**新增文件：** `apps/web/src/styles/ios-dynamic-island.css`

- 针对不同iPhone型号的精确适配
- 支持iPhone 14 Pro、15 Pro、16 Pro等设备
- 提供通用的后备适配方案

### 5. 安全区域优化

**修改文件：** `apps/web/src/styles/ios-safe-area.css`

- 更新安全区域适配逻辑
- 增加灵动岛保护间距
- 优化底部导航栏的安全区域处理

### 6. 输入框优化

**修改文件：** `apps/web/src/app/auth/login/page.tsx`

- 为输入框添加iOS优化属性：`autoCorrect="off"`、`autoCapitalize="off"`、`spellCheck="false"`
- 设置最小字体大小为16px，防止iOS自动缩放
- 优化输入框的触摸体验

## 技术实现细节

### CSS 变量和环境变量

```css
/* 使用CSS环境变量获取安全区域信息 */
padding-top: calc(env(safe-area-inset-top, 0px) + 20px);

/* 背景延伸到安全区域 */
margin-top: calc(-1 * env(safe-area-inset-top, 0px));
```

### 媒体查询适配

```css
/* iPhone 16 Pro 特定适配 */
@media only screen 
  and (device-width: 402px) 
  and (device-height: 874px) 
  and (-webkit-device-pixel-ratio: 3) {
  /* 设备特定样式 */
}
```

### 伪元素背景延伸

```css
.ios-app .header::before {
  content: '';
  position: absolute;
  top: calc(-1 * env(safe-area-inset-top, 0px));
  /* ... 其他样式 */
}
```

## 样式文件结构

1. **ios-fixes.css** - 主要的iOS修复样式
2. **ios-safe-area.css** - 安全区域适配
3. **ios-dynamic-island.css** - 灵动岛特定适配
4. **globals.css** - 导入所有样式文件

## 应用检测逻辑

应用通过以下方式检测iOS环境：

```typescript
// 检测Capacitor iOS环境
const { Capacitor } = await import('@capacitor/core');
const isCapacitor = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

if (isCapacitor && platform === 'ios') {
  document.body.classList.add('ios-app');
}
```

## 测试验证

### 测试设备
- iPhone 14 Pro
- iPhone 14 Pro Max  
- iPhone 15 Pro
- iPhone 15 Pro Max
- iPhone 16 Pro
- iPhone 16 Pro Max

### 测试场景
1. 登录页面主题选择器位置
2. 各页面顶部工具栏位置
3. 背景延伸效果
4. 动态背景显示
5. 底部导航栏安全区域适配

## 注意事项

1. **仅iOS生效**：所有修复样式仅在iOS Capacitor环境下生效
2. **向后兼容**：对没有灵动岛的iOS设备保持兼容
3. **性能优化**：使用硬件加速和层级优化
4. **主题支持**：支持明暗主题切换

## 相关文件

- `apps/web/src/styles/ios-fixes.css`
- `apps/web/src/styles/ios-safe-area.css`
- `apps/web/src/styles/ios-dynamic-island.css`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/auth/login/page.tsx`
- `apps/web/src/components/layout/page-container.tsx`
