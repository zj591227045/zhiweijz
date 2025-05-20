# 只为记账 - LangGraph集成规划

根据最新需求，我们将使用LangGraph和OpenAI API来实现"只为记账"应用的AI功能。本文档详细规划了如何将LangGraph集成到项目中，以模块化的方式进行调用，并提供标准化的开发和调用规范。

## 1. 技术选型

### 核心技术

1. **LangGraph**: 用于构建AI工作流和处理链
2. **OpenAI API**: 作为默认的LLM提供商
3. **LangChain**: 用于LLM集成和工具构建

### LLM提供商支持

我们将支持以下LLM提供商：

1. **OpenAI**: GPT-3.5/GPT-4系列模型
2. **Anthropic**: Claude系列模型
3. **硅基流动**: Qwen系列模型
4. **Deepseek**: Deepseek系列模型
5. **阿里通义**: 通义系列模型
6. **其他兼容OpenAI API的提供商**

## 2. 系统架构

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

### 模块化设计

AI功能将被设计为独立的模块，每个模块包含：

1. **LangGraph工作流**: 定义AI处理流程
2. **数据分析组件**: 处理和分析用户数据
3. **API接口**: 提供标准化的调用方式

## 3. 依赖安装

需要安装以下依赖：

```bash
npm install @langchain/core @langchain/openai @langchain/anthropic langchain langgraph
```

## 4. 目录结构

```
server/src/
  ├── ai/
  │   ├── analyzers/                # 数据分析组件
  │   │   ├── transaction-analyzer.ts
  │   │   ├── budget-analyzer.ts
  │   │   └── ...
  │   ├── langgraph/                # LangGraph工作流
  │   │   ├── transaction-classifier.ts
  │   │   ├── budget-advisor.ts
  │   │   └── ...
  │   ├── llm/                      # LLM提供商服务
  │   │   ├── llm-provider.ts
  │   │   ├── openai-provider.ts
  │   │   ├── anthropic-provider.ts
  │   │   └── ...
  │   ├── prompts/                  # 提示模板
  │   │   ├── transaction-prompts.ts
  │   │   ├── budget-prompts.ts
  │   │   └── ...
  │   ├── types/                    # 类型定义
  │   │   ├── ai-types.ts
  │   │   └── ...
  │   └── index.ts                  # 导出模块
  ├── controllers/
  │   ├── ai-controller.ts          # AI功能控制器
  │   └── ...
  ├── routes/
  │   ├── ai-routes.ts              # AI功能路由
  │   └── ...
  └── services/
      ├── ai-service.ts             # AI功能服务
      └── ...
```

## 5. LLM提供商服务

创建一个抽象的LLM提供商接口，支持不同的LLM服务：

```typescript
// server/src/ai/llm/llm-provider.ts
export interface LLMProviderOptions {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  [key: string]: any;
}

export interface LLMProvider {
  name: string;
  getModel(options: LLMProviderOptions): any;
  generateText(prompt: string, options: LLMProviderOptions): Promise<string>;
  generateChat(messages: any[], options: LLMProviderOptions): Promise<string>;
}
```

## 6. LangGraph工作流

LangGraph工作流将被设计为可重用的组件，每个工作流包含：

1. **状态定义**: 定义工作流的状态
2. **节点定义**: 定义工作流的处理节点
3. **边定义**: 定义节点之间的连接关系

示例工作流：

```typescript
// server/src/ai/langgraph/transaction-classifier.ts
import { createGraph } from 'langchain/langgraph';
import { LLMProviderService } from '../llm/llm-provider-service';

export class TransactionClassifier {
  private llmProviderService: LLMProviderService;
  
  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
  }
  
  public async classifyTransaction(description: string, amount: number, date: Date, userId: string) {
    // 创建LangGraph工作流
    const workflow = createGraph({
      channels: {
        description: {},
        amount: {},
        date: {},
        userId: {},
        result: {},
      },
    });
    
    // 添加节点和边
    // ...
    
    // 执行工作流
    const result = await workflow.invoke({
      description,
      amount,
      date,
      userId,
    });
    
    return result;
  }
}
```

## 7. 标准化调用规范

### 前端调用规范

前端通过标准的API接口调用AI功能：

```typescript
// 调用智能记账功能
const response = await axios.post('/api/ai/classify-transaction', {
  description: '星巴克咖啡',
  amount: 30,
  date: new Date(),
  accountId: 'account-id',
  accountType: 'personal'
});

// 处理响应
const { category, confidence } = response.data;
```

### 后端API规范

后端提供标准化的API接口：

```typescript
// server/src/controllers/ai-controller.ts
export class AIController {
  private transactionClassifier: TransactionClassifier;
  
  constructor() {
    const llmProviderService = new LLMProviderService();
    this.transactionClassifier = new TransactionClassifier(llmProviderService);
  }
  
  public async classifyTransaction(req: Request, res: Response) {
    try {
      const { description, amount, date, accountId, accountType } = req.body;
      const userId = req.user.id;
      
      const result = await this.transactionClassifier.classifyTransaction(
        description, amount, new Date(date), userId, accountId, accountType
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

## 8. 智能记账功能实现

根据家庭记账.yml的配置，我们将实现智能记账功能，通过一句话识别分类、备注、金额，并自动填充人员、账本、预算信息。

### 工作流设计

1. **输入处理**: 解析用户输入的记账描述
2. **实体提取**: 提取金额、日期、分类等信息
3. **分类匹配**: 将提取的分类与系统分类匹配
4. **预算关联**: 关联相应的预算信息
5. **结果生成**: 生成完整的记账信息

### 实现步骤

1. 创建LangGraph工作流
2. 定义提示模板
3. 实现实体提取逻辑
4. 实现分类匹配逻辑
5. 实现预算关联逻辑
6. 提供API接口

## 9. 后续开发计划

1. **阶段1**: 实现智能记账功能
2. **阶段2**: 实现预算建议功能
3. **阶段3**: 实现消费模式分析功能
4. **阶段4**: 实现财务健康评估功能

## 10. 测试策略

1. **单元测试**: 测试各个组件的功能
2. **集成测试**: 测试组件之间的交互
3. **端到端测试**: 测试完整的用户流程
4. **性能测试**: 测试系统在负载下的表现
