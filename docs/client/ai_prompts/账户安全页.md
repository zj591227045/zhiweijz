# 账户安全页面开发提示词

我需要开发当前项目的"账户安全"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/账户安全页/index.html` 中的元素、布局和风格来实现页面。

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

这是一个移动端账户安全设置页面，具有以下核心功能：

1. 密码修改功能
2. 邮箱修改功能
3. 登录设备管理
4. 安全日志查看
5. 账户保护设置

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"账户安全"

### 安全选项列表：
- 分组的安全选项，每组包含：
  - 组标题
  - 选项列表，每个选项显示：
    - 图标
    - 标题
    - 简短描述
    - 右侧指示器（箭头、状态标签）

#### 账户凭证组：
- 修改密码
- 修改邮箱
- 安全问题设置

#### 登录安全组：
- 登录设备管理
- 登录通知设置
- 安全日志

#### 账户保护组：
- 账户恢复选项
- 账户冻结设置

### 密码修改表单（模态框或页面）：
- 当前密码输入框
- 新密码输入框
- 确认新密码输入框
- 密码强度指示器
- 提交按钮

### 邮箱修改表单（模态框或页面）：
- 当前邮箱显示（部分隐藏）
- 新邮箱输入框
- 验证码输入框
- 发送验证码按钮
- 提交按钮

### 登录设备列表：
- 当前设备标识
- 每个设备显示：
  - 设备名称和图标
  - 最后登录时间
  - 登录位置
  - 退出按钮

### 安全日志列表：
- 时间线形式显示
- 每条日志显示：
  - 操作类型图标
  - 操作描述
  - 时间
  - 设备/位置信息
  - 详情按钮

## 交互逻辑

实现以下交互功能：

1. 页面加载：
   - 获取用户安全设置
   - 获取登录设备列表
   - 显示加载状态（骨架屏）

2. 密码修改：
   - 点击"修改密码"显示密码修改表单
   - 输入当前密码和新密码
   - 实时验证密码强度
   - 提交后显示结果反馈

3. 邮箱修改：
   - 点击"修改邮箱"显示邮箱修改表单
   - 输入新邮箱
   - 发送验证码到新邮箱
   - 输入验证码验证
   - 提交后显示结果反馈

4. 登录设备管理：
   - 查看所有登录设备
   - 点击"退出"按钮登出指定设备
   - 确认后刷新设备列表

5. 安全日志查看：
   - 浏览安全操作日志
   - 点击日志项查看详情
   - 支持筛选和搜索日志

## 状态管理

使用Zustand创建一个账户安全状态仓库，包含以下状态：

- 用户安全设置数据
- 登录设备列表
- 安全日志数据
- 当前活动表单（密码/邮箱）
- 表单数据和验证状态
- 操作状态（提交中/成功/失败）
- 错误信息
- 确认对话框状态

## 数据模型和API集成

获取安全设置的API端点为GET /api/users/me/security，响应数据结构：

```json
{
  "email": "z****@example.com",
  "lastPasswordChange": "2023-01-15T10:30:00Z",
  "securityQuestionSet": true,
  "loginNotification": true,
  "recoveryEmailSet": true,
  "recoveryEmail": "b****@example.com"
}
```

修改密码的API端点为PUT /api/users/me/password，请求体：

```json
{
  "currentPassword": "当前密码",
  "newPassword": "新密码"
}
```

修改邮箱的API端点为PUT /api/users/me/email，请求体：

```json
{
  "newEmail": "新邮箱地址",
  "verificationCode": "123456"
}
```

发送验证码的API端点为POST /api/users/me/email/verification-code，请求体：

```json
{
  "email": "新邮箱地址"
}
```

获取登录设备的API端点为GET /api/users/me/sessions，响应数据结构：

```json
{
  "sessions": [
    {
      "id": "session_uuid",
      "deviceName": "iPhone 13",
      "deviceType": "mobile",
      "browser": "Safari",
      "os": "iOS 15.4",
      "ip": "192.168.1.1",
      "location": "北京",
      "lastActive": "2023-05-15T10:30:00Z",
      "isCurrent": true
    }
  ]
}
```

退出设备的API端点为DELETE /api/users/me/sessions/:sessionId

获取安全日志的API端点为GET /api/users/me/security-logs，支持分页和筛选参数

使用React Query处理API请求，包括：
- 使用useQuery获取安全设置
- 使用useQuery获取登录设备
- 使用useQuery获取安全日志
- 使用useMutation处理密码修改
- 使用useMutation处理邮箱修改
- 使用useMutation处理设备退出

## 组件结构

设计以下组件结构：

- `SecurityPage` - 主页面容器
- `SecurityOptionsList` - 安全选项列表组件
  - `SecurityGroup` - 安全选项分组组件
  - `SecurityItem` - 安全选项项组件
- `PasswordChangeForm` - 密码修改表单
  - `PasswordInput` - 密码输入组件
  - `PasswordStrengthMeter` - 密码强度指示器
- `EmailChangeForm` - 邮箱修改表单
  - `EmailInput` - 邮箱输入组件
  - `VerificationCodeInput` - 验证码输入组件
  - `SendCodeButton` - 发送验证码按钮
- `DevicesList` - 登录设备列表
  - `DeviceItem` - 设备项组件
  - `LogoutButton` - 退出设备按钮
- `SecurityLogs` - 安全日志组件
  - `LogItem` - 日志项组件
  - `LogFilter` - 日志筛选组件
  - `LogDetails` - 日志详情组件
- `ConfirmDialog` - 确认对话框
- `FeedbackMessage` - 操作反馈消息

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 垂直布局，信息分块展示
  - 模态框表单
  - 紧凑的设备和日志列表
- 平板/桌面端：
  - 多列布局
  - 侧边表单
  - 更详细的设备和日志信息

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有表单元素有关联的标签
- 错误提示清晰且与输入元素关联
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 操作确认机制清晰

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用React Hook Form处理表单状态和验证
- 使用Zod定义验证规则：
  - 当前密码：必填
  - 新密码：必填，至少8字符，包含大小写字母和数字
  - 确认密码：必须与新密码匹配
  - 邮箱：必填，有效的邮箱格式
  - 验证码：必填，6位数字
- 密码强度检测算法
- 敏感操作的安全处理
- 验证码倒计时功能

## 附加功能(如时间允许)

- 双因素认证设置
- 登录活动地图可视化
- 安全评分系统
- 异常登录检测
- 安全建议提示
