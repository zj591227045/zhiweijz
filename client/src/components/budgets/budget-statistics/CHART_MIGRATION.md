# 图表组件迁移指南

## 新图表组件说明
我们已创建现代化的`budget-trend-chart-recharts.tsx`组件，基于Recharts库实现，具有以下优势：
- 完美支持暗色模式
- 响应式设计
- 更美观的视觉效果
- 更好的可维护性

## 使用说明

### 1. 基本使用
```tsx
import BudgetTrendChart from './budget-trend-chart-recharts';

// 数据格式
const data = [
  { date: '2023-01', amount: 5000 },
  { date: '2023-02', amount: 8000 },
  // ...
];

<BudgetTrendChart data={data} />
```

### 2. 主题变量要求
确保以下CSS变量已定义：
```css
:root {
  --primary-color: #4f46e5; /* 主色 */
  --text-primary: #1f2937;  /* 主文本色 */
  --text-secondary: #6b7280; /* 副文本色 */
  --border-color: #e5e7eb;  /* 边框色 */
  --background-secondary: #ffffff; /* 次要背景色 */
}

.dark {
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --border-color: #4b5563;
  --background-secondary: #1f2937;
}
```

### 3. 迁移步骤
1. 在父组件中替换导入语句
2. 确保数据格式匹配
3. 验证主题变量是否正确定义

## 样式定制
可通过修改CSS变量或直接传递props来定制图表样式。