# 只为记账 - AI功能实现概述 (修订版)

根据最新要求，我们将修改"只为记账"应用中AI功能的实现方案，采用LangGraph+OpenAI API的方式，并支持每个用户和账本单独设置LLM提供商。

## AI功能概述

"只为记账"应用将实现以下AI功能：

1. **智能交易分类**：自动将用户输入的交易记录分配到最合适的分类
2. **消费模式分析**：识别用户的消费习惯和模式，发现周期性支出和异常交易
3. **预算建议**：基于历史数据提供个性化的预算分配建议
4. **财务健康评估**：评估用户的整体财务状况，提供改进建议

## 技术选择

### 核心技术

1. **LangGraph**：用于构建AI工作流和处理链
   - 支持多步骤的复杂AI处理流程
   - 提供状态管理和错误处理
   - 便于组合和重用AI组件

2. **OpenAI API**：作为默认的LLM提供商
   - 使用GPT-3.5/GPT-4系列模型
   - 通过LangChain集成

3. **LangChain**：用于LLM集成和工具构建
   - 提供与多种LLM的统一接口
   - 支持提示模板和链式处理

### LLM提供商支持

我们将支持以下LLM提供商：

1. **OpenAI**：GPT-3.5/GPT-4系列模型
2. **Anthropic**：Claude系列模型
3. **其他兼容OpenAI API的提供商**：如Azure OpenAI、Cohere等

## 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端应用                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        API层                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI服务层                               │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ LangGraph   │    │ 基础分析    │    │ LLM提供商   │     │
│  │ 工作流      │◄──►│ 组件        │    │ 服务        │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据访问层                             │
└─────────────────────────────────────────────────────────────┘
```

### 用户/账本级别的LLM设置

每个用户和账本可以单独配置：

1. **LLM提供商**：选择使用哪个AI服务提供商
2. **模型选择**：选择特定的模型版本
3. **参数设置**：配置温度、最大token等参数

## 数据模型扩展

为了支持这些新功能，我们需要扩展数据模型：

```prisma
// 用户LLM设置
model UserLLMSetting {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  provider      String    @default("openai") // openai, anthropic, etc.
  model         String    @default("gpt-3.5-turbo")
  apiKey        String?   @map("api_key")
  temperature   Float     @default(0.3)
  maxTokens     Int       @default(1000) @map("max_tokens")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // 关系
  user          User      @relation(fields: [userId], references: [id])

  @@map("user_llm_settings")
}

// 账本LLM设置
model AccountLLMSetting {
  id            String    @id @default(uuid())
  accountType   String    @map("account_type") // personal, family
  accountId     String    @map("account_id") // userId or familyId
  provider      String    @default("openai")
  model         String    @default("gpt-3.5-turbo")
  apiKey        String?   @map("api_key")
  temperature   Float     @default(0.3)
  maxTokens     Int       @default(1000) @map("max_tokens")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@map("account_llm_settings")
}
```

## 实现路径

我们将采用渐进式实现路径，从简单到复杂：

### 阶段1: 基础功能实现

1. **设置LLM提供商服务**
   - 实现LLM设置管理
   - 创建LLM提供商接口

2. **智能交易分类**
   - 使用LangGraph构建分类工作流
   - 实现基于LLM的交易分类

3. **基础统计分析**
   - 实现交易数据的基础统计分析
   - 提供简单的消费模式识别

### 阶段2: 高级功能实现

1. **消费模式分析**
   - 使用LangGraph构建消费模式分析工作流
   - 实现周期性支出识别和异常检测

2. **预算建议系统**
   - 使用LangGraph构建预算建议工作流
   - 提供个性化的预算分配建议

3. **财务健康评估**
   - 实现财务健康指标计算
   - 提供改进建议

### 阶段3: 优化和个性化

1. **用户反馈学习**
   - 收集用户对AI建议的反馈
   - 使用反馈优化提示模板

2. **个性化体验**
   - 根据用户历史行为调整AI响应
   - 提供更符合用户习惯的建议

## 关键组件

### 1. LLM提供商服务

```typescript
// server/src/services/llm-provider.service.ts
export class LLMProviderService {
  // 获取用户或账本的LLM设置
  async getLLMSettings(userId, accountId?, accountType?) {...}
  
  // 更新用户LLM设置
  async updateUserLLMSettings(userId, settings) {...}
  
  // 更新账本LLM设置
  async updateAccountLLMSettings(accountId, accountType, settings) {...}
}
```

### 2. LangGraph工作流

```typescript
// server/src/ai/langgraph/transaction-classifier.ts
export class TransactionClassifier {
  // 使用LangGraph构建分类工作流
  async classifyTransaction(description, amount, date, categories, userId, accountId?, accountType?) {...}
}

// server/src/ai/langgraph/consumption-pattern-analyzer.ts
export class ConsumptionPatternAnalyzer {
  // 使用LangGraph构建消费模式分析工作流
  async analyzePatterns(transactions, categories, startDate, endDate, userId, accountId?, accountType?) {...}
}

// server/src/ai/langgraph/budget-advisor.ts
export class BudgetAdvisor {
  // 使用LangGraph构建预算建议工作流
  async generateBudgetSuggestions(transactions, categories, existingBudgets, months, targetSavingsRate?, userId, accountId?, accountType?) {...}
}
```

### 3. 基础分析组件

```typescript
// server/src/ai/analyzers/basic-stats-analyzer.ts
export class BasicStatsAnalyzer {
  // 分析交易数据的基础统计信息
  analyze(transactions, categories, startDate, endDate) {...}
}

// server/src/ai/analyzers/budget-data-analyzer.ts
export class BudgetDataAnalyzer {
  // 分析预算相关数据
  analyze(transactions, categories, existingBudgets, months) {...}
}
```

## API设计

### 1. LLM设置API

```
GET /api/settings/llm
PUT /api/settings/llm
GET /api/accounts/:accountId/settings/llm?accountType=personal|family
PUT /api/accounts/:accountId/settings/llm?accountType=personal|family
```

### 2. AI功能API

```
POST /api/ai/classify-transaction
GET /api/ai/consumption-patterns
GET /api/ai/budget-suggestions
GET /api/ai/financial-health
POST /api/ai/feedback
```

## 安全考虑

1. **API密钥管理**
   - 加密存储用户提供的API密钥
   - 提供使用系统默认API密钥的选项

2. **数据隐私**
   - 确保只发送必要的数据到LLM
   - 不在提示中包含敏感个人信息

3. **成本控制**
   - 实施API调用限制
   - 监控和记录API使用情况

## 性能优化

1. **缓存策略**
   - 缓存常见查询的结果
   - 实施智能缓存失效策略

2. **异步处理**
   - 对于耗时的分析任务使用异步处理
   - 提供进度反馈机制

3. **批处理**
   - 合并多个相关查询
   - 减少API调用次数

## 后续文档

AI功能的详细实现将在以下文档中描述：

1. [智能交易分类实现 (修订版)](ai_implementation_revised.md)
2. [消费模式分析实现 (修订版)](ai_implementation_patterns_revised.md)
3. [预算建议系统实现 (修订版)](ai_implementation_budget_revised.md)
