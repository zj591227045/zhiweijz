# 家庭详情页面开发提示词

我需要开发当前项目的"家庭详情"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/家庭详情页/index.html` 中的元素、布局和风格来实现页面。

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
  - Chart.js (图表)

## 页面功能说明

这是一个移动端家庭详情页面，具有以下核心功能：

1. 显示家庭基本信息
2. 成员列表展示
3. 家庭财务统计概览
4. 家庭设置和管理选项
5. 生成邀请链接添加成员

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"家庭详情"
- 设置按钮（仅管理员可见）

### 家庭基本信息卡片：
- 家庭名称（大字体）
- 家庭描述
- 创建日期
- 成员数量
- 编辑按钮（仅管理员可见）

### 成员列表区域：
- 成员列表，每个成员显示：
  - 头像
  - 用户名
  - 角色（管理员/成员）
  - 加入日期
- "查看全部"按钮（链接到成员管理页）
- "邀请成员"按钮（仅管理员可见）

### 家庭财务统计：
- 总收入和支出
- 结余金额
- 时间范围选择器（本月、上月、全部）
- 成员消费占比饼图
- 分类消费占比饼图

### 家庭账本活动：
- 最近交易列表
- 每个交易显示：
  - 分类图标和名称
  - 描述
  - 金额
  - 成员名称
  - 日期/时间
- "查看全部"按钮（链接到交易列表）

### 家庭管理选项：
- 管理选项卡片列表（仅管理员可见）：
  - 成员管理
  - 预算管理
  - 分类管理
  - 家庭设置
- 退出家庭按钮（普通成员可见）
- 解散家庭按钮（仅管理员可见）

## 交互逻辑

实现以下交互功能：

1. 页面加载：
   - 根据URL参数获取家庭ID
   - 加载家庭详情数据
   - 加载成员列表
   - 加载财务统计数据
   - 显示加载状态（骨架屏）

2. 家庭信息操作：
   - 点击编辑按钮进入编辑模式
   - 编辑家庭名称和描述
   - 保存更改

3. 成员管理：
   - 点击"邀请成员"生成邀请链接/二维码
   - 点击"查看全部"跳转到成员管理页
   - 显示邀请链接复制选项

4. 统计数据交互：
   - 切换时间范围更新统计数据
   - 点击饼图扇区查看详细数据
   - 切换不同统计视图

5. 管理操作：
   - 点击管理选项进入相应功能页面
   - 退出/解散家庭需确认操作
   - 显示操作结果反馈

## 状态管理

使用Zustand创建一个家庭详情状态仓库，包含以下状态：

- 家庭详情数据
- 成员列表数据
- 财务统计数据
- 当前选中的统计时间范围
- 邀请链接/二维码数据
- 编辑模式状态
- 加载状态（各数据模块）
- 操作状态（编辑中、退出中、解散中）
- 确认对话框状态

## 数据模型和API集成

获取家庭详情的API端点为GET /api/families/:id，响应数据结构：

```json
{
  "id": "uuid",
  "name": "我的家庭",
  "description": "家庭日常开支",
  "createdAt": "2023-01-15T10:30:00Z",
  "memberCount": 4,
  "userRole": "ADMIN",
  "canEdit": true,
  "canInvite": true,
  "canDissolve": true
}
```

获取家庭成员的API端点为GET /api/families/:id/members，响应数据结构：

```json
{
  "members": [
    {
      "id": "member_uuid",
      "userId": "user_uuid",
      "username": "张三",
      "avatar": "https://example.com/avatar.jpg",
      "role": "ADMIN",
      "joinedAt": "2023-01-15T10:30:00Z"
    }
  ],
  "totalCount": 4
}
```

获取家庭财务统计的API端点为GET /api/families/:id/statistics，支持查询参数：

```
{
  "period": "month" // 或 "last_month", "all"
}
```

响应数据结构：

```json
{
  "totalIncome": 8000,
  "totalExpense": 5000,
  "balance": 3000,
  "memberDistribution": [
    {
      "memberId": "member_uuid",
      "username": "张三",
      "amount": 2000,
      "percentage": 40
    }
  ],
  "categoryDistribution": [
    {
      "categoryId": "category_uuid",
      "categoryName": "餐饮",
      "categoryIcon": "utensils",
      "amount": 1500,
      "percentage": 30
    }
  ],
  "recentTransactions": [
    {
      "id": "transaction_uuid",
      "categoryName": "餐饮",
      "categoryIcon": "utensils",
      "description": "晚餐",
      "amount": 150,
      "type": "EXPENSE",
      "memberName": "张三",
      "date": "2023-05-15T18:30:00Z"
    }
  ]
}
```

生成邀请链接的API端点为POST /api/families/:id/invitations，响应数据结构：

```json
{
  "inviteCode": "ABC123",
  "inviteLink": "https://app.example.com/join?code=ABC123",
  "qrCodeUrl": "https://example.com/qrcode.png",
  "expiresAt": "2023-06-15T10:30:00Z"
}
```

更新家庭信息的API端点为PUT /api/families/:id，请求体：

```json
{
  "name": "我的家庭",
  "description": "家庭日常开支"
}
```

退出家庭的API端点为POST /api/families/:id/leave

解散家庭的API端点为DELETE /api/families/:id（仅管理员可操作）

使用React Query处理API请求，包括：
- 使用useQuery获取家庭详情
- 使用useQuery获取成员列表
- 使用useQuery获取财务统计
- 使用useMutation处理邀请链接生成
- 使用useMutation处理家庭信息更新
- 使用useMutation处理退出/解散操作

## 组件结构

设计以下组件结构：

- `FamilyDetailPage` - 主页面容器
- `FamilyHeader` - 家庭基本信息组件
  - `EditableField` - 可编辑字段组件
  - `SaveCancelButtons` - 保存取消按钮组
- `MemberList` - 成员列表组件
  - `MemberItem` - 成员项组件
  - `RoleBadge` - 角色标识组件
  - `InviteMemberButton` - 邀请成员按钮
- `InvitationDialog` - 邀请对话框
  - `InviteLink` - 邀请链接组件
  - `QRCode` - 二维码组件
  - `CopyButton` - 复制按钮
- `FamilyStatistics` - 家庭统计组件
  - `PeriodSelector` - 时间范围选择器
  - `StatsSummary` - 统计摘要组件
  - `MemberDistributionChart` - 成员分布图表
  - `CategoryDistributionChart` - 分类分布图表
- `RecentTransactions` - 最近交易组件
  - `TransactionItem` - 交易项组件
  - `ViewAllButton` - 查看全部按钮
- `FamilyManagement` - 家庭管理组件
  - `ManagementCard` - 管理选项卡片
  - `LeaveButton` - 退出按钮
  - `DissolveButton` - 解散按钮
- `ConfirmDialog` - 确认对话框

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 垂直布局，信息分块展示
  - 图表适应屏幕宽度
  - 成员列表水平滚动
- 平板/桌面端：
  - 多列布局，更多信息并排展示
  - 更大的图表区域
  - 成员列表网格布局
  - 管理选项并排显示

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 操作确认机制清晰
- 图表有文本替代说明

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用Chart.js创建响应式图表
- 使用dayjs处理日期和时间格式
- 优化数据加载体验（骨架屏、加载指示器）
- 基于角色的界面适配（管理员/普通成员）
- 邀请链接的安全处理和有效期显示

## 附加功能(如时间允许)

- 家庭数据导出功能
- 家庭消费趋势图表
- 成员消费比较分析
- 家庭预算执行概览
- 家庭活动日志
