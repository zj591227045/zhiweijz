# 主题编辑器页面开发提示词

我需要开发当前项目的"主题编辑器"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/主题编辑器页/index.html` 中的元素、布局和风格来实现页面。

## 技术栈要求

- 核心框架: Next.js 14 (App Router)
- 状态管理: Zustand
- UI组件: shadcn/ui + Tailwind CSS
- 表单处理: React Hook Form + Zod验证
- HTTP请求: Axios + React Query
- 工具库:
  - lucide-react (图标)
  - clsx/tailwind-merge (类名合并)
  - react-colorful (颜色选择器)

## 页面功能说明

这是一个移动端主题编辑器页面，具有以下核心功能：

1. 创建新主题或编辑现有主题
2. 自定义主题颜色变量
3. 实时预览主题效果
4. 保存和应用主题
5. 主题继承功能

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"主题编辑器"
- 保存按钮

### 主题基本信息：
- 主题名称输入框
- 基于现有主题选择器（可选）
- 主题描述输入框（可选）

### 颜色编辑区域：
- 颜色变量分组，每组包含：
  - 组标题（如"主要颜色"、"背景颜色"等）
  - 颜色变量列表，每个变量显示：
    - 变量名称
    - 当前颜色预览
    - 颜色值输入/选择器
- 颜色选择器弹出组件：
  - 颜色选择面板
  - 透明度滑块（如适用）
  - 颜色值输入框（HEX/RGB/HSL）
  - 预设颜色选项

### 实时预览区域：
- 预览标签页切换：
  - 组件预览
  - 页面预览
- 组件预览显示：
  - 按钮（主要、次要、危险等）
  - 卡片
  - 表单元素
  - 文本样式
- 页面预览显示：
  - 简化的应用页面预览
  - 暗色/亮色模式切换

### 底部操作区：
- 重置按钮
- 保存按钮
- 保存并应用按钮

## 交互逻辑

实现以下交互功能：

1. 页面初始化：
   - 创建模式：显示默认主题模板
   - 编辑模式：加载现有主题数据
   - 初始化预览组件

2. 主题信息编辑：
   - 输入主题名称
   - 选择基础主题（继承其设置）
   - 输入主题描述

3. 颜色编辑：
   - 点击颜色变量显示颜色选择器
   - 选择或输入新颜色值
   - 实时更新预览效果
   - 支持复制/粘贴颜色值

4. 预览交互：
   - 切换不同预览标签页
   - 切换暗色/亮色模式预览
   - 预览组件交互（如点击按钮）

5. 保存操作：
   - 点击保存按钮保存主题
   - 点击保存并应用按钮保存并立即应用主题
   - 显示保存结果反馈
   - 成功后返回主题设置页

## 状态管理

使用Zustand创建一个主题编辑器状态仓库，包含以下状态：

- 编辑模式标志（新建/编辑）
- 原始主题数据（编辑模式）
- 当前编辑的主题数据
- 基础主题列表
- 当前预览模式（组件/页面）
- 当前预览的暗色/亮色模式
- 当前选中的颜色变量
- 颜色选择器状态
- 未保存更改标志
- 保存状态（初始/保存中/成功/失败）
- 错误信息

## 数据模型和API集成

获取主题详情的API端点为GET /api/themes/:themeId，响应数据结构：

```json
{
  "id": "theme_uuid",
  "name": "我的主题",
  "description": "我的自定义主题",
  "baseTheme": "light",
  "colors": {
    "primary": {
      "default": "#3B82F6",
      "hover": "#2563EB",
      "active": "#1D4ED8"
    },
    "background": {
      "default": "#FFFFFF",
      "card": "#F9FAFB",
      "input": "#F3F4F6"
    },
    "text": {
      "primary": "#111827",
      "secondary": "#4B5563",
      "muted": "#9CA3AF"
    },
    "border": "#E5E7EB",
    "error": "#EF4444",
    "success": "#10B981",
    "warning": "#F59E0B"
  },
  "createdAt": "2023-05-15T10:30:00Z",
  "updatedAt": "2023-05-16T14:20:00Z"
}
```

获取基础主题列表的API端点为GET /api/themes/base

创建主题的API端点为POST /api/themes，请求体：

```json
{
  "name": "我的主题",
  "description": "我的自定义主题",
  "baseTheme": "light",
  "colors": {
    "primary": {
      "default": "#3B82F6",
      "hover": "#2563EB",
      "active": "#1D4ED8"
    },
    "background": {
      "default": "#FFFFFF",
      "card": "#F9FAFB",
      "input": "#F3F4F6"
    },
    "text": {
      "primary": "#111827",
      "secondary": "#4B5563",
      "muted": "#9CA3AF"
    },
    "border": "#E5E7EB",
    "error": "#EF4444",
    "success": "#10B981",
    "warning": "#F59E0B"
  }
}
```

更新主题的API端点为PUT /api/themes/:themeId，请求体同上

应用主题的API端点为PUT /api/themes/settings，请求体：

```json
{
  "themeId": "theme_uuid"
}
```

使用React Query处理API请求，包括：
- 使用useQuery获取主题详情（编辑模式）
- 使用useQuery获取基础主题列表
- 使用useMutation处理主题创建/更新
- 使用useMutation处理主题应用

## 组件结构

设计以下组件结构：

- `ThemeEditorPage` - 主页面容器
- `ThemeInfoForm` - 主题信息表单
  - `ThemeNameInput` - 主题名称输入组件
  - `BaseThemeSelect` - 基础主题选择组件
  - `ThemeDescriptionInput` - 主题描述输入组件
- `ColorPalette` - 颜色面板组件
  - `ColorGroup` - 颜色分组组件
  - `ColorVariable` - 颜色变量组件
  - `ColorPicker` - 颜色选择器组件
  - `ColorInput` - 颜色值输入组件
  - `PresetColors` - 预设颜色组件
- `LivePreview` - 实时预览组件
  - `PreviewTabs` - 预览标签页组件
  - `ComponentPreview` - 组件预览组件
  - `PagePreview` - 页面预览组件
  - `ThemeModeToggle` - 主题模式切换组件
- `ActionButtons` - 操作按钮组
  - `ResetButton` - 重置按钮
  - `SaveButton` - 保存按钮
  - `SaveApplyButton` - 保存并应用按钮
- `UnsavedChangesDialog` - 未保存更改对话框
- `FeedbackMessage` - 操作反馈消息

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 垂直布局，信息分块展示
  - 颜色编辑和预览区域分页显示
  - 颜色选择器弹出模态框
- 平板/桌面端：
  - 多列布局
  - 左侧编辑区域，右侧预览区域
  - 颜色选择器内联显示
  - 更大的预览区域

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有表单元素有关联的标签
- 颜色选择支持键盘操作
- 颜色对比度检查工具
- 支持键盘导航
- 颜色值有文本替代说明

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用React Hook Form处理表单状态和验证
- 使用Zod定义验证规则：
  - 主题名称：必填，最大长度30字符
  - 描述：可选，最大长度100字符
  - 颜色值：有效的颜色格式（HEX/RGB/HSL）
- 实现颜色变量分组展示
- 对比度检查工具（确保文本可读性）
- 主题继承机制（基于现有主题创建）
- 未保存更改提示
- 主题数据的本地存储（防止意外关闭）

## 附加功能(如时间允许)

- 颜色方案生成器（基于主色自动生成配色方案）
- 主题导入/导出功能
- 主题历史版本
- 主题预览设备选择（手机/平板/桌面）
- 主题分享功能
