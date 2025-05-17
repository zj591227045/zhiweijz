# 账本列表页面开发提示词

我需要开发当前项目的"账本列表"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/账本列表页/index.html` 中的元素、布局和风格来实现页面。

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

这是一个移动端账本管理页面，具有以下核心功能：

1. 显示用户的所有账本列表
2. 标识当前激活的账本
3. 切换当前使用的账本
4. 添加新账本功能
5. 账本基本信息展示

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"我的账本"
- 添加账本按钮

### 账本列表：
- 账本卡片列表，每个卡片显示：
  - 账本名称
  - 账本描述（如有）
  - 创建日期
  - 账本统计摘要（交易数、总额等）
  - 当前账本标识（如适用）
  - AI服务绑定状态（如已配置）
- 卡片点击进入账本详情
- 卡片长按显示操作菜单

### 当前账本标识：
- 视觉突出显示当前激活的账本
- "当前使用"标签
- 切换按钮（如果不是当前账本）

### 添加账本按钮：
- 固定在底部或右下角
- 点击跳转到添加账本页面

### 空状态提示：
- 当没有账本时显示引导提示
- 创建第一个账本的按钮

## 交互逻辑

实现以下交互功能：

1. 账本列表加载：
   - 获取用户的所有账本
   - 标识当前激活的账本
   - 显示加载状态（骨架屏）

2. 账本切换：
   - 点击非当前账本的"设为当前"按钮
   - 确认切换操作
   - 更新当前账本状态
   - 显示切换成功反馈

3. 账本操作：
   - 点击账本卡片进入详情页
   - 长按显示操作菜单（编辑、删除、设为默认）
   - 确认后执行相应操作

4. 添加账本：
   - 点击添加按钮跳转到创建账本页面

## 状态管理

使用Zustand创建一个账本管理状态仓库，包含以下状态：

- 账本列表数据
- 当前激活的账本ID
- 加载状态（初始加载、刷新）
- 操作状态（切换中、删除中）
- 确认对话框状态

## 数据模型和API集成

获取账本列表的API端点为GET /api/books，响应数据结构：

```json
{
  "books": [
    {
      "id": "uuid",
      "name": "个人账本",
      "description": "日常开支记录",
      "isDefault": true,
      "isActive": true,
      "createdAt": "2023-01-15T10:30:00Z",
      "transactionCount": 120,
      "totalExpense": 5000,
      "totalIncome": 8000,
      "hasAIService": true,
      "aiServiceProvider": "OpenAI"
    }
  ],
  "activeBookId": "uuid"
}
```

切换当前账本的API端点为PUT /api/books/active，请求体：

```json
{
  "bookId": "uuid"
}
```

删除账本的API端点为DELETE /api/books/:id

使用React Query处理API请求，包括：
- 使用useQuery获取账本列表
- 使用useMutation处理账本切换
- 使用useMutation处理账本删除

## 页面布局和样式要求

为确保应用程序中所有页面的布局和样式保持一致，请遵循以下要求：

1. **使用统一的页面容器组件**：
   - 在开发新页面时，始终使用 `PageContainer` 组件作为最外层容器
   - 不要在页面中使用自定义的容器结构，如 `<div className="app-container">` 等

2. **PageContainer 组件的正确使用**：
   ```tsx
   import { PageContainer } from "@/components/layout/page-container";

   export default function BookListPage() {
     // 右侧操作按钮示例
     const rightActions = (
       <button className="icon-button" onClick={handleAddBook}>
         <i className="fas fa-plus"></i>
       </button>
     );

     return (
       <PageContainer
         title="账本列表"
         rightActions={rightActions}
         activeNavItem="profile" // 因为账本管理通常在个人资料/设置中
       >
         {/* 页面内容 */}
         <BookList />
         {showEmptyState && <EmptyState />}
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

- `BookListPage` - 主页面（使用PageContainer）
- `BookList` - 账本列表组件
  - `BookCard` - 账本卡片组件
  - `ActiveBookBadge` - 当前账本标识组件
  - `BookStatsSummary` - 账本统计摘要组件
  - `AIServiceBadge` - AI服务标识组件
- `BookActions` - 账本操作菜单组件
- `AddBookButton` - 添加账本按钮
- `SwitchBookConfirmDialog` - 切换账本确认对话框
- `DeleteBookConfirmDialog` - 删除账本确认对话框
- `EmptyState` - 空状态提示组件

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 单列账本卡片
  - 紧凑的信息展示
  - 底部固定的添加按钮
- 平板/桌面端：
  - 多列网格布局
  - 更详细的账本信息
  - 右侧固定的添加按钮

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 操作确认机制清晰

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 优化数据加载体验（骨架屏、加载指示器）
- 账本切换的状态同步
- 默认账本标识
- 账本数据的本地缓存
- 防止误删的确认机制（默认账本不可删除）


