# 家庭列表页面开发提示词

我需要开发当前项目的"家庭列表"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/家庭列表页/index.html` 中的元素、布局和风格来实现页面。

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

这是一个移动端家庭账本管理页面，具有以下核心功能：

1. 显示用户所属的所有家庭列表
2. 创建新家庭功能
3. 加入现有家庭功能
4. 家庭基本信息展示
5. 家庭角色权限管理

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"家庭账本"
- 操作菜单按钮

### 家庭列表：
- 家庭卡片列表，每个卡片显示：
  - 家庭名称
  - 成员数量
  - 用户在该家庭的角色（管理员/成员）
  - 创建日期
  - 家庭统计摘要（交易数、总额等）
- 卡片点击进入家庭详情
- 卡片长按显示操作菜单

### 创建/加入按钮：
- 创建家庭按钮
- 加入家庭按钮
- 按钮固定在底部或使用浮动按钮

### 空状态提示：
- 当没有家庭时显示引导提示
- 创建第一个家庭的按钮
- 加入家庭的说明

## 交互逻辑

实现以下交互功能：

1. 家庭列表加载：
   - 获取用户所属的所有家庭
   - 显示加载状态（骨架屏）

2. 家庭操作：
   - 点击家庭卡片进入详情页
   - 长按显示操作菜单（编辑、退出、删除）
   - 确认后执行相应操作

3. 创建家庭：
   - 点击创建按钮显示创建家庭表单
   - 输入家庭名称和描述
   - 提交创建请求

4. 加入家庭：
   - 点击加入按钮显示加入家庭表单
   - 输入邀请码或扫描二维码
   - 验证并加入家庭

## 状态管理

使用Zustand创建一个家庭管理状态仓库，包含以下状态：

- 家庭列表数据
- 加载状态（初始加载、刷新）
- 操作状态（创建中、加入中、退出中、删除中）
- 创建家庭表单状态
- 加入家庭表单状态
- 确认对话框状态

## 数据模型和API集成

获取家庭列表的API端点为GET /api/families，响应数据结构：

```json
{
  "families": [
    {
      "id": "uuid",
      "name": "我的家庭",
      "description": "家庭日常开支",
      "memberCount": 4,
      "role": "ADMIN",
      "createdAt": "2023-01-15T10:30:00Z",
      "transactionCount": 120,
      "totalExpense": 5000,
      "totalIncome": 8000
    }
  ]
}
```

创建家庭的API端点为POST /api/families，请求体：

```json
{
  "name": "我的家庭",
  "description": "家庭日常开支"
}
```

加入家庭的API端点为POST /api/families/join，请求体：

```json
{
  "inviteCode": "ABC123"
}
```

退出家庭的API端点为POST /api/families/:id/leave

删除家庭的API端点为DELETE /api/families/:id（仅管理员可操作）

使用React Query处理API请求，包括：
- 使用useQuery获取家庭列表
- 使用useMutation处理创建家庭
- 使用useMutation处理加入家庭
- 使用useMutation处理退出/删除家庭

## 组件结构

设计以下组件结构：

- `FamilyListPage` - 主页面容器
- `FamilyList` - 家庭列表组件
  - `FamilyCard` - 家庭卡片组件
  - `RoleBadge` - 角色标识组件
  - `FamilyStatsSummary` - 家庭统计摘要组件
- `FamilyActions` - 家庭操作菜单组件
- `CreateFamilyDialog` - 创建家庭对话框
  - `CreateFamilyForm` - 创建表单组件
- `JoinFamilyDialog` - 加入家庭对话框
  - `JoinFamilyForm` - 加入表单组件
  - `QRCodeScanner` - 二维码扫描组件（可选）
- `ConfirmDialog` - 确认对话框（退出/删除）
- `EmptyState` - 空状态提示组件

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 单列家庭卡片
  - 紧凑的信息展示
  - 底部固定的按钮组
- 平板/桌面端：
  - 多列网格布局
  - 更详细的家庭信息
  - 侧边固定的按钮组

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 操作确认机制清晰

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用React Hook Form处理表单状态和验证
- 使用Zod定义验证规则：
  - 家庭名称：必填，最大长度30字符
  - 描述：可选，最大长度100字符
  - 邀请码：必填，符合格式要求
- 优化数据加载体验（骨架屏、加载指示器）
- 家庭角色权限管理（管理员可删除，普通成员只能退出）
- 邀请码验证机制

## 附加功能(如时间允许)

- 家庭排序功能
- 家庭搜索/筛选功能
- 家庭邀请链接生成
- 二维码扫描加入
- 家庭角色切换请求
