# LangGraph架构文档

## 1. 概述

LangGraph是一个基于大语言模型(LLM)的工作流框架，用于构建复杂的AI应用。在"只为记账"项目中，我们使用LangGraph实现了智能记账功能，并构建了一个灵活的LLM调用架构，支持多种LLM提供商和配置。

## 2. 架构设计

### 2.1 整体架构

```
用户请求 → API控制器 → LLM提供商服务 → LangGraph工作流 → 数据库
                         ↑
                    LLM设置存储
```

### 2.2 核心组件

- **API控制器**: 处理用户请求，调用LLM提供商服务
- **LLM提供商服务**: 管理不同的LLM提供商配置，提供统一的接口
- **LangGraph工作流**: 基于LangGraph框架实现的工作流，处理复杂的AI任务
- **LLM设置存储**: 存储用户和账本的LLM设置

## 3. LLM提供商服务

### 3.1 设计目标

1. 支持多种LLM提供商(OpenAI、硅基流动等)
2. 提供统一的接口，简化LLM调用
3. 支持用户级别和账本级别的LLM设置
4. 灵活的配置管理，支持不同的API密钥和参数

### 3.2 核心接口

```typescript
interface LLMSettings {
  provider: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  baseUrl?: string;
}

interface LLMProvider {
  generateText(prompt: string, options?: any): Promise<string>;
}
```

### 3.3 LLM提供商服务实现

```typescript
export class LLMProviderService {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultSettings: LLMSettings = {
    provider: 'siliconflow',
    apiKey: process.env.SILICONFLOW_API_KEY || '',
    model: 'Qwen/Qwen3-32B',
    temperature: 0.7,
    maxTokens: 1000,
  };
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.registerProviders();
  }

  // 获取LLM设置
  public async getLLMSettings(
    userId: string,
    accountId?: string
  ): Promise<LLMSettings> {
    // 优先使用账本绑定的LLM设置
    // 如果没有，使用用户的默认LLM设置
    // 如果都没有，使用系统默认设置
  }

  // 创建用户LLM设置
  public async createUserLLMSetting(
    userId: string,
    settings: {
      name: string;
      provider: string;
      model: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
      baseUrl?: string;
      description?: string;
    }
  ): Promise<string> {
    // 创建新的用户LLM设置
  }

  // 更新账本LLM设置
  public async updateAccountLLMSettings(
    accountId: string,
    userLLMSettingId: string
  ): Promise<void> {
    // 将账本绑定到特定的用户LLM设置
  }

  // 生成文本
  public async generateText(
    prompt: string,
    userId: string,
    accountId?: string,
    options?: any
  ): Promise<string> {
    // 获取LLM设置
    // 获取对应的LLM提供商
    // 调用LLM提供商生成文本
  }
}
```

## 4. LangGraph工作流

### 4.1 工作流设计

LangGraph工作流是一个有向图，由多个节点组成，每个节点处理特定的任务。在智能记账功能中，我们实现了以下工作流：

```
初始状态 → 分析记账 → 分类匹配 → 预算匹配 → 账本匹配 → 结果生成
```

### 4.2 工作流状态

```typescript
interface SmartAccountingState {
  description: string;
  userId: string;
  accountId?: string;
  accountType?: 'personal' | 'family';
  analyzedTransaction?: {
    amount: number;
    date: Date;
    categoryId: string;
    categoryName: string;
    type: 'INCOME' | 'EXPENSE';
    note: string;
    confidence: number;
  };
  matchedBudget?: {
    id: string;
    name: string;
  };
  result?: any;
}
```

### 4.3 工作流节点

1. **分析记账节点**: 使用LLM分析用户描述，提取记账信息
2. **分类匹配节点**: 将提取的分类信息匹配到系统中的分类
3. **预算匹配节点**: 根据记账信息匹配相应的预算
4. **账本匹配节点**: 验证账本信息并确保用户有权限访问
5. **结果生成节点**: 生成最终的结构化结果

### 4.4 工作流实现

```typescript
export class SmartAccounting {
  private cache: NodeCache = new NodeCache({ stdTTL: 3600 });
  private prisma: PrismaClient;
  private llmProviderService: LLMProviderService;

  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
    this.prisma = new PrismaClient();
  }

  public async processDescription(
    description: string,
    userId: string,
    accountId: string,
    accountType: string
  ) {
    // 创建初始状态
    const initialState: SmartAccountingState = {
      description,
      userId,
      accountId,
      accountType: accountType.toLowerCase() as 'personal' | 'family',
    };

    // 执行工作流
    const state = await this.executeWorkflow(initialState);
    return state.result;
  }

  private async executeWorkflow(state: SmartAccountingState) {
    // 分析记账
    state = await this.analyzeTransactionHandler(state);
    
    // 分类匹配
    state = await this.matchCategoryHandler(state);
    
    // 预算匹配
    state = await this.matchBudgetHandler(state);
    
    // 账本匹配
    state = await this.matchAccountHandler(state);
    
    // 结果生成
    state = await this.generateResultHandler(state);
    
    return state;
  }

  // 各节点处理方法...
}
```

## 5. 多LLM提供商支持

### 5.1 支持的LLM提供商

1. **OpenAI**: 官方OpenAI API
2. **硅基流动**: 国内LLM服务提供商，支持多种模型
3. **自定义提供商**: 支持用户自定义LLM提供商

### 5.2 提供商注册

```typescript
private registerProviders() {
  // 注册OpenAI提供商
  this.providers.set('openai', new OpenAIProvider());
  
  // 注册硅基流动提供商
  this.providers.set('siliconflow', new SiliconFlowProvider());
  
  // 可以注册更多提供商...
}
```

### 5.3 提供商实现

```typescript
class OpenAIProvider implements LLMProvider {
  async generateText(prompt: string, options?: any): Promise<string> {
    // 调用OpenAI API生成文本
  }
}

class SiliconFlowProvider implements LLMProvider {
  async generateText(prompt: string, options?: any): Promise<string> {
    // 调用硅基流动API生成文本
  }
}
```

## 6. 账本与LLM设置绑定

### 6.1 数据模型

```prisma
model UserLLMSetting {
  id          String        @id @default(uuid())
  userId      String        @map("user_id")
  provider    String        @default("openai")
  model       String        @default("gpt-3.5-turbo")
  apiKey      String?       @map("api_key")
  temperature Float         @default(0.3)
  maxTokens   Int           @default(1000) @map("max_tokens")
  name        String        @default("默认LLM设置")
  description String?
  baseUrl     String?       @map("base_url")
  user        User          @relation(fields: [userId], references: [id])
  accountBooks AccountBook[]
}

model AccountBook {
  // 其他字段...
  userLLMSettingId String?           @map("user_llm_setting_id")
  userLLMSetting   UserLLMSetting?   @relation(fields: [userLLMSettingId], references: [id])
}
```

### 6.2 绑定流程

1. 用户创建LLM设置
2. 用户将账本绑定到特定的LLM设置
3. 系统在处理智能记账请求时，使用账本绑定的LLM设置

### 6.3 使用场景

1. **个人账本**: 用户可以为个人账本绑定自己的LLM设置
2. **家庭账本**: 家庭管理员可以为家庭账本绑定特定的LLM设置，所有家庭成员共享该设置

## 7. 未来扩展

1. **支持更多LLM提供商**: 添加更多LLM提供商支持，如Anthropic、Cohere等
2. **工作流编排**: 提供可视化工具，允许用户自定义工作流
3. **模型微调**: 支持模型微调，提高智能记账的准确性
4. **多语言支持**: 支持多种语言的智能记账
5. **批量处理**: 支持批量处理多条记账描述
