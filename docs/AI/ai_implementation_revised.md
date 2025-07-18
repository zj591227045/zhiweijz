# 只为记账 - AI功能实现修订方案

根据最新要求，我们将修改AI功能的实现方案，采用LangGraph+OpenAI API的方式，并支持每个用户和账本单独设置LLM提供商。

## 修订后的AI功能架构

### 核心技术选择

1. **LangGraph**: 用于构建AI工作流和处理链
2. **OpenAI API**: 作为默认的LLM提供商
3. **可扩展的LLM提供商接口**: 支持多种LLM服务

### LLM提供商支持

我们将支持以下LLM提供商：

1. **OpenAI**: GPT-3.5/GPT-4系列模型
2. **Anthropic**: Claude系列模型
3. **其他兼容OpenAI API的提供商**: 如Azure OpenAI、Cohere等

### 用户/账本级别的LLM设置

每个用户和账本可以单独配置：

1. **LLM提供商**: 选择使用哪个AI服务提供商
2. **模型选择**: 选择特定的模型版本
3. **参数设置**: 配置温度、最大token等参数

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

## AI功能实现

### 1. 智能记账分类

使用LangGraph构建记账分类工作流：

```typescript
// server/src/ai/langgraph/transaction-classifier.ts
import { createGraph, StateGraph } from 'langchain/langgraph';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatAnthropic } from 'langchain/chat_models/anthropic';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { LLMProviderService } from '../services/llm-provider.service';
import { Category, TransactionType } from '@server/prisma/client';

interface ClassificationState {
  description: string;
  amount: number;
  date: Date;
  categories: Category[];
  userId: string;
  accountId?: string;
  accountType?: 'personal' | 'family';
  result?: {
    categoryId: string;
    confidence: number;
    reasoning: string;
    alternativeCategories?: Array<{
      categoryId: string;
      confidence: number;
    }>;
  };
}

export class TransactionClassifier {
  private llmProviderService: LLMProviderService;
  
  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
  }
  
  private async getLLM(userId: string, accountId?: string, accountType?: 'personal' | 'family') {
    // 获取用户或账本的LLM设置
    const llmSettings = await this.llmProviderService.getLLMSettings(userId, accountId, accountType);
    
    // 根据提供商创建相应的LLM实例
    switch (llmSettings.provider) {
      case 'anthropic':
        return new ChatAnthropic({
          apiKey: llmSettings.apiKey,
          modelName: llmSettings.model,
          temperature: llmSettings.temperature,
          maxTokens: llmSettings.maxTokens,
        });
      case 'openai':
      default:
        return new ChatOpenAI({
          apiKey: llmSettings.apiKey,
          modelName: llmSettings.model,
          temperature: llmSettings.temperature,
          maxTokens: llmSettings.maxTokens,
        });
    }
  }
  
  private buildSystemPrompt(categories: Category[]): string {
    const categoryOptions = categories.map(c => 
      `- ID: ${c.id}, 名称: ${c.name}, 类型: ${c.type === 'EXPENSE' ? '支出' : '收入'}`
    ).join('\n');
    
    return `
      你是一个专业的财务分类助手。你的任务是将记账记录分配到最合适的分类中。
      
      可用的分类有：
      ${categoryOptions}
      
      请根据记账描述、金额和日期，选择最合适的分类。
      你的回答必须是一个JSON对象，包含以下字段：
      - categoryId: 选择的分类ID
      - confidence: 你对这个分类的置信度，范围0-1
      - reasoning: 你选择这个分类的理由
      - alternativeCategories: 可选的其他可能分类，每个包含categoryId和confidence
      
      只返回JSON对象，不要有其他文字。
    `;
  }
  
  private buildUserPrompt(description: string, amount: number, date: Date): string {
    return `
      记账记录：
      - 描述: ${description}
      - 金额: ${amount}元
      - 日期: ${date.toISOString().split('T')[0]}
      - 时间: ${date.toTimeString().split(' ')[0]}
    `;
  }
  
  public async classifyTransaction(
    description: string,
    amount: number,
    date: Date,
    categories: Category[],
    userId: string,
    accountId?: string,
    accountType?: 'personal' | 'family'
  ) {
    // 创建LangGraph工作流
    const workflow = createGraph<ClassificationState>({
      channels: {
        description: {},
        amount: {},
        date: {},
        categories: {},
        userId: {},
        accountId: {},
        accountType: {},
        result: {},
      },
    });
    
    // 添加分类节点
    workflow.addNode("classify", async (state) => {
      try {
        // 获取LLM实例
        const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
        
        // 构建提示
        const systemPrompt = this.buildSystemPrompt(state.categories);
        const userPrompt = this.buildUserPrompt(state.description, state.amount, state.date);
        
        // 调用LLM
        const response = await llm.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(userPrompt)
        ]);
        
        // 解析响应
        const content = response.content.toString();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          
          // 验证分类ID是否有效
          const validCategory = state.categories.find(c => c.id === result.categoryId);
          if (!validCategory) {
            throw new Error('无效的分类ID');
          }
          
          // 验证备选分类
          if (result.alternativeCategories) {
            result.alternativeCategories = result.alternativeCategories
              .filter(alt => state.categories.some(c => c.id === alt.categoryId))
              .slice(0, 3); // 最多3个备选
          }
          
          return { ...state, result };
        } else {
          throw new Error('无法解析LLM响应');
        }
      } catch (error) {
        console.error('分类错误:', error);
        
        // 回退到默认分类
        const defaultCategory = state.categories.find(c => c.name === '其他') || state.categories[0];
        return {
          ...state,
          result: {
            categoryId: defaultCategory.id,
            confidence: 0.5,
            reasoning: "处理过程中出错，使用默认分类"
          }
        };
      }
    });
    
    // 设置工作流
    workflow.setEntryPoint("classify");
    
    // 执行工作流
    const initialState: ClassificationState = {
      description,
      amount,
      date,
      categories,
      userId,
      accountId,
      accountType
    };
    
    const result = await workflow.invoke(initialState);
    return result.result;
  }
}
```

### 2. LLM提供商服务

创建一个服务来管理LLM提供商设置：

```typescript
// server/src/services/llm-provider.service.ts
import { PrismaClient } from '@server/prisma/client';

interface LLMSettings {
  provider: string;
  model: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
}

export class LLMProviderService {
  private prisma: PrismaClient;
  private defaultSettings: LLMSettings = {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3,
    maxTokens: 1000
  };
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  public async getLLMSettings(
    userId: string,
    accountId?: string,
    accountType?: 'personal' | 'family'
  ): Promise<LLMSettings> {
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
      return this.defaultSettings;
    } catch (error) {
      console.error('获取LLM设置错误:', error);
      return this.defaultSettings;
    }
  }
  
  public async updateUserLLMSettings(userId: string, settings: Partial<LLMSettings>) {
    return this.prisma.userLLMSetting.upsert({
      where: {
        userId
      },
      update: settings,
      create: {
        userId,
        ...settings
      }
    });
  }
  
  public async updateAccountLLMSettings(
    accountId: string,
    accountType: 'personal' | 'family',
    settings: Partial<LLMSettings>
  ) {
    return this.prisma.accountLLMSetting.upsert({
      where: {
        accountId_accountType: {
          accountId,
          accountType
        }
      },
      update: settings,
      create: {
        accountId,
        accountType,
        ...settings
      }
    });
  }
}
```

## API设计

### 1. 分类记账API

```
POST /api/ai/classify-transaction
```

**请求体**:
```json
{
  "description": "星巴克咖啡",
  "amount": 30,
  "date": "2023-05-15T14:30:00Z",
  "accountId": "uuid",
  "accountType": "personal"
}
```

**响应**:
```json
{
  "category": {
    "id": "uuid",
    "name": "餐饮",
    "icon": "food"
  },
  "confidence": 0.92,
  "alternativeCategories": [
    {
      "id": "uuid",
      "name": "娱乐",
      "icon": "entertainment",
      "confidence": 0.05
    }
  ],
  "reasoning": "星巴克是咖啡店，属于餐饮类别"
}
```

### 2. LLM设置API

```
GET /api/settings/llm
```

**响应**:
```json
{
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "temperature": 0.3,
  "maxTokens": 1000,
  "hasCustomApiKey": true
}
```

```
PUT /api/settings/llm
```

**请求体**:
```json
{
  "provider": "anthropic",
  "model": "claude-2",
  "apiKey": "sk-ant-...",
  "temperature": 0.5,
  "maxTokens": 2000
}
```

**响应**:
```json
{
  "message": "LLM设置已更新",
  "settings": {
    "provider": "anthropic",
    "model": "claude-2",
    "temperature": 0.5,
    "maxTokens": 2000,
    "hasCustomApiKey": true
  }
}
```

### 3. 账本LLM设置API

```
GET /api/accounts/:accountId/settings/llm
```

**查询参数**:
- `accountType`: 账本类型 (personal, family)

**响应**: 与用户LLM设置相同

```
PUT /api/accounts/:accountId/settings/llm
```

**查询参数**:
- `accountType`: 账本类型 (personal, family)

**请求体**: 与用户LLM设置相同
**响应**: 与用户LLM设置相同
