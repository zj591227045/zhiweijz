# 组件样式最佳实践

本文档提供了"只为记账"项目中组件样式的最佳实践和具体示例，帮助开发人员解决常见的样式问题并保持代码的一致性。

## 目录

1. [组件封装实践](#组件封装实践)
2. [样式问题排查流程](#样式问题排查流程)
3. [常见组件样式示例](#常见组件样式示例)
4. [与设计稿对比技巧](#与设计稿对比技巧)
5. [性能优化建议](#性能优化建议)

## 组件封装实践

### 基础组件封装模式

当需要封装第三方组件或创建自定义组件时，遵循以下模式：

```tsx
// 1. 导入必要的依赖
import React from 'react';
import { cn } from '@/lib/utils';

// 2. 定义明确的Props接口
interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

// 3. 实现组件，使用解构赋值提取自定义属性
export function CustomButton({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: CustomButtonProps) {
  // 4. 使用cn工具函数合并类名
  return (
    <button
      className={cn(
        'button', // 基础类
        `button-${variant}`, // 变体类
        `button-${size}`, // 尺寸类
        isLoading && 'button-loading', // 条件类
        className // 自定义类
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="loading-spinner" />}
      {children}
    </button>
  );
}
```

### 样式隔离技巧

为避免样式冲突，可以使用以下技巧：

1. **CSS模块**：为每个组件创建单独的CSS模块文件
2. **命名空间**：使用组件名作为最外层类名，形成命名空间
3. **BEM命名法**：使用Block-Element-Modifier命名法组织CSS类名

```css
/* CustomButton.module.css */
.custom-button {
  /* 基础样式 */
}

.custom-button__icon {
  /* 元素样式 */
}

.custom-button--primary {
  /* 修饰符样式 */
}
```

### 组件变体实现

对于具有多种变体的组件，推荐使用以下方式实现：

```tsx
// 定义变体映射
const variantStyles = {
  primary: 'bg-primary-color text-white',
  secondary: 'bg-secondary-color text-white',
  outline: 'bg-transparent border border-primary-color text-primary-color',
};

// 在组件中使用
<button className={cn('base-styles', variantStyles[variant], className)} />
```

## 样式问题排查流程

当遇到样式问题时，按照以下流程进行排查：

### 1. 检查CSS变量使用

首先检查是否使用了正确的CSS变量：

```css
/* ❌ 错误 */
.element {
  background-color: var(--primary);
  color: var(--foreground);
}

/* ✅ 正确 */
.element {
  background-color: var(--primary-color);
  color: var(--text-primary);
}
```

### 2. 检查类名和HTML结构

确保HTML结构与示例页面一致：

```html
<!-- 示例页面结构 -->
<div class="form-section">
  <div class="section-title">标题</div>
  <div class="form-group">
    <label>标签</label>
    <input type="text">
  </div>
</div>

<!-- 确保React组件生成相同的结构 -->
<div className="form-section">
  <div className="section-title">标题</div>
  <div className="form-group">
    <label>标签</label>
    <input type="text" />
  </div>
</div>
```

### 3. 使用浏览器开发工具

1. 检查元素是否应用了预期的类名
2. 检查CSS变量是否正确计算
3. 检查是否有样式被覆盖（查看已应用的样式和被覆盖的样式）

### 4. 对比示例页面

使用浏览器开发工具对比示例页面和实际页面的差异：

1. 在两个标签页中分别打开示例页面和实际页面
2. 使用开发工具检查相同元素的样式差异
3. 记录并修复差异

## 常见组件样式示例

### 表单元素样式

```css
/* 输入框 */
.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="date"] {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 16px;
  color: var(--text-primary);
  background-color: var(--card-background);
}

/* 选择器 */
.form-select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 16px;
  color: var(--text-primary);
  background-color: var(--card-background);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
}

/* 开关 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: .4s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary-color);
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}
```

### 卡片和容器样式

```css
/* 卡片容器 */
.form-section {
  background-color: var(--card-background);
  border-radius: var(--border-radius);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
}

/* 标题 */
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

/* 表单组 */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
```

### 按钮样式

```css
/* 基础按钮 */
.button {
  padding: 12px 16px;
  border-radius: var(--border-radius);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

/* 主要按钮 */
.button-primary {
  background-color: var(--primary-color);
  color: white;
}

.button-primary:hover {
  background-color: rgba(var(--primary), 0.9);
}

/* 次要按钮 */
.button-secondary {
  background-color: var(--background-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.button-secondary:hover {
  background-color: rgba(var(--background), 0.8);
}
```

## 与设计稿对比技巧

### 使用浏览器开发工具

1. **测量工具**：使用Chrome开发工具中的测量功能比较元素尺寸
2. **颜色提取**：使用颜色选择器提取和比较颜色值
3. **计算样式**：查看计算后的样式，确保CSS变量正确应用

### 创建对比检查表

为每个页面创建对比检查表，确保所有元素都符合设计规范：

| 元素 | 属性 | 设计值 | 实际值 | 状态 |
|------|------|--------|--------|------|
| 按钮 | 背景色 | #3B82F6 | var(--primary-color) | ✅ |
| 按钮 | 圆角 | 8px | var(--border-radius) | ✅ |
| 输入框 | 边框 | #E5E7EB | var(--border-color) | ✅ |

## 性能优化建议

### CSS优化

1. **减少选择器复杂度**：避免过深的选择器嵌套
2. **避免使用`!important`**：合理组织CSS优先级
3. **使用简写属性**：如`margin`代替`margin-top`、`margin-right`等

### 组件优化

1. **懒加载**：对于复杂组件使用懒加载
2. **虚拟列表**：对于长列表使用虚拟列表技术
3. **状态本地化**：将状态尽可能保持在组件内部

### 主题切换优化

1. **预生成主题**：预先生成不同主题的样式，而不是运行时计算
2. **使用CSS变量**：利用CSS变量实现高效的主题切换
3. **避免闪烁**：在主题加载完成前使用占位符或骨架屏
