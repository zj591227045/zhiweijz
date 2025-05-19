# 只为记账 - 前端样式指南

本文档定义了"只为记账"项目的前端样式规范，旨在确保UI组件的一致性、可维护性和可扩展性。所有开发人员在开发过程中应遵循本指南。

## 目录

1. [CSS变量命名规范](#css变量命名规范)
2. [组件样式规则](#组件样式规则)
3. [组件封装指南](#组件封装指南)
4. [样式检查工具](#样式检查工具)
5. [主题系统](#主题系统)
6. [组件预览系统](#组件预览系统)
7. [CSS变量映射](#css变量映射)
8. [常见问题与解决方案](#常见问题与解决方案)

## CSS变量命名规范

### 基本原则

- 使用kebab-case（短横线）命名法
- 变量名应具有描述性，清晰表达其用途
- 相关变量应使用相同的前缀

### 颜色变量

我们使用两套颜色变量系统：

1. **旧版变量**（直接使用RGB值）：
   ```css
   --primary-color: #3B82F6;
   --background-color: #F9FAFB;
   --text-primary: #1F2937;
   ```

2. **新版变量**（使用RGB通道值）：
   ```css
   --primary: 59, 130, 246;
   --background: 249, 250, 251;
   --foreground: 31, 41, 55;
   ```

**重要**：为确保兼容性，我们在`:root`中同时定义了两套变量，并建立了映射关系：

```css
:root {
  /* 新版变量 */
  --primary: 59, 130, 246;
  --background: 249, 250, 251;
  
  /* 旧版变量（映射） */
  --primary-color: rgb(var(--primary));
  --background-color: rgb(var(--background));
}
```

### 使用规则

- **组件开发**：优先使用旧版变量（`--primary-color`），确保与示例页面保持一致
- **新组件**：可以使用新版变量（`--primary`），但需确保在组件文档中明确说明
- **第三方组件封装**：必须使用旧版变量，确保与现有组件风格一致

### 尺寸变量

```css
--radius: 0.5rem;        /* 圆角半径 */
--spacing: 16px;         /* 基础间距 */
--header-height: 56px;   /* 头部高度 */
--bottom-nav-height: 56px; /* 底部导航高度 */
```

## 组件样式规则

### 布局规则

- 所有页面必须使用`PageContainer`作为最外层容器
- 内容区域使用`main-content`类，确保正确的内边距和滚动行为
- 表单元素使用`form-group`类进行分组
- 卡片元素使用`form-section`类，确保一致的边距、圆角和阴影

### 响应式设计

- 移动优先设计，基础样式针对移动设备
- 使用Tailwind的断点进行响应式调整：
  ```css
  @media (min-width: 640px) { /* sm */ }
  @media (min-width: 768px) { /* md */ }
  @media (min-width: 1024px) { /* lg */ }
  ```

### 组件状态

- 使用具有描述性的类名表示组件状态：`.active`, `.disabled`, `.loading`等
- 交互状态（如hover）使用CSS伪类定义
- 动态状态变化使用CSS过渡效果，确保平滑的用户体验

## 组件封装指南

### 封装原则

1. **保持简单**：只封装必要的功能，避免过度抽象
2. **保持一致**：确保封装后的组件与设计规范一致
3. **文档完善**：提供清晰的使用说明和示例

### shadcn/ui组件封装

对于shadcn/ui组件，我们需要特别注意以下几点：

1. **样式覆盖**：创建专门的样式文件，覆盖shadcn/ui的默认样式
2. **属性透传**：确保所有必要的属性都能正确传递给原始组件
3. **状态管理**：处理好组件的各种状态，如加载、错误、禁用等

### 示例：开关组件封装

```tsx
// components/ui/toggle-switch.tsx
'use client';

import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ id, checked, onChange }: ToggleSwitchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleChange}
      />
      <span className="toggle-slider"></span>
    </label>
  );
}
```

## 样式检查工具

我们使用stylelint来确保样式代码的一致性。

### 安装

```bash
npm install --save-dev stylelint stylelint-config-standard
```

### 配置

在项目根目录创建`.stylelintrc.json`文件：

```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "color-named": "never",
    "font-family-name-quotes": "always-where-required",
    "selector-class-pattern": null,
    "no-descending-specificity": null
  }
}
```

### 使用

```bash
npx stylelint "**/*.css"
```

## 主题系统

### 主题定义

我们的主题系统基于CSS变量，支持亮色/暗色模式和多种主题色：

```css
/* 亮色主题（默认） */
:root {
  --background: 249, 250, 251;
  --foreground: 31, 41, 55;
  /* 其他变量... */
}

/* 暗色主题 */
[data-theme="dark"] {
  --background: 17, 24, 39;
  --foreground: 243, 244, 246;
  /* 其他变量... */
}

/* 主题色 - 蓝色（默认） */
:root, [data-theme-color="blue"] {
  --primary: 59, 130, 246;
}

/* 主题色 - 绿色 */
[data-theme-color="green"] {
  --primary: 16, 185, 129;
}

/* 主题色 - 紫色 */
[data-theme-color="purple"] {
  --primary: 139, 92, 246;
}
```

### 主题切换

使用`ThemeProvider`和`useTheme`钩子管理主题：

```tsx
// 切换暗色/亮色模式
const { theme, setTheme } = useTheme();
setTheme(theme === 'light' ? 'dark' : 'light');

// 切换主题色
const { themeColor, setThemeColor } = useTheme();
setThemeColor('green');
```

## 组件预览系统

我们使用Storybook作为组件预览系统，方便开发人员查看组件在不同状态下的样式。

### 安装

```bash
npx storybook init
```

### 组件故事编写

```tsx
// Button.stories.tsx
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
};

export const Primary = {
  args: {
    variant: 'primary',
    children: '主要按钮',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: '次要按钮',
  },
};
```

### 运行Storybook

```bash
npm run storybook
```

## CSS变量映射

为了解决不同命名规范之间的冲突，我们创建了一个CSS变量映射层：

```css
:root {
  /* 新版变量（shadcn/ui使用） */
  --primary: 59, 130, 246;
  --background: 249, 250, 251;
  --foreground: 31, 41, 55;
  --card: 255, 255, 255;
  --card-foreground: 31, 41, 55;
  --border: 229, 231, 235;
  --radius: 0.5rem;
  
  /* 旧版变量（示例页面使用） */
  --primary-color: rgb(var(--primary));
  --background-color: rgb(var(--background));
  --text-primary: rgb(var(--foreground));
  --card-background: rgb(var(--card));
  --text-secondary: rgb(var(--muted-foreground));
  --border-color: rgb(var(--border));
  --border-radius: var(--radius);
}
```

## 常见问题与解决方案

### 样式不生效

**问题**：组件样式没有正确应用，特别是图标、线条、阴影效果没有生效。

**解决方案**：
1. 检查CSS变量命名是否一致（示例页面vs实际代码）
2. 确保使用正确的CSS变量（`--primary-color` vs `--primary`）
3. 检查组件嵌套结构是否与示例页面一致
4. 确保Font Awesome图标正确引入和使用

### 主题切换问题

**问题**：切换主题后，某些组件样式没有正确更新。

**解决方案**：
1. 确保所有样式都使用CSS变量，避免硬编码颜色值
2. 检查主题变量是否完整定义
3. 使用浏览器开发工具检查计算后的样式

### 组件库样式冲突

**问题**：shadcn/ui组件的默认样式与项目需求不符。

**解决方案**：
1. 创建自定义组件替代组件库组件
2. 使用更高优先级的选择器覆盖默认样式
3. 使用`!important`（谨慎使用）强制应用样式
