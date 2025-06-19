# 标签系统UI设计预览

## 概述

本文档详细描述了标签系统的前端UI设计，包括页面布局、组件设计、交互流程和移动端适配方案。设计遵循现有系统的视觉风格和交互模式。

## 设计原则

### 1. 一致性
- 与现有页面风格完全一致
- 遵循现有的组件设计规范
- 保持统一的颜色主题和字体

### 2. 易用性
- 简化的操作流程
- 直观的视觉反馈
- 移动端友好的交互

### 3. 性能
- 快速响应的交互
- 优化的加载体验
- 流畅的动画效果

## 页面设计

### 1. 标签管理页面 (/settings/tags)

#### 页面布局
```
┌─────────────────────────────────────┐
│ ← 标签管理                    + 新建 │ ← 顶部导航栏
├─────────────────────────────────────┤
│ 🔍 搜索标签...                      │ ← 搜索栏
├─────────────────────────────────────┤
│ 📊 购物 (15)              🎨 ⚙️ 🗑️ │ ← 标签项
│ 🍔 餐饮 (8)               🎨 ⚙️ 🗑️ │
│ 🚗 交通 (12)              🎨 ⚙️ 🗑️ │
│ 💡 生活 (5)               🎨 ⚙️ 🗑️ │
│ ...                                │
├─────────────────────────────────────┤
│ 显示 1-20 条，共 45 条              │ ← 分页信息
└─────────────────────────────────────┘
```

#### 组件说明
- **顶部导航栏**: 返回按钮 + 页面标题 + 新建按钮
- **搜索栏**: 实时搜索，支持标签名称筛选
- **标签列表**: 显示标签名称、颜色、使用次数和操作按钮
- **操作按钮**: 颜色设置、编辑、删除

#### 标签项设计
```css
.tag-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--card);
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid var(--border);
}

.tag-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 12px;
}

.tag-info {
  flex: 1;
}

.tag-name {
  font-weight: 500;
  color: var(--foreground);
}

.tag-usage {
  font-size: 14px;
  color: var(--muted-foreground);
}

.tag-actions {
  display: flex;
  gap: 8px;
}
```

### 2. 标签编辑模态框

#### 模态框布局
```
┌─────────────────────────────────────┐
│ 编辑标签                      ✕ 关闭 │ ← 模态框头部
├─────────────────────────────────────┤
│ 标签名称                            │
│ ┌─────────────────────────────────┐ │
│ │ 购物                            │ │ ← 名称输入框
│ └─────────────────────────────────┘ │
│                                     │
│ 标签颜色                            │
│ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🎨 自定义    │ ← 颜色选择器
│                                     │
│ 描述 (可选)                         │
│ ┌─────────────────────────────────┐ │
│ │ 日常购物相关的支出记录          │ │ ← 描述输入框
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│              取消    保存           │ ← 操作按钮
└─────────────────────────────────────┘
```

#### 颜色选择器设计
- 预设颜色：8个常用颜色
- 自定义颜色：颜色选择器
- 实时预览：显示标签效果

### 3. 标签选择器组件

#### 下拉选择器布局
```
┌─────────────────────────────────────┐
│ 选择标签 ▼                          │ ← 触发按钮
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 🔍 搜索标签...                      │ ← 搜索框
├─────────────────────────────────────┤
│ ☑️ 📊 购物                          │ ← 已选标签
│ ☑️ 🍔 餐饮                          │
├─────────────────────────────────────┤
│ ☐ 🚗 交通                           │ ← 未选标签
│ ☐ 💡 生活                           │
│ ☐ 🎮 娱乐                           │
├─────────────────────────────────────┤
│ + 创建新标签 "日用品"               │ ← 快速创建
└─────────────────────────────────────┘
```

#### 移动端适配
- 底部弹出式选择器
- 大按钮设计，便于触摸
- 支持滑动操作

### 4. 标签显示组件

#### 标签徽章设计
```css
.tag-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin: 2px;
  background: var(--tag-color);
  color: var(--tag-text-color);
}

.tag-badge-small {
  padding: 2px 6px;
  font-size: 11px;
}

.tag-badge-large {
  padding: 6px 12px;
  font-size: 14px;
}
```

#### 使用场景
- **交易列表**: 小尺寸标签，最多显示3个
- **交易详情**: 中等尺寸标签，显示所有标签
- **统计图表**: 大尺寸标签，用于图例

### 5. 统计分析页面增强

#### 标签筛选器
```
┌─────────────────────────────────────┐
│ 📊 统计分析                         │ ← 页面标题
├─────────────────────────────────────┤
│ 标签筛选: [购物 ✕] [餐饮 ✕] + 添加  │ ← 标签筛选器
├─────────────────────────────────────┤
│ 时间范围: 2024年1月 - 2024年12月    │ ← 时间筛选
├─────────────────────────────────────┤
│ [图表区域]                          │ ← 统计图表
│                                     │
│ 📊 按分类统计                       │
│ 📈 收支趋势                         │
│ 🏷️ 按标签分析 ← 新增               │
└─────────────────────────────────────┘
```

#### 按标签分析页面
```
┌─────────────────────────────────────┐
│ ← 按标签分析                        │ ← 页面标题
├─────────────────────────────────────┤
│ 📊 购物: ¥2,580 (32%)              │ ← 标签统计卡片
│ 🍔 餐饮: ¥1,920 (24%)              │
│ 🚗 交通: ¥1,440 (18%)              │
│ 💡 生活: ¥1,200 (15%)              │
│ 其他: ¥860 (11%)                   │
├─────────────────────────────────────┤
│ [饼图/柱状图]                       │ ← 可视化图表
├─────────────────────────────────────┤
│ 标签组合分析                        │
│ 购物 + 生活: ¥480 (6%)             │ ← 标签组合统计
│ 餐饮 + 娱乐: ¥320 (4%)             │
└─────────────────────────────────────┘
```

## 组件设计规范

### 1. TagManager 组件

```typescript
interface TagManagerProps {
  accountBookId: string;
  onTagCreate?: (tag: Tag) => void;
  onTagUpdate?: (tag: Tag) => void;
  onTagDelete?: (tagId: string) => void;
}

const TagManager: React.FC<TagManagerProps> = ({
  accountBookId,
  onTagCreate,
  onTagUpdate,
  onTagDelete
}) => {
  // 组件实现
};
```

### 2. TagSelector 组件

```typescript
interface TagSelectorProps {
  accountBookId: string;
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  placeholder?: string;
  maxSelection?: number;
  allowCreate?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const TagSelector: React.FC<TagSelectorProps> = ({
  accountBookId,
  selectedTagIds,
  onSelectionChange,
  placeholder = "选择标签",
  maxSelection,
  allowCreate = true,
  size = 'medium'
}) => {
  // 组件实现
};
```

### 3. TagDisplay 组件

```typescript
interface TagDisplayProps {
  tags: Tag[];
  size?: 'small' | 'medium' | 'large';
  maxDisplay?: number;
  onClick?: (tag: Tag) => void;
  onRemove?: (tag: Tag) => void;
  showRemove?: boolean;
}

const TagDisplay: React.FC<TagDisplayProps> = ({
  tags,
  size = 'medium',
  maxDisplay = 3,
  onClick,
  onRemove,
  showRemove = false
}) => {
  // 组件实现
};
```

### 4. ColorPicker 组件

```typescript
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
  allowCustom?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  presetColors = DEFAULT_COLORS,
  allowCustom = true
}) => {
  // 组件实现
};
```

## 交互流程

### 1. 创建标签流程
1. 点击"新建"按钮
2. 弹出标签编辑模态框
3. 输入标签名称（必填）
4. 选择标签颜色（可选，有默认值）
5. 输入描述（可选）
6. 点击"保存"按钮
7. 验证数据并提交
8. 显示成功提示，关闭模态框

### 2. 为交易添加标签流程
1. 在交易详情页面点击"添加标签"
2. 弹出标签选择器
3. 搜索或浏览标签列表
4. 选择一个或多个标签
5. 可选：快速创建新标签
6. 确认选择
7. 更新交易记录，显示标签

### 3. 批量操作流程
1. 在交易列表页面进入多选模式
2. 选择多条交易记录
3. 点击"批量操作"按钮
4. 选择"添加标签"或"移除标签"
5. 选择要操作的标签
6. 确认操作
7. 显示操作结果

## 响应式设计

### 1. 桌面端 (≥768px)
- 侧边栏布局
- 悬停效果
- 右键菜单
- 拖拽排序

### 2. 平板端 (768px-1024px)
- 适中的按钮尺寸
- 触摸友好的间距
- 简化的操作菜单

### 3. 移动端 (<768px)
- 全屏模态框
- 底部弹出选择器
- 大按钮设计
- 滑动手势支持

## 主题适配

### 1. 浅色主题
```css
:root {
  --tag-background: #f3f4f6;
  --tag-border: #e5e7eb;
  --tag-text: #374151;
  --tag-hover: #e5e7eb;
}
```

### 2. 深色主题
```css
:root[data-theme="dark"] {
  --tag-background: #374151;
  --tag-border: #4b5563;
  --tag-text: #f9fafb;
  --tag-hover: #4b5563;
}
```

## 动画效果

### 1. 标签添加动画
```css
@keyframes tagAppear {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.tag-appear {
  animation: tagAppear 0.2s ease-out;
}
```

### 2. 标签移除动画
```css
@keyframes tagDisappear {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}

.tag-disappear {
  animation: tagDisappear 0.2s ease-in;
}
```

## 可访问性

### 1. 键盘导航
- Tab键导航支持
- Enter键确认操作
- Escape键取消操作

### 2. 屏幕阅读器
- 适当的ARIA标签
- 语义化的HTML结构
- 描述性的文本

### 3. 颜色对比
- 确保足够的颜色对比度
- 不仅依赖颜色传达信息
- 支持高对比度模式

---

**文档版本**: v1.0
**创建时间**: 2024年
**设计团队**: zhiweijz-team
