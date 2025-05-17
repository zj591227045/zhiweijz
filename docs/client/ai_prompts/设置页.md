# 设置页面开发提示词

我需要开发当前项目的"设置"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/设置页/index.html` 中的元素、布局和风格来实现页面。

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

这是一个移动端用户设置页面，具有以下核心功能：

1. 显示用户基本信息
2. 提供各种设置入口
3. 主题切换功能
4. 退出登录功能
5. 应用信息展示

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"设置"

### 用户信息卡片：
- 用户头像
- 用户名
- 邮箱地址
- "编辑个人资料"按钮

### 设置选项列表：
- 分组的设置选项，每组包含：
  - 组标题
  - 选项列表，每个选项显示：
    - 图标
    - 标题
    - 简短描述（可选）
    - 右侧指示器（箭头、开关等）

#### 账户设置组：
- 个人资料
- 账户安全
- 通知设置
- 隐私设置

#### 应用设置组：
- 主题设置
- 语言设置
- 货币设置
- 数据备份与恢复

#### 支持与反馈组：
- 帮助中心
- 反馈问题
- 关于应用

### 退出登录按钮：
- 醒目的退出登录按钮
- 确认对话框

### 应用信息区域：
- 应用版本号
- 版权信息
- 隐私政策链接
- 用户协议链接

## 交互逻辑

实现以下交互功能：

1. 页面加载：
   - 获取用户信息
   - 加载用户设置偏好
   - 显示加载状态（骨架屏）

2. 用户信息交互：
   - 点击"编辑个人资料"跳转到个人资料页

3. 设置选项交互：
   - 点击设置项跳转到对应设置页面
   - 开关类设置直接在当前页面切换
   - 显示操作结果反馈

4. 主题设置：
   - 点击主题设置跳转到主题设置页
   - 支持快速切换明暗主题

5. 退出登录：
   - 点击退出按钮显示确认对话框
   - 确认后清除登录状态并跳转到登录页
   - 取消则关闭对话框

## 状态管理

使用Zustand创建一个设置状态仓库，包含以下状态：

- 用户信息数据
- 用户设置偏好
- 主题模式（明/暗）
- 语言设置
- 货币设置
- 加载状态
- 操作状态（退出中）
- 确认对话框状态

## 数据模型和API集成

获取用户信息的API端点为GET /api/users/me，响应数据结构：

```json
{
  "id": "user_uuid",
  "username": "张三",
  "email": "zhangsan@example.com",
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2023-01-15T10:30:00Z"
}
```

获取用户设置的API端点为GET /api/users/settings，响应数据结构：

```json
{
  "theme": "light",
  "language": "zh-CN",
  "currency": "CNY",
  "notifications": {
    "email": true,
    "push": true
  },
  "privacy": {
    "shareData": false
  }
}
```

更新用户设置的API端点为PATCH /api/users/settings，请求体示例：

```json
{
  "theme": "dark"
}
```

退出登录的API端点为POST /api/auth/logout

使用React Query处理API请求，包括：
- 使用useQuery获取用户信息
- 使用useQuery获取用户设置
- 使用useMutation处理设置更新
- 使用useMutation处理退出登录

## 页面布局和样式要求

为确保应用程序中所有页面的布局和样式保持一致，请遵循以下要求：

1. **使用统一的页面容器组件**：
   - 在开发新页面时，始终使用 `PageContainer` 组件作为最外层容器
   - 不要在页面中使用自定义的容器结构，如 `<div className="app-container">` 等

2. **PageContainer 组件的正确使用**：
   ```tsx
   import { PageContainer } from "@/components/layout/page-container";

   export default function SettingsPage() {
     return (
       <PageContainer
         title="设置"
         showBackButton={true}
         activeNavItem="profile" // 因为设置页面通常在个人资料/我的页面中
       >
         {/* 页面内容 */}
         <UserInfoCard />
         <SettingsList />
         <LogoutButton />
         <AppInfo />
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

- `SettingsPage` - 主页面（使用PageContainer）
- `UserInfoCard` - 用户信息卡片组件
  - `Avatar` - 头像组件
  - `UserDetails` - 用户详情组件
  - `EditProfileButton` - 编辑资料按钮
- `SettingsList` - 设置列表组件
  - `SettingsGroup` - 设置分组组件
  - `SettingsItem` - 设置项组件
  - `SettingsSwitch` - 设置开关组件
  - `SettingsNavItem` - 导航设置项组件
- `ThemeToggle` - 主题切换组件
- `LogoutButton` - 退出登录按钮
- `ConfirmDialog` - 确认对话框
- `AppInfo` - 应用信息组件

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 垂直布局，信息分块展示
  - 紧凑的设置列表
  - 底部固定的退出按钮
- 平板/桌面端：
  - 多列布局
  - 更宽敞的设置列表
  - 侧边栏导航（可选）

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 操作确认机制清晰
- 设置项有明确的描述

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用Next.js的动态路由处理设置子页面
- 设置项分组组织，提高可用性
- 实现设置的本地存储和同步
- 安全退出机制（清除令牌和敏感数据）
- 主题切换的平滑过渡效果

## 附加功能(如时间允许)

- 设置搜索功能
- 设置历史记录
- 设置导出/导入功能
- 账户删除选项（高级危险操作）
- 设置同步状态指示
