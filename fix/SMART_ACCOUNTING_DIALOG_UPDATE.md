# 智能记账对话框样式更新

## 更新概述

根据旧版智能记账对话框的设计，对新版进行了样式调整，使其布局更紧凑、按钮排列更合理。

## 主要变更

### 1. 布局结构调整

**旧版布局（目标样式）：**
- 智能识别和直接添加按钮在同一行
- 手动记账按钮单独一行，样式突出（橙色背景）
- 整体布局紧凑

**新版布局（修改前）：**
- 所有按钮垂直排列
- 手动记账按钮样式较弱（透明背景）

**修改后：**
- ✅ 智能识别和直接添加按钮在同一行
- ✅ 手动记账按钮单独一行，使用橙色背景
- ✅ 添加分隔线和适当间距

### 2. 组件结构变更

```tsx
// 修改前
<div className="smart-accounting-buttons">
  <button className="identify-button">智能识别</button>
  <button className="direct-button">直接添加</button>
</div>
</div>
<div className="smart-accounting-dialog-footer">
  <button className="smart-accounting-manual-button">手动记账</button>
</div>

// 修改后
<div className="smart-accounting-buttons">
  <button className="identify-button">智能识别</button>
  <button className="direct-button">直接添加</button>
</div>
<div className="smart-accounting-manual-wrapper">
  <button className="smart-accounting-manual-button">手动记账</button>
</div>
</div>
```

### 3. CSS样式更新

#### 对话框整体样式
- 调整最大宽度从400px到480px
- 使用固定定位居中显示
- 优化动画效果

#### 按钮样式
- **智能识别按钮**：蓝色背景 (#3b82f6)
- **直接添加按钮**：绿色背景 (#22c55e)
- **手动记账按钮**：橙色背景 (#f59e0b)，带阴影和悬停效果

#### 布局优化
- 移除footer结构，使用wrapper包装手动记账按钮
- 添加分隔线和适当的间距
- 优化按钮的内边距和字体大小

### 4. 交互效果

- 按钮点击时的缩放效果
- 手动记账按钮的悬停动画（上移和阴影变化）
- 优化的加载动画

## 文件变更

### 修改的文件：
1. `apps/web/src/components/transactions/smart-accounting-dialog.tsx`
   - 调整组件结构，移除footer，使用manual-wrapper

2. `apps/web/src/styles/smart-accounting-dialog.css`
   - 完全重写样式，参考旧版设计
   - 添加CSS变量默认值
   - 优化动画和交互效果

## 视觉对比

### 旧版特点（参考目标）：
- 紧凑的布局
- 智能识别（蓝色）+ 直接添加（绿色）在同一行
- 手动记账（橙色）单独一行，样式突出

### 新版特点（修改后）：
- ✅ 完全匹配旧版布局
- ✅ 按钮颜色和排列一致
- ✅ 手动记账按钮突出显示
- ✅ 保持现代化的交互效果

## 技术细节

### CSS变量使用
所有颜色都使用CSS变量，并提供默认值：
```css
background-color: var(--primary-color, #3b82f6);
color: var(--text-primary, #1f2937);
border: 1px solid var(--border-color, #e5e7eb);
```

### 响应式设计
- 对话框宽度：90%，最大480px
- 移动端适配保持良好的可用性

### 动画效果
- 淡入动画：fadeIn (0.2s)
- 滑入动画：slideUp (0.3s)
- 按钮交互：缩放和悬停效果

## 测试建议

1. 验证按钮布局是否与旧版一致
2. 测试所有交互效果（点击、悬停）
3. 确认在不同屏幕尺寸下的显示效果
4. 验证加载状态的动画效果 