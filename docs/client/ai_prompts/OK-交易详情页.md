# 交易详情页面开发提示词

我需要开发当前项目的"交易详情"页面，使用Next.js 14框架和现代React技术栈实现。

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

这是一个移动端交易详情页面，具有以下核心功能：

1. 显示交易的完整详细信息
2. 提供编辑和删除操作
3. 显示相关的预算信息（如适用）
4. 支持添加/编辑备注

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"交易详情"
- 操作菜单（编辑、删除）

### 交易基本信息卡片：
- 交易金额（大字体显示）
- 交易类型标签（支出/收入）
- 分类图标和名称
- 交易描述

### 详细信息列表：
- 日期和时间
- 账本信息
- 成员信息（如适用）
- 备注信息（可展开/收起）
- 创建和修改时间

### 相关预算信息（如适用）：
- 关联的预算名称
- 预算执行进度
- 预算剩余金额

### 底部操作区：
- 编辑按钮
- 删除按钮（需确认）

## 交互逻辑

实现以下交互功能：

1. 页面加载：
   - 根据URL参数获取交易ID
   - 加载交易详情数据
   - 显示加载状态（骨架屏）

2. 编辑操作：
   - 点击编辑按钮跳转到编辑页面
   - 编辑完成后返回并刷新详情

3. 删除操作：
   - 点击删除按钮显示确认对话框
   - 确认后执行删除并返回列表页
   - 显示操作结果反馈

4. 备注编辑：
   - 点击备注区域可直接编辑
   - 支持保存和取消操作

## 状态管理

使用Zustand创建一个交易详情状态仓库，包含以下状态：

- 交易详情数据
- 加载状态（初始加载、编辑中、删除中）
- 操作结果状态（成功/失败）
- 确认对话框状态（显示/隐藏）

## 数据模型和API集成

获取交易详情的API端点为GET /api/transactions/:id，响应数据结构：

```json
{
  "id": "uuid",
  "amount": 100.50,
  "type": "EXPENSE",
  "categoryId": "category_uuid",
  "categoryName": "餐饮",
  "categoryIcon": "utensils",
  "description": "午餐费用",
  "date": "2023-05-15T12:30:00Z",
  "bookId": "book_uuid",
  "bookName": "个人账本",
  "familyId": "family_uuid",
  "familyMemberId": "member_uuid",
  "familyMemberName": "自己",
  "notes": "商务午餐",
  "createdAt": "2023-05-15T12:35:00Z",
  "updatedAt": "2023-05-15T12:35:00Z",
  "relatedBudget": {
    "id": "budget_uuid",
    "name": "餐饮预算",
    "amount": 1000,
    "spent": 650,
    "remaining": 350
  }
}
```

删除交易的API端点为DELETE /api/transactions/:id

更新备注的API端点为PATCH /api/transactions/:id/notes，请求体：

```json
{
  "notes": "更新的备注内容"
}
```

使用React Query处理API请求，包括：
- 使用useQuery获取交易详情
- 使用useMutation处理删除操作
- 使用useMutation处理备注更新

## 组件结构

设计以下组件结构：

- `TransactionDetailPage` - 主页面容器
- `TransactionHeader` - 交易金额和类型显示
- `CategoryDisplay` - 分类信息显示
- `TransactionDetails` - 详细信息列表
- `NotesEditor` - 备注编辑组件
- `RelatedBudget` - 相关预算信息
- `ActionButtons` - 底部操作按钮
- `DeleteConfirmDialog` - 删除确认对话框

## 响应式设计

实现移动优先的响应式设计：

- 移动端：垂直布局，信息分块展示
- 平板/桌面端：双列布局，更多信息并排展示

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 删除操作有明确的确认机制

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 优化数据加载体验（骨架屏、加载指示器）
- 实现乐观更新（备注编辑）
- 编辑后的数据同步到列表页
- 错误处理和重试机制

## 附加功能(如时间允许)

- 交易历史记录查看
- 相关交易推荐（同类别、同商家）
- 位置信息显示（如有）
- 附件/收据查看（如有）
- 分享交易详情功能
