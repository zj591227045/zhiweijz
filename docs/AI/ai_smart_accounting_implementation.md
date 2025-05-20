# 只为记账 - 智能记账功能实现

本文档详细描述了"只为记账"应用中智能记账功能的实现方案，基于LangGraph和OpenAI API。

## 1. 功能概述

智能记账功能允许用户通过一句话描述即可自动识别并填充记账信息，包括：

1. **分类识别**：自动识别交易的分类（如餐饮、购物等）
2. **金额提取**：从描述中提取交易金额
3. **日期识别**：识别交易发生的日期
4. **备注生成**：生成合适的交易备注
5. **账本关联**：自动关联到合适的账本
6. **预算关联**：自动关联到相应的预算

## 2. 技术实现

### 2.1 工作流设计

智能记账功能将使用LangGraph实现以下工作流：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 输入处理    │────►│ 智能分析    │────►│ 预算关联    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐
│ 结果生成    │◄────│ 账本关联    │
└─────────────┘     └─────────────┘
```

### 2.2 状态定义

工作流状态定义如下：

```typescript
export interface SmartAccountingState {
  // 输入
  description: string;
  userId: string;
  accountId?: string;
  accountType?: 'personal' | 'family';

  // 中间状态
  analyzedTransaction?: {
    amount: number;
    date: Date;
    categoryId: string;
    categoryName: string;
    type: 'EXPENSE' | 'INCOME';
    note: string;
    confidence: number;
  };

  matchedBudget?: {
    id: string;
    name: string;
  };

  // 输出
  result?: {
    amount: number;
    date: Date;
    categoryId: string;
    categoryName: string;
    type: 'EXPENSE' | 'INCOME';
    note: string;
    accountId: string;
    accountType: 'personal' | 'family';
    budgetId?: string;
    budgetName?: string;
    confidence: number;
  };
}
```

## 3. 实现步骤

### 3.1 依赖安装

首先，安装必要的依赖：

```bash
npm install @langchain/core @langchain/openai langchain langgraph node-cache
```

### 3.2 目录结构

```
server/src/ai/
  ├── langgraph/
  │   └── smart-accounting.ts       # 智能记账工作流
  ├── prompts/
  │   └── accounting-prompts.ts     # 提示模板
  ├── llm/
  │   ├── llm-provider.ts           # LLM提供商接口
  │   ├── openai-provider.ts        # OpenAI实现
  │   └── llm-provider-service.ts   # LLM提供商服务
  └── types/
      └── accounting-types.ts       # 类型定义
```

### 3.3 提示模板

创建智能记账的提示模板：

```typescript
// server/src/ai/prompts/accounting-prompts.ts
export const SMART_ACCOUNTING_SYSTEM_PROMPT = `
你是一个专业的财务助手，负责从用户的描述中提取记账信息并匹配到标准分类。

系统中的标准分类有：
{{categories}}

请从用户的描述中提取以下信息：
1. 金额：交易的金额，只提取数字
2. 日期：交易发生的日期，如果没有明确提到，则使用当前日期
3. 分类：直接匹配到上述标准分类中的一个
4. 备注：交易的简短描述

你的回答必须是一个JSON对象，包含以下字段：
- amount: 金额（数字）
- date: 日期（YYYY-MM-DD格式）
- categoryId: 匹配的标准分类ID
- categoryName: 匹配的标准分类名称
- type: 分类类型（EXPENSE或INCOME）
- confidence: 匹配的置信度（0-1之间的小数）
- note: 备注

只返回JSON对象，不要有其他文字。
`;

export const SMART_ACCOUNTING_USER_PROMPT = `
用户描述: {{description}}
当前日期: {{currentDate}}
`;
```

### 3.4 LLM提供商接口

创建LLM提供商接口：

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

### 3.5 OpenAI提供商实现

```typescript
// server/src/ai/llm/openai-provider.ts
import { ChatOpenAI } from '@langchain/openai';
import { LLMProvider, LLMProviderOptions } from './llm-provider';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export class OpenAIProvider implements LLMProvider {
  public name = 'openai';

  public getModel(options: LLMProviderOptions) {
    return new ChatOpenAI({
      apiKey: options.apiKey,
      modelName: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });
  }

  public async generateText(prompt: string, options: LLMProviderOptions): Promise<string> {
    const model = this.getModel(options);
    const response = await model.invoke(prompt);
    return response.content.toString();
  }

  public async generateChat(messages: any[], options: LLMProviderOptions): Promise<string> {
    const model = this.getModel(options);
    const response = await model.invoke(messages);
    return response.content.toString();
  }
}
```

### 3.6 LLM提供商服务

```typescript
// server/src/ai/llm/llm-provider-service.ts
import { LLMProvider, LLMProviderOptions } from './llm-provider';
import { OpenAIProvider } from './openai-provider';
import { PrismaClient } from '@prisma/client';

export class LLMProviderService {
  private providers: Map<string, LLMProvider> = new Map();
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();

    // 注册提供商
    this.registerProvider(new OpenAIProvider());
    // 可以注册更多提供商
  }

  public registerProvider(provider: LLMProvider) {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name: string): LLMProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`未找到提供商: ${name}`);
    }
    return provider;
  }

  public async getLLMSettings(userId: string, accountId?: string, accountType?: string): Promise<LLMProviderOptions> {
    // 默认设置
    const defaultSettings: LLMProviderOptions = {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.3,
      maxTokens: 1000
    };

    try {
      // 如果提供了账本信息，优先使用账本设置
      if (accountId && accountType) {
        const accountSettings = await this.prisma.accountLLMSetting.findFirst({
          where: {
            accountId,
            accountType
          }
        });

        if (accountSettings) {
          return {
            provider: accountSettings.provider,
            model: accountSettings.model,
            apiKey: accountSettings.apiKey || process.env[`${accountSettings.provider.toUpperCase()}_API_KEY`],
            temperature: accountSettings.temperature,
            maxTokens: accountSettings.maxTokens
          };
        }
      }

      // 如果没有账本设置或未提供账本信息，使用用户设置
      const userSettings = await this.prisma.userLLMSetting.findFirst({
        where: {
          userId
        }
      });

      if (userSettings) {
        return {
          provider: userSettings.provider,
          model: userSettings.model,
          apiKey: userSettings.apiKey || process.env[`${userSettings.provider.toUpperCase()}_API_KEY`],
          temperature: userSettings.temperature,
          maxTokens: userSettings.maxTokens
        };
      }

      // 如果没有用户设置，使用默认设置
      return defaultSettings;
    } catch (error) {
      console.error('获取LLM设置错误:', error);
      return defaultSettings;
    }
  }
}
```

### 3.7 智能记账工作流

```typescript
// server/src/ai/langgraph/smart-accounting.ts
import { createGraph } from 'langchain/langgraph';
import { LLMProviderService } from '../llm/llm-provider-service';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { SMART_ACCOUNTING_SYSTEM_PROMPT, SMART_ACCOUNTING_USER_PROMPT } from '../prompts/accounting-prompts';
import { SmartAccountingState } from '../types/accounting-types';
import NodeCache from 'node-cache';
import { PrismaClient } from '@prisma/client';

export class SmartAccounting {
  private llmProviderService: LLMProviderService;
  private prisma: PrismaClient;
  private cache: NodeCache;

  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
    this.prisma = new PrismaClient();
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1小时过期
  }

  public async processDescription(description: string, userId: string, accountId?: string, accountType?: string) {
    // 生成缓存键
    const cacheKey = `smartAccounting:${userId}:${description}`;

    // 检查缓存
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // 创建工作流
    const workflow = createGraph<SmartAccountingState>({
      channels: {
        description: {},
        userId: {},
        accountId: {},
        accountType: {},
        analyzedTransaction: {},
        matchedBudget: {},
        result: {},
      },
    });

    // 添加节点
    workflow.addNode("analyzeTransaction", this.analyzeTransactionHandler.bind(this));
    workflow.addNode("matchBudget", this.matchBudgetHandler.bind(this));
    workflow.addNode("matchAccount", this.matchAccountHandler.bind(this));
    workflow.addNode("generateResult", this.generateResultHandler.bind(this));

    // 添加边
    workflow.addEdge("analyzeTransaction", "matchBudget");
    workflow.addEdge("matchBudget", "matchAccount");
    workflow.addEdge("matchAccount", "generateResult");

    // 设置入口点
    workflow.setEntryPoint("analyzeTransaction");

    // 执行工作流
    const initialState: SmartAccountingState = {
      description,
      userId,
      accountId,
      accountType,
    };

    const result = await workflow.invoke(initialState);

    // 缓存结果
    if (result.result) {
      this.cache.set(cacheKey, result.result);
    }

    return result.result;
  }

  // 智能分析节点 - 合并了实体提取和分类匹配
  private async analyzeTransactionHandler(state: SmartAccountingState) {
    try {
      // 获取所有分类
      const categories = await this.prisma.category.findMany();

      // 获取LLM设置
      const llmSettings = await this.llmProviderService.getLLMSettings(state.userId, state.accountId, state.accountType);
      const provider = this.llmProviderService.getProvider(llmSettings.provider);

      // 准备分类列表
      const categoryList = categories.map(c =>
        `- ID: ${c.id}, 名称: ${c.name}, 类型: ${c.type === 'EXPENSE' ? '支出' : '收入'}`
      ).join('\n');

      // 准备提示
      const currentDate = new Date().toISOString().split('T')[0];
      const systemPrompt = SMART_ACCOUNTING_SYSTEM_PROMPT.replace('{{categories}}', categoryList);
      const userPrompt = SMART_ACCOUNTING_USER_PROMPT
        .replace('{{description}}', state.description)
        .replace('{{currentDate}}', currentDate);

      // 调用LLM
      const response = await provider.generateChat([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ], llmSettings);

      // 解析响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analyzedTransaction = JSON.parse(jsonMatch[0]);

        // 处理日期
        if (analyzedTransaction.date) {
          analyzedTransaction.date = new Date(analyzedTransaction.date);
        } else {
          analyzedTransaction.date = new Date();
        }

        // 验证分类ID是否有效
        const validCategory = categories.find(c => c.id === analyzedTransaction.categoryId);
        if (!validCategory) {
          throw new Error('无效的分类ID');
        }

        return { ...state, analyzedTransaction };
      }

      throw new Error('无法解析智能分析结果');
    } catch (error) {
      console.error('智能分析错误:', error);

      // 回退到默认分类
      const defaultCategory = await this.prisma.category.findFirst({
        where: { name: '其他' }
      }) || await this.prisma.category.findFirst();

      if (defaultCategory) {
        return {
          ...state,
          analyzedTransaction: {
            amount: 0,
            date: new Date(),
            categoryId: defaultCategory.id,
            categoryName: defaultCategory.name,
            type: defaultCategory.type,
            note: state.description,
            confidence: 0.5
          }
        };
      }

      return state;
    }
  }

  // 预算匹配节点
  private async matchBudgetHandler(state: SmartAccountingState) {
    // 预算匹配逻辑
    // ...

    return state;
  }

  // 账本匹配节点
  private async matchAccountHandler(state: SmartAccountingState) {
    // 账本匹配逻辑
    // ...

    return state;
  }

  // 结果生成节点
  private async generateResultHandler(state: SmartAccountingState) {
    if (!state.analyzedTransaction) {
      return state;
    }

    // 生成最终结果
    const result = {
      amount: state.analyzedTransaction.amount,
      date: state.analyzedTransaction.date,
      categoryId: state.analyzedTransaction.categoryId,
      categoryName: state.analyzedTransaction.categoryName,
      type: state.analyzedTransaction.type,
      note: state.analyzedTransaction.note,
      accountId: state.accountId || 'default',
      accountType: state.accountType || 'personal',
      budgetId: state.matchedBudget?.id,
      budgetName: state.matchedBudget?.name,
      confidence: state.analyzedTransaction.confidence
    };

    return { ...state, result };
  }
}
```
