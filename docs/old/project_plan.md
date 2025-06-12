# 只为记账 - 项目规划文档

## 项目概述

"只为记账"是一个简单、纯粹的，AI驱动的移动端记账工具，采用B/S架构，支持多用户访问和家庭账本共享。

### 项目目标

- 提供简洁易用的移动端记账体验
- 支持个人和家庭财务管理
- 通过AI技术提供智能化的财务分析和建议
- 确保数据安全和用户隐私

## 技术栈

### 前端
- **框架**: React + Next.js
- **UI库**: Tailwind CSS + Shadcn UI
- **状态管理**: React Context API + SWR/React Query
- **移动端适配**: 响应式设计 + PWA支持

### 后端
- **框架**: Node.js + Express.js/Nest.js
- **API**: RESTful API
- **认证**: JWT (JSON Web Tokens)

### 数据库
- **主数据库**: PostgreSQL
- **缓存**: Redis (可选，用于提高性能)

### 部署
- **容器化**: Docker
- **CI/CD**: GitHub Actions
- **云服务**: AWS/Azure/GCP (根据需求选择)

## 系统架构

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│             │      │             │      │             │
│  客户端     │ <──> │  API服务    │ <──> │  数据库     │
│  (Next.js)  │      │  (Node.js)  │      │ (PostgreSQL)│
│             │      │             │      │             │
└─────────────┘      └─────────────┘      └─────────────┘
                           ↑
                           │
                     ┌─────┴─────┐
                     │           │
                     │  AI服务   │
                     │           │
                     └───────────┘
```

## 功能模块

### 1. 用户管理
- 用户注册与登录 (邮箱+密码)
- 个人资料管理
- 密码重置
- 账号设置

### 2. 记账功能
- 收入记录
- 支出记录
- 交易分类管理
  - 默认分类配置
  - 自定义分类
- 交易搜索与筛选
- 交易统计与报表

### 3. 家庭账本
- 家庭创建与管理
- 成员邀请与权限管理
- 家庭成员支出记录
- 未注册用户(如孩子)的支出记录

### 4. 预算管理
- 个人预算设置
  - 月度预算
  - 预算透支处理
- 家庭预算设置
- 年度预算管理
- 预算执行监控与提醒

### 5. AI功能
- 智能交易分类
- 消费模式分析
- 预算建议
- 财务健康评估

## 数据模型

### 用户 (Users)
- id: UUID (主键)
- email: 字符串 (唯一)
- password_hash: 字符串
- name: 字符串
- created_at: 时间戳
- updated_at: 时间戳

### 家庭 (Families)
- id: UUID (主键)
- name: 字符串
- created_by: UUID (外键 -> Users.id)
- created_at: 时间戳
- updated_at: 时间戳

### 家庭成员 (FamilyMembers)
- id: UUID (主键)
- family_id: UUID (外键 -> Families.id)
- user_id: UUID (外键 -> Users.id, 可为空)
- name: 字符串
- role: 枚举 (admin, member)
- is_registered: 布尔值
- created_at: 时间戳
- updated_at: 时间戳

### 交易分类 (Categories)
- id: UUID (主键)
- name: 字符串
- type: 枚举 (income, expense)
- icon: 字符串
- user_id: UUID (外键 -> Users.id, 可为空)
- family_id: UUID (外键 -> Families.id, 可为空)
- is_default: 布尔值
- created_at: 时间戳
- updated_at: 时间戳

### 交易记录 (Transactions)
- id: UUID (主键)
- amount: 数字
- type: 枚举 (income, expense)
- category_id: UUID (外键 -> Categories.id)
- description: 字符串
- date: 日期
- user_id: UUID (外键 -> Users.id)
- family_id: UUID (外键 -> Families.id, 可为空)
- family_member_id: UUID (外键 -> FamilyMembers.id, 可为空)
- created_at: 时间戳
- updated_at: 时间戳

### 预算 (Budgets)
- id: UUID (主键)
- amount: 数字
- period: 枚举 (monthly, yearly)
- start_date: 日期
- end_date: 日期
- category_id: UUID (外键 -> Categories.id, 可为空)
- user_id: UUID (外键 -> Users.id, 可为空)
- family_id: UUID (外键 -> Families.id, 可为空)
- rollover: 布尔值 (是否顺延)
- created_at: 时间戳
- updated_at: 时间戳

## 开发路线图

### 阶段一: 基础架构搭建 (2周)
- 项目初始化与配置
- 数据库设计与实现
- 用户认证系统开发
- API基础架构搭建

### 阶段二: 核心功能开发 (4周)
- 用户管理模块
- 记账基础功能
- 交易分类管理
- 基础数据统计

### 阶段三: 高级功能开发 (4周)
- 家庭账本功能
- 预算管理系统
- 高级数据分析与报表
- 移动端优化

### 阶段四: AI功能集成 (3周)
- AI模型选择与集成
- 智能分类功能
- 消费模式分析
- 预算建议系统

### 阶段五: 测试与优化 (2周)
- 功能测试
- 性能优化
- 安全审计
- 用户体验优化

### 阶段六: 部署与上线 (1周)
- 生产环境配置
- CI/CD流程设置
- 监控系统配置
- 正式上线

## 技术挑战与解决方案

### 1. 移动端用户体验
**挑战**: 确保在各种移动设备上提供流畅、直观的用户体验
**解决方案**: 
- 采用移动优先设计原则
- 使用响应式设计和PWA技术
- 进行广泛的设备兼容性测试

### 2. 数据安全
**挑战**: 保护用户财务数据的安全性和隐私
**解决方案**:
- 实施强大的认证和授权机制
- 数据加密存储
- 定期安全审计

### 3. AI功能实现
**挑战**: 开发准确、有用的AI驱动功能
**解决方案**:
- 从简单的规则引擎开始，逐步引入机器学习模型
- 利用用户反馈不断改进AI模型
- 考虑使用现有的AI服务，如OpenAI API

### 4. 高并发处理
**挑战**: 随着用户增长，确保系统能够处理高并发请求
**解决方案**:
- 采用Node.js非阻塞I/O模型
- 实施缓存策略
- 设计可扩展的架构，支持水平扩展

## 后续扩展计划

1. 多语言支持
2. 深度AI分析与财务建议
3. 投资追踪与管理
4. 与银行账户集成
5. 移动应用打包 (Android/iOS)
