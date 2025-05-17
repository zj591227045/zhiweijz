# 只为记账 - 后端开发文档

本目录包含"只为记账"应用后端的详细开发文档。这些文档提供了后端架构、模块设计、API实现和开发计划的全面描述。

## 文档索引

### 概述文档

1. [后端开发规划概述](overview.md) - 后端开发的总体规划和条件评估
2. [项目结构](project_structure.md) - 后端项目的目录结构和文件组织
3. [开发指南](development_guide.md) - 后端开发的环境设置、流程和规范
4. [后端开发计划](backend_development_plan.md) - 详细的开发阶段、任务和时间线

### 模块设计文档

1. [模块详细设计 (第1部分)](module_design.md) - 用户认证、用户管理、交易记录模块
2. [模块详细设计 (第2部分)](module_design_part2.md) - 分类管理、预算管理模块
3. [模块详细设计 (第3部分)](module_design_part3.md) - 家庭账本、统计分析、AI功能模块

### 实现文档

1. [API实现详细规划](api_implementation.md) - API的实现方法和技术细节
2. [数据库实现详细规划](database_implementation.md) - 数据库设计和实现方案
3. [测试策略](testing_strategy.md) - 测试方法、工具和覆盖率目标
4. [部署策略](deployment_strategy.md) - 部署环境、CI/CD流程和监控方案

### AI功能文档

1. [AI功能实现概述 (修订版)](ai_implementation_overview_revised.md) - AI功能的总体架构和实现方案
2. [智能交易分类实现 (修订版)](ai_implementation_revised.md) - 智能交易分类功能的实现
3. [消费模式分析实现 (修订版)](ai_implementation_patterns_revised.md) - 消费模式分析功能的实现
4. [预算建议系统实现 (修订版)](ai_implementation_budget_revised.md) - 预算建议系统的实现
5. [财务健康评估实现](ai_implementation_health.md) - 财务健康评估功能的实现
6. [AI提示工程指南](ai_prompt_engineering.md) - 提示设计的指南和最佳实践
7. [AI功能测试策略](ai_testing_strategy.md) - AI功能的测试方法和工具
8. [AI成本控制和优化指南](ai_cost_optimization.md) - 控制和优化LLM API调用成本的策略

## 技术栈

"只为记账"后端采用以下技术栈：

- **语言**: TypeScript
- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **认证**: JWT (JSON Web Tokens)
- **AI集成**: LangGraph + OpenAI API/Anthropic API
- **测试**: Jest, Supertest
- **容器化**: Docker, Docker Compose
- **CI/CD**: GitHub Actions

## 开发环境设置

要设置开发环境，请参考[开发指南](development_guide.md)文档中的详细说明。基本步骤如下：

1. 克隆代码库
2. 安装依赖
3. 设置环境变量
4. 设置数据库
5. 运行数据库迁移
6. 启动开发服务器

## 项目结构

项目采用模块化结构，遵循关注点分离原则。主要目录包括：

- `server/src/controllers/`: 控制器，处理HTTP请求
- `server/src/services/`: 服务层，包含业务逻辑
- `server/src/repositories/`: 数据访问层，与数据库交互
- `server/src/models/`: 数据模型和接口
- `server/src/middlewares/`: 中间件
- `server/src/utils/`: 工具函数
- `server/src/validators/`: 请求验证
- `server/src/ai/`: AI相关功能
- `server/src/routes/`: 路由定义

详细的项目结构请参考[项目结构](project_structure.md)文档。

## API概览

后端提供以下主要API：

### 认证API

- `POST /api/auth/register`: 注册新用户
- `POST /api/auth/login`: 用户登录
- `POST /api/auth/forgot-password`: 请求密码重置
- `POST /api/auth/reset-password`: 重置密码

### 用户API

- `GET /api/users/me`: 获取当前用户信息
- `PATCH /api/users/me`: 更新用户信息

### 交易API

- `POST /api/transactions`: 创建交易记录
- `GET /api/transactions`: 获取交易记录列表
- `GET /api/transactions/:id`: 获取单个交易记录
- `PATCH /api/transactions/:id`: 更新交易记录
- `DELETE /api/transactions/:id`: 删除交易记录

### 分类API

- `GET /api/categories`: 获取分类列表
- `POST /api/categories`: 创建自定义分类
- `PATCH /api/categories/:id`: 更新分类
- `DELETE /api/categories/:id`: 删除分类

### 预算API

- `POST /api/budgets`: 创建预算
- `GET /api/budgets`: 获取预算列表
- `PATCH /api/budgets/:id`: 更新预算
- `DELETE /api/budgets/:id`: 删除预算

### 家庭API

- `POST /api/families`: 创建家庭
- `GET /api/families`: 获取用户的家庭列表
- `GET /api/families/:id`: 获取家庭详情
- `POST /api/families/:id/members`: 添加家庭成员
- `POST /api/families/:id/invitations`: 创建邀请链接
- `POST /api/families/join`: 接受邀请加入家庭

### 统计API

- `GET /api/statistics/expenses`: 获取支出统计
- `GET /api/statistics/income`: 获取收入统计
- `GET /api/statistics/budgets`: 获取预算执行情况
- `GET /api/statistics/overview`: 获取财务概览

### AI功能API

- `POST /api/ai/classify-transaction`: 智能分类交易
- `GET /api/ai/consumption-patterns`: 获取消费模式分析
- `GET /api/ai/budget-suggestions`: 获取预算建议
- `GET /api/ai/financial-health`: 获取财务健康评估

### LLM设置API

- `GET /api/settings/llm`: 获取LLM设置
- `PUT /api/settings/llm`: 更新LLM设置
- `GET /api/accounts/:accountId/settings/llm`: 获取账本LLM设置
- `PUT /api/accounts/:accountId/settings/llm`: 更新账本LLM设置

## 开发计划

后端开发分为以下几个主要阶段：

1. 项目初始化与基础设置 (1周)
2. 核心模块开发 (4-6周)
3. AI功能实现 (3-4周)
4. 测试与优化 (2-3周)
5. 部署准备 (1-2周)

详细的开发计划请参考[后端开发计划](backend_development_plan.md)文档。

## 贡献指南

如果您想为项目做出贡献，请遵循以下步骤：

1. Fork代码库
2. 创建功能分支 (`git checkout -b feature/your-feature-name`)
3. 提交更改 (`git commit -m 'feat: add your feature'`)
4. 推送到分支 (`git push origin feature/your-feature-name`)
5. 创建Pull Request

请确保您的代码符合项目的编码规范，并通过所有测试。
