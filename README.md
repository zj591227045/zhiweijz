# 只为记账 (ZhiWeiJZ)

一个简单、纯粹的，AI驱动的移动端记账工具。

## 项目概述

"只为记账"是一个专注于移动端体验的记账应用，采用B/S架构，支持多用户访问和家庭账本共享。应用通过AI技术提供智能化的财务管理体验，帮助用户更好地理解自己的消费模式，优化预算管理。

## 核心功能

- **记账功能**: 支持收入、支出记账，自定义分类管理
- **预算管理**: 个人和家庭预算设置，支持预算透支顺延
- **家庭账本**: 多用户共享账本，支持未注册用户(如孩子)的支出记录
- **AI驱动**: 智能交易分类，消费模式分析，预算建议

## 技术栈

- **前端**: React + Next.js, Tailwind CSS
- **移动端**: React Native, React Native Paper
- **后端**: Node.js
- **数据库**: PostgreSQL
- **认证**: JWT (JSON Web Tokens)
- **项目结构**: Monorepo (Yarn Workspaces)

## 文档

详细的项目文档位于 `docs` 目录:

### 项目规划文档

- [项目规划](docs/project_plan.md)
- [技术栈详细说明](docs/tech_stack.md)
- [实施计划](docs/implementation_plan.md)
- [数据库模型设计](docs/database_schema.md)
- [API设计](docs/api_design.md)
- [AI功能设计](docs/ai_features.md)
- [UI设计](docs/ui_design.md)

### 移动应用开发文档

- [React Native技术规划](docs/App/01_React_Native技术规划.md)
- [页面转换详细规划](docs/App/02_页面转换详细规划.md)
- [React Native实施指南](docs/App/03_React_Native实施指南.md)
- [React Native转换总结](docs/App/04_React_Native转换总结.md)
- [跨平台开发总结与规划](docs/App/05_跨平台开发总结与规划.md)
- [离线功能实现方案](docs/App/06_离线功能实现方案.md)

## 项目结构

本项目采用Monorepo结构，使用Yarn Workspaces管理多个包：

```
zhiweijz/
├── packages/                # 共享包
│   ├── core/                # 核心业务逻辑和类型定义
│   ├── web/                 # Web端特定组件和功能
│   └── mobile/              # 移动端特定组件和功能
├── apps/                    # 应用
│   ├── web/                 # Web应用
│   ├── android/             # Android应用
│   └── ios/                 # iOS应用
├── docs/                    # 项目文档
└── package.json             # 根配置
```

## 开发指南

### 环境要求

- Node.js 18+
- Yarn 1.22+
- React Native环境（用于移动端开发）
  - Android Studio（Android开发）
  - Xcode（iOS开发，仅macOS）

### 安装依赖

```bash
# 安装所有依赖
yarn install
```

### 开发命令

**核心包开发**：

```bash
# 构建核心包
yarn workspace @zhiweijz/core build

# 开发模式（监视文件变化）
yarn workspace @zhiweijz/core dev
```

**Web应用开发**：

```bash
# 启动Web开发服务器
yarn workspace @zhiweijz/web-app dev

# 构建Web应用
yarn workspace @zhiweijz/web-app build
```

**Android应用开发**：

```bash
# 启动Metro服务器
yarn workspace @zhiweijz/android-app start

# 在模拟器或设备上运行
yarn workspace @zhiweijz/android-app android

# 构建发布版APK
yarn workspace @zhiweijz/android-app build
```

**iOS应用开发**（仅macOS）：

```bash
# 启动Metro服务器
yarn workspace @zhiweijz/ios-app start

# 在模拟器或设备上运行
yarn workspace @zhiweijz/ios-app ios

# 构建应用
yarn workspace @zhiweijz/ios-app build
```

### 代码共享指南

1. **业务逻辑共享**：
   - 将共享的业务逻辑、API服务和类型定义放在`packages/core`中
   - 确保核心包不依赖于特定平台的API

2. **UI组件**：
   - Web特定组件放在`packages/web`中
   - 移动端特定组件放在`packages/mobile`中
   - 组件应遵循相同的接口设计，便于跨平台使用

3. **新功能开发流程**：
   - 先在核心包中实现平台无关的业务逻辑
   - 然后在Web和移动端分别实现UI层
   - 使用相同的数据模型和状态管理

## 开发状态

项目目前处于开发阶段：
- Web端基本功能已实现
- 移动端开发正在进行中

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。
