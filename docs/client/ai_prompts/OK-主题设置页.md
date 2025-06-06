# 主题设置页面开发提示词

我需要开发当前项目的"主题设置"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/主题设置页/index.html` 中的元素、布局和风格来实现页面。

## 技术栈要求

- 核心框架: Next.js 14 (App Router)
- 状态管理: Zustand
- UI组件: shadcn/ui + Tailwind CSS
- 表单处理: React Hook Form + Zod验证
- HTTP请求: Axios + React Query
- 工具库:
  - lucide-react (图标)
  - clsx/tailwind-merge (类名合并)

## 页面功能说明

这是一个移动端主题设置页面，具有以下核心功能：

1. 内置主题选择
2. 自定义主题列表
3. 主题预览功能
4. 主题编辑器入口
5. 主题导入/导出功能

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"主题设置"
- 操作菜单（导入/导出）

### 当前主题预览卡片：
- 当前主题名称
- 主题预览区域（显示UI元素样例）
- "编辑"按钮（如果是自定义主题）

### 内置主题选择区域：
- 标题"内置主题"
- 主题选项网格/列表：
  - 每个主题显示缩略预览
  - 主题名称
  - 选中状态指示
  - 点击选择主题

### 自定义主题列表：
- 标题"我的主题"
- 自定义主题列表：
  - 每个主题显示缩略预览
  - 主题名称
  - 创建/修改日期
  - 操作按钮（选择、编辑、删除）
- "创建新主题"按钮

### 主题操作按钮：
- 创建新主题按钮
- 导入主题按钮
- 导出当前主题按钮

### 主题导入对话框：
- 文件选择器
- 拖放区域
- 导入按钮

### 主题删除确认对话框：
- 警告文本
- 确认/取消按钮

## 交互逻辑

实现以下交互功能：

1. 页面加载：
   - 获取当前主题设置
   - 获取内置主题列表
   - 获取用户自定义主题列表
   - 显示加载状态（骨架屏）

2. 主题选择：
   - 点击主题选项切换到该主题
   - 实时预览主题效果
   - 保存主题选择
   - 显示切换成功反馈

3. 自定义主题操作：
   - 点击"创建新主题"跳转到主题编辑器
   - 点击"编辑"按钮编辑现有主题
   - 点击"删除"按钮显示确认对话框
   - 确认后删除主题并刷新列表

4. 主题导入/导出：
   - 点击"导入"按钮显示导入对话框
   - 选择或拖放主题文件
   - 验证主题文件格式
   - 导入成功后添加到自定义主题列表
   - 点击"导出"按钮下载当前主题配置

## 状态管理

使用Zustand创建一个主题设置状态仓库，包含以下状态：

- 当前主题数据
- 内置主题列表
- 自定义主题列表
- 预览主题数据
- 导入/导出状态
- 操作状态（切换中、删除中）
- 确认对话框状态
- 错误信息

## 数据模型和API集成

获取主题设置的API端点为GET /api/themes/settings，响应数据结构：

```json
{
  "currentTheme": "dark",
  "isCustomTheme": false
}
```

获取主题列表的API端点为GET /api/themes，响应数据结构：

```json
{
  "builtIn": [
    {
      "id": "light",
      "name": "默认亮色",
      "thumbnail": "https://example.com/themes/light.png",
      "isSystem": true
    },
    {
      "id": "dark",
      "name": "默认暗色",
      "thumbnail": "https://example.com/themes/dark.png",
      "isSystem": true
    }
  ],
  "custom": [
    {
      "id": "custom_uuid",
      "name": "我的主题",
      "thumbnail": "https://example.com/themes/custom.png",
      "createdAt": "2023-05-15T10:30:00Z",
      "updatedAt": "2023-05-16T14:20:00Z"
    }
  ]
}
```

切换主题的API端点为PUT /api/themes/settings，请求体：

```json
{
  "themeId": "dark"
}
```

删除自定义主题的API端点为DELETE /api/themes/:themeId

导出主题的API端点为GET /api/themes/:themeId/export

导入主题的API端点为POST /api/themes/import，使用FormData格式：

```
FormData:
- themeFile: (文件)
```

使用React Query处理API请求，包括：
- 使用useQuery获取主题设置
- 使用useQuery获取主题列表
- 使用useMutation处理主题切换
- 使用useMutation处理主题删除
- 使用useMutation处理主题导入

## 页面布局和样式要求

为确保应用程序中所有页面的布局和样式保持一致，请遵循以下要求：

1. **使用统一的页面容器组件**：
   - 在开发新页面时，始终使用 `PageContainer` 组件作为最外层容器
   - 不要在页面中使用自定义的容器结构，如 `<div className="app-container">` 等

2. **PageContainer 组件的正确使用**：
   ```tsx
   import { PageContainer } from "@/components/layout/page-container";

   export default function ThemeSettingsPage() {
     // 右侧操作按钮示例
     const rightActions = (
       <button className="icon-button">
         <i className="fas fa-ellipsis-v"></i>
       </button>
     );

     return (
       <PageContainer
         title="主题设置"
         rightActions={rightActions}
         showBackButton={true}
         activeNavItem="profile" // 因为主题设置通常在个人资料/设置中
       >
         {/* 页面内容 */}
         <CurrentThemePreview />
         <BuiltInThemes />
         <CustomThemes />
       </PageContainer>
     );
   }
   ```

3. **参考文档**：
   - 详细了解 PageContainer 组件的使用方法，请参考 `docs/page_layout_guidelines.md` 文档
   - 该文档包含了组件的所有属性、使用示例和最佳实践

4. **移动端优先**：
   - 所有页面应保持移动端的固定宽度（最大宽度480px）
   - 即使在宽屏上也不应扩展到整个屏幕宽度
   - PageContainer 组件已经实现了这一限制，请不要覆盖这些样式

5. **代码审查检查点**：
   - 确保页面使用了 PageContainer 组件作为最外层容器
   - 确保没有使用自定义的容器结构覆盖全局样式
   - 确保为页面指定了正确的 activeNavItem
   - 确保页面内容结构符合移动端优先的设计原则

## 组件结构

设计以下组件结构：

- `ThemeSettingsPage` - 主页面（使用PageContainer）
- `CurrentThemePreview` - 当前主题预览组件
  - `ThemePreviewCard` - 主题预览卡片
  - `EditButton` - 编辑按钮
- `BuiltInThemes` - 内置主题组件
  - `ThemeGrid` - 主题网格组件
  - `ThemeOption` - 主题选项组件
- `CustomThemes` - 自定义主题组件
  - `CustomThemeList` - 自定义主题列表
  - `CustomThemeItem` - 自定义主题项
  - `ThemeActions` - 主题操作按钮组
- `CreateThemeButton` - 创建主题按钮
- `ThemeImportExport` - 导入导出组件
  - `ImportButton` - 导入按钮
  - `ExportButton` - 导出按钮
- `ImportDialog` - 导入对话框
  - `FileUploader` - 文件上传组件
  - `DropZone` - 拖放区域组件
- `DeleteConfirmDialog` - 删除确认对话框
- `FeedbackMessage` - 操作反馈消息

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 垂直布局，信息分块展示
  - 主题选项单列或双列网格
  - 紧凑的预览卡片
- 平板/桌面端：
  - 多列布局
  - 主题选项多列网格
  - 更大的预览卡片
  - 并排显示内置和自定义主题

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 操作确认机制清晰
- 主题预览有文本描述

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 实现主题实时预览功能
- 主题配置的JSON导入/导出
- 主题配置验证
- 自定义主题的本地存储
- 主题切换的平滑过渡效果
- 主题缩略图生成

## 附加功能(如时间允许)

- 主题搜索/筛选功能
- 主题分享功能
- 主题评分系统
- 主题应用到特定页面（而非全局）
- 主题定时切换（日出/日落自动切换）
