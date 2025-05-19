# 只为记账 - 前端项目

这是"只为记账"应用的前端项目，一个移动优先的AI驱动记账应用。

## 技术栈

- **框架**: Next.js 14
- **语言**: TypeScript
- **样式**: Tailwind CSS 3.x
- **组件库**: shadcn/ui
- **状态管理**: Zustand
- **表单处理**: React Hook Form + Zod
- **数据获取**: Axios + React Query
- **图表**: Chart.js + react-chartjs-2
- **工具库**: dayjs, clsx/tailwind-merge

## 项目结构

```
/src
  /app                    # Next.js App Router
    /api                  # API路由
    /(auth)               # 认证相关页面
    /(dashboard)          # 已认证用户页面
  /components             # 组件
    /ui                   # 基础UI组件
    /auth                 # 认证相关组件
    /dashboard            # 仪表盘组件
    /transactions         # 交易相关组件
    /categories           # 分类相关组件
    /budgets              # 预算相关组件
    /statistics           # 统计分析组件
    /account-books        # 账本相关组件
    /settings             # 设置相关组件
    /layout               # 布局组件
  /hooks                  # 自定义钩子
  /lib                    # 工具库
  /store                  # 状态管理
  /styles                 # 样式文件
  /types                  # 类型定义
```

## 开发指南

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 启动生产版本

```bash
npm start
```

## 功能模块

- **认证**: 登录、注册、密码找回
- **仪表盘**: 概览、余额、最近交易
- **交易管理**: 交易列表、添加记账、交易详情
- **分类管理**: 分类列表、添加/编辑分类
- **预算管理**: 预算列表、添加/编辑预算
- **统计分析**: 收支统计、分类分析
- **账本管理**: 账本列表、添加/编辑账本
- **设置**: 个人信息、主题设置

## 主题系统

应用支持亮色和暗色两种模式，以及多种主题色彩。主题设置会保存在本地存储中。
