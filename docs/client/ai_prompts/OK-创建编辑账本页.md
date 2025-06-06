# 创建/编辑账本页面开发提示词

我需要开发当前项目的"创建/编辑账本"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/创建编辑账本页/index.html` 中的元素、布局和风格来实现页面。

## 技术栈要求

- 核心框架: Next.js 14 (App Router)
- 状态管理: Zustand
- UI组件: shadcn/ui + Tailwind CSS
- 表单处理: React Hook Form + Zod验证
- HTTP请求: Axios + React Query
- 工具库:
  - dayjs (日期处理)
  - lucide-react (图标)
  - clsx/tailwind-merge (类名合并)

## 页面功能说明

这是一个移动端创建/编辑账本的页面，具有以下核心功能：

1. 创建新账本
2. 编辑现有账本信息
3. 配置AI服务选项
4. 设置默认账本
5. 表单验证和提交

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"创建账本"或"编辑账本"
- 保存按钮

### 账本基本信息表单：
- 账本名称输入框
- 账本描述输入框（可选）
- 默认账本切换开关

### AI服务配置区域：
- 启用AI服务切换开关
- 服务提供商选择下拉框
  - OpenAI
  - Azure OpenAI
  - 其他可选提供商
- 模型选择下拉框
- API密钥输入框（带密码遮罩）
- 测试连接按钮

### 高级设置折叠面板：
- 自定义提示词设置
- 语言偏好设置
- 其他AI相关配置选项

### 预览卡片：
- 显示设置的账本效果预览
- 账本名称和描述
- AI服务状态标识

## 交互逻辑

实现以下交互功能：

1. 页面初始化：
   - 创建模式：显示空表单
   - 编辑模式：加载现有账本数据并填充表单

2. 表单交互：
   - 输入账本名称（实时验证）
   - 输入账本描述（可选）
   - 切换默认账本状态
   - 切换AI服务启用状态

3. AI服务配置：
   - 启用AI服务后显示配置选项
   - 选择服务提供商后显示对应的模型选项
   - 输入API密钥
   - 点击测试连接验证配置

4. 表单提交：
   - 验证所有必填字段
   - 显示提交中状态
   - 成功后返回账本列表页
   - 失败显示错误信息

## 状态管理

使用Zustand创建一个账本表单状态仓库，包含以下状态：

- 表单数据（名称、描述、默认状态、AI配置）
- 编辑模式标志（新建/编辑）
- 原始账本数据（编辑模式）
- AI服务启用状态
- 测试连接状态
- 表单验证状态
- 提交状态（初始/提交中/成功/失败）

## 数据模型和API集成

创建账本的API端点为POST /api/books，请求体：

```json
{
  "name": "个人账本",
  "description": "日常开支记录",
  "isDefault": true,
  "aiService": {
    "enabled": true,
    "provider": "OpenAI",
    "model": "gpt-4",
    "apiKey": "sk-xxxxx",
    "customPrompt": "你是一个财务助手..."
  }
}
```

更新账本的API端点为PUT /api/books/:id，请求体同上

获取单个账本的API端点为GET /api/books/:id

测试AI服务连接的API端点为POST /api/ai/test-connection，请求体：

```json
{
  "provider": "OpenAI",
  "model": "gpt-4",
  "apiKey": "sk-xxxxx"
}
```

使用React Query处理API请求，包括：
- 使用useQuery获取账本详情（编辑模式）
- 使用useMutation处理创建/更新操作
- 使用useMutation处理AI连接测试

## 页面布局和样式要求

为确保应用程序中所有页面的布局和样式保持一致，请遵循以下要求：

1. **使用统一的页面容器组件**：
   - 在开发新页面时，始终使用 `PageContainer` 组件作为最外层容器
   - 不要在页面中使用自定义的容器结构，如 `<div className="app-container">` 等

2. **PageContainer 组件的正确使用**：
   ```tsx
   import { PageContainer } from "@/components/layout/page-container";

   export default function BookFormPage() {
     // 右侧操作按钮示例
     const rightActions = (
       <button className="icon-button" type="submit" form="book-form">
         <i className="fas fa-save"></i>
       </button>
     );

     return (
       <PageContainer
         title={isEditMode ? "编辑账本" : "创建账本"}
         rightActions={rightActions}
         showBackButton={true}
         activeNavItem="profile" // 因为账本管理通常在个人资料/设置中
       >
         {/* 页面内容 */}
         <BookForm id="book-form" />
         <BookPreview />
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

- `BookFormPage` - 主页面（使用PageContainer）
- `BookForm` - 账本表单组件
  - `NameInput` - 名称输入组件
  - `DescriptionInput` - 描述输入组件
  - `DefaultToggle` - 默认账本切换组件
- `AIServiceConfig` - AI服务配置组件
  - `EnableToggle` - 启用切换组件
  - `ProviderSelect` - 提供商选择组件
  - `ModelSelect` - 模型选择组件
  - `ApiKeyInput` - API密钥输入组件
  - `TestConnectionButton` - 测试连接按钮
- `AdvancedSettings` - 高级设置组件
  - `CustomPromptInput` - 自定义提示词输入
  - `LanguageSelect` - 语言选择组件
- `BookPreview` - 账本预览组件

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 垂直布局
  - 表单元素占满宽度
  - 折叠面板节省空间
- 平板/桌面端：
  - 双列布局（表单和预览）
  - 更宽敞的表单布局
  - 固定位置的预览卡片

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有表单元素有关联的标签
- 错误提示清晰且与输入元素关联
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 表单分组有适当的标题和描述

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用React Hook Form处理表单状态和验证
- 使用Zod定义验证规则：
  - 名称：必填，最大长度30字符
  - 描述：可选，最大长度100字符
  - API密钥：启用AI服务时必填，符合提供商格式
- API密钥的安全处理（不明文显示）
- 表单数据的本地存储（防止意外关闭）
- 编辑模式下不允许修改默认账本状态（如果是唯一账本）

## 附加功能(如时间允许)

- 账本图标/颜色选择
- 账本模板选择
- 高级AI参数配置
- 导入现有账本数据
- 多语言支持设置
