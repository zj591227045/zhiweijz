# 个人资料页面开发提示词

我需要开发当前项目的"个人资料"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/个人资料页/index.html` 中的元素、布局和风格来实现页面。

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

这是一个移动端个人资料编辑页面，具有以下核心功能：

1. 显示和编辑用户基本信息
2. 上传和裁剪头像
3. 修改用户名和个人简介
4. 表单验证和提交
5. 实时保存反馈

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"个人资料"
- 保存按钮

### 头像上传区域：
- 当前头像显示（大尺寸）
- 上传按钮覆盖在头像上
- 点击后显示上传选项（拍照、从相册选择）
- 头像裁剪工具（上传后显示）

### 个人信息表单：
- 用户名输入框
  - 当前用户名预填充
  - 字数限制提示
- 个人简介文本域
  - 当前简介预填充
  - 字数限制提示
- 邮箱显示（只读）
- 注册日期显示（只读）

### 保存状态反馈：
- 保存中加载指示器
- 保存成功提示
- 保存失败错误提示

## 交互逻辑

实现以下交互功能：

1. 页面加载：
   - 获取用户当前资料
   - 预填充表单字段
   - 显示加载状态（骨架屏）

2. 头像上传：
   - 点击头像显示上传选项
   - 选择图片后显示裁剪工具
   - 裁剪完成后预览效果
   - 确认后上传到服务器

3. 表单编辑：
   - 输入用户名（实时验证）
   - 输入个人简介（可选）
   - 显示字数限制和剩余字数

4. 表单提交：
   - 点击保存按钮提交表单
   - 验证所有字段
   - 显示保存中状态
   - 成功后显示成功提示
   - 失败显示错误信息

## 状态管理

使用Zustand创建一个个人资料状态仓库，包含以下状态：

- 用户资料数据
- 表单数据（用户名、简介）
- 头像数据（当前头像、新头像）
- 裁剪工具状态
- 表单验证状态
- 提交状态（初始/提交中/成功/失败）
- 错误信息

## 数据模型和API集成

获取用户资料的API端点为GET /api/users/me/profile，响应数据结构：

```json
{
  "id": "user_uuid",
  "username": "张三",
  "email": "zhangsan@example.com",
  "avatar": "https://example.com/avatar.jpg",
  "bio": "个人简介内容",
  "createdAt": "2023-01-15T10:30:00Z"
}
```

更新用户资料的API端点为PUT /api/users/me/profile，请求体：

```json
{
  "username": "张三",
  "bio": "更新的个人简介"
}
```

上传头像的API端点为POST /api/users/me/avatar，使用FormData格式：

```
FormData:
- avatar: (文件)
```

使用React Query处理API请求，包括：
- 使用useQuery获取用户资料
- 使用useMutation处理资料更新
- 使用useMutation处理头像上传

## 页面布局和样式要求

为确保应用程序中所有页面的布局和样式保持一致，请遵循以下要求：

1. **使用统一的页面容器组件**：
   - 在开发新页面时，始终使用 `PageContainer` 组件作为最外层容器
   - 不要在页面中使用自定义的容器结构，如 `<div className="app-container">` 等

2. **PageContainer 组件的正确使用**：
   ```tsx
   import { PageContainer } from "@/components/layout/page-container";

   export default function ProfilePage() {
     // 右侧操作按钮示例
     const rightActions = (
       <button
         className="icon-button"
         type="submit"
         form="profile-form"
         disabled={isSubmitting}
       >
         {isSubmitting ? (
           <i className="fas fa-spinner fa-spin"></i>
         ) : (
           <i className="fas fa-save"></i>
         )}
       </button>
     );

     return (
       <PageContainer
         title="个人资料"
         rightActions={rightActions}
         showBackButton={true}
         activeNavItem="profile"
       >
         {/* 页面内容 */}
         <AvatarUploader />
         <ProfileForm id="profile-form" />
         <SaveFeedback />
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

- `ProfilePage` - 主页面（使用PageContainer）
- `AvatarUploader` - 头像上传组件
  - `CurrentAvatar` - 当前头像显示
  - `UploadOptions` - 上传选项菜单
  - `ImageCropper` - 图片裁剪工具
  - `CropConfirmButtons` - 裁剪确认按钮
- `ProfileForm` - 个人资料表单
  - `UsernameInput` - 用户名输入组件
  - `BioTextarea` - 简介文本域组件
  - `CharacterCounter` - 字符计数器
  - `ReadOnlyField` - 只读字段组件
- `SaveButton` - 保存按钮组件
- `SaveFeedback` - 保存反馈组件
  - `LoadingIndicator` - 加载指示器
  - `SuccessMessage` - 成功消息
  - `ErrorMessage` - 错误消息

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 垂直布局
  - 头像居中显示
  - 表单元素占满宽度
- 平板/桌面端：
  - 更宽敞的布局
  - 头像和表单并排显示
  - 更大的输入区域

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有表单元素有关联的标签
- 图片上传有替代文本和说明
- 错误提示清晰且与输入元素关联
- 支持键盘导航
- 保存操作有明确的反馈

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用React Hook Form处理表单状态和验证
- 使用Zod定义验证规则：
  - 用户名：必填，2-20字符，不含特殊字符
  - 简介：可选，最多200字符
- 图片裁剪和压缩（优化上传体验）
- 表单数据的本地存储（防止意外关闭）
- 实时保存反馈（自动保存或手动保存）

## 附加功能(如时间允许)

- 头像滤镜选择
- 用户名唯一性检查
- 社交媒体链接添加
- 个人标签设置
- 表单更改检测（提示未保存更改）
