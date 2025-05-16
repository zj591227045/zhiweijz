# 家庭成员管理页面开发提示词

我需要开发当前项目的"家庭成员管理"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/家庭成员管理页/index.html` 中的元素、布局和风格来实现页面。

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

这是一个移动端家庭成员管理页面，具有以下核心功能：

1. 显示家庭所有成员列表
2. 管理成员角色权限
3. 邀请新成员功能
4. 移除成员功能
5. 成员消费统计展示

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"成员管理"
- 邀请按钮（仅管理员可见）

### 成员列表：
- 成员列表，每个成员项显示：
  - 头像
  - 用户名
  - 角色（管理员/成员）
  - 加入日期
  - 消费统计（总额/占比）
  - 角色管理下拉菜单（仅管理员可见）
  - 移除按钮（仅管理员可见）
- 当前用户项特殊标识（"你"）

### 邀请新成员区域：
- 邀请链接生成按钮
- 邀请码显示
- 复制链接按钮
- 分享按钮
- 二维码显示
- 有效期设置和显示

### 角色管理选项：
- 角色选择下拉菜单：
  - 管理员
  - 普通成员
- 权限说明提示

### 成员统计概览：
- 成员消费排行
- 每个成员的消费金额和占比
- 时间范围选择器（本月、上月、全部）

## 交互逻辑

实现以下交互功能：

1. 页面加载：
   - 根据URL参数获取家庭ID
   - 加载家庭成员列表
   - 加载成员统计数据
   - 显示加载状态（骨架屏）

2. 成员角色管理：
   - 点击角色下拉菜单显示可选角色
   - 选择新角色后确认更改
   - 显示更改结果反馈
   - 权限变更后刷新界面

3. 邀请新成员：
   - 点击邀请按钮生成邀请链接/二维码
   - 设置邀请有效期
   - 复制链接到剪贴板
   - 分享链接到社交媒体/消息应用

4. 移除成员：
   - 点击移除按钮显示确认对话框
   - 确认后执行移除操作
   - 显示操作结果反馈
   - 成员列表自动更新

5. 统计数据交互：
   - 切换时间范围更新统计数据
   - 点击成员查看详细消费记录

## 状态管理

使用Zustand创建一个成员管理状态仓库，包含以下状态：

- 家庭ID和基本信息
- 成员列表数据
- 成员统计数据
- 当前选中的统计时间范围
- 邀请链接/二维码数据
- 邀请有效期设置
- 加载状态（各数据模块）
- 操作状态（角色更改中、移除中、邀请生成中）
- 确认对话框状态

## 数据模型和API集成

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
      "joinedAt": "2023-01-15T10:30:00Z",
      "isCurrentUser": true,
      "statistics": {
        "totalExpense": 2000,
        "percentage": 40,
        "transactionCount": 25
      }
    }
  ],
  "userPermissions": {
    "canInvite": true,
    "canRemove": true,
    "canChangeRoles": true
  }
}
```

更新成员角色的API端点为PUT /api/families/:familyId/members/:memberId/role，请求体：

```json
{
  "role": "ADMIN" // 或 "MEMBER"
}
```

生成邀请链接的API端点为POST /api/families/:id/invitations，请求体：

```json
{
  "expiresIn": 604800 // 有效期，单位秒，默认7天
}
```

响应数据结构：

```json
{
  "inviteCode": "ABC123",
  "inviteLink": "https://app.example.com/join?code=ABC123",
  "qrCodeUrl": "https://example.com/qrcode.png",
  "expiresAt": "2023-06-15T10:30:00Z"
}
```

移除成员的API端点为DELETE /api/families/:familyId/members/:memberId

获取成员统计的API端点为GET /api/families/:id/members/statistics，支持查询参数：

```
{
  "period": "month" // 或 "last_month", "all"
}
```

使用React Query处理API请求，包括：
- 使用useQuery获取成员列表
- 使用useQuery获取成员统计
- 使用useMutation处理角色更新
- 使用useMutation处理邀请链接生成
- 使用useMutation处理成员移除

## 组件结构

设计以下组件结构：

- `MemberManagementPage` - 主页面容器
- `MemberList` - 成员列表组件
  - `MemberItem` - 成员项组件
  - `RoleBadge` - 角色标识组件
  - `RoleSelector` - 角色选择组件
  - `RemoveButton` - 移除按钮组件
- `InvitationSection` - 邀请区域组件
  - `InviteButton` - 邀请按钮
  - `InviteCodeDisplay` - 邀请码显示
  - `QRCodeDisplay` - 二维码显示
  - `ExpirySelector` - 有效期选择器
  - `CopyShareButtons` - 复制分享按钮组
- `MemberStatistics` - 成员统计组件
  - `PeriodSelector` - 时间范围选择器
  - `MemberRanking` - 成员排行组件
  - `ExpenseChart` - 消费图表组件
- `ConfirmDialog` - 确认对话框（角色更改/移除）
- `PermissionExplainer` - 权限说明组件

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 垂直布局，信息分块展示
  - 成员列表紧凑显示
  - 邀请区域折叠面板
- 平板/桌面端：
  - 多列布局，更多信息并排展示
  - 成员列表表格式布局
  - 邀请区域固定侧边

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 操作确认机制清晰
- 角色选择有明确的权限说明

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用React Hook Form处理表单状态和验证
- 使用dayjs处理日期和时间格式
- 优化数据加载体验（骨架屏、加载指示器）
- 基于权限的UI适配（显示/隐藏功能）
- 邀请链接的安全处理和有效期显示
- 移除操作的数据处理（关联交易处理）

## 附加功能(如时间允许)

- 成员活跃度统计
- 成员贡献排行
- 批量邀请功能
- 邀请历史记录
- 成员权限自定义
