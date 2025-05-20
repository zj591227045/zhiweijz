# 只为记账 - AI功能实现计划

本文档详细规划了"只为记账"应用中AI功能的实现步骤，基于LangGraph和OpenAI API。

## 1. 实现目标

1. 集成LangGraph到项目中，实现模块化的AI功能
2. 支持多种LLM提供商，包括OpenAI、Anthropic、硅基流动等
3. 实现智能记账功能，通过一句话识别分类、备注、金额等信息
4. 为前端提供标准化的API接口

## 2. 实现阶段

### 阶段1: 基础架构搭建（1周）

1. 安装必要的依赖
2. 创建AI模块的目录结构
3. 实现LLM提供商接口和服务
4. 创建数据模型扩展

### 阶段2: 智能记账功能实现（2周）

1. 实现实体提取工作流
2. 实现分类匹配工作流
3. 实现预算关联工作流
4. 实现账本关联工作流
5. 集成完整的智能记账功能

### 阶段3: API接口和前端集成（1周）

1. 创建AI功能的API接口
2. 实现前端调用逻辑
3. 添加错误处理和缓存机制

### 阶段4: 测试和优化（1周）

1. 编写单元测试和集成测试
2. 进行性能测试和优化
3. 完善文档和注释

## 3. 详细实施计划

### 3.1 基础架构搭建

#### 3.1.1 安装依赖

```bash
# 安装LangGraph和LangChain
npm install @langchain/core @langchain/openai @langchain/anthropic langchain langgraph

# 安装辅助工具
npm install node-cache dotenv
```

#### 3.1.2 创建目录结构

```bash
# 创建AI模块目录
mkdir -p server/src/ai/langgraph
mkdir -p server/src/ai/llm
mkdir -p server/src/ai/prompts
mkdir -p server/src/ai/types
mkdir -p server/src/ai/analyzers
```

#### 3.1.3 实现LLM提供商接口

创建以下文件：

1. `server/src/ai/llm/llm-provider.ts`: LLM提供商接口
2. `server/src/ai/llm/openai-provider.ts`: OpenAI实现
3. `server/src/ai/llm/anthropic-provider.ts`: Anthropic实现
4. `server/src/ai/llm/llm-provider-service.ts`: LLM提供商服务

#### 3.1.4 数据模型扩展

在Prisma模型中添加以下表：

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

执行数据库迁移：

```bash
npm run prisma:migrate
```

### 3.2 智能记账功能实现

#### 3.2.1 创建类型定义

创建 `server/src/ai/types/accounting-types.ts`：

```typescript
export interface SmartAccountingState {
  // 输入
  description: string;
  userId: string;
  accountId?: string;
  accountType?: 'personal' | 'family';
  
  // 中间状态
  extractedEntities?: {
    amount?: number;
    date?: Date;
    category?: string;
    note?: string;
  };
  
  matchedCategory?: {
    id: string;
    name: string;
    type: 'EXPENSE' | 'INCOME';
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

#### 3.2.2 创建提示模板

创建 `server/src/ai/prompts/accounting-prompts.ts`，包含实体提取和分类匹配的提示模板。

#### 3.2.3 实现智能记账工作流

创建 `server/src/ai/langgraph/smart-accounting.ts`，实现完整的智能记账工作流。

### 3.3 API接口和前端集成

#### 3.3.1 创建AI控制器

创建 `server/src/controllers/ai-controller.ts`：

```typescript
import { Request, Response } from 'express';
import { SmartAccounting } from '../ai/langgraph/smart-accounting';
import { LLMProviderService } from '../ai/llm/llm-provider-service';

export class AIController {
  private smartAccounting: SmartAccounting;
  
  constructor() {
    const llmProviderService = new LLMProviderService();
    this.smartAccounting = new SmartAccounting(llmProviderService);
  }
  
  public async processDescription(req: Request, res: Response) {
    try {
      const { description, accountId, accountType } = req.body;
      const userId = req.user.id;
      
      const result = await this.smartAccounting.processDescription(
        description, userId, accountId, accountType
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('处理描述错误:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'PROCESSING_ERROR'
        }
      });
    }
  }
  
  public async getLLMSettings(req: Request, res: Response) {
    // 获取LLM设置
    // ...
  }
  
  public async updateLLMSettings(req: Request, res: Response) {
    // 更新LLM设置
    // ...
  }
}
```

#### 3.3.2 创建AI路由

创建 `server/src/routes/ai-routes.ts`：

```typescript
import { Router } from 'express';
import { AIController } from '../controllers/ai-controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { processDescriptionSchema, updateLLMSettingsSchema } from '../validators/ai-validators';

const router = Router();
const aiController = new AIController();

// 智能记账
router.post(
  '/process-description',
  authenticate,
  validate(processDescriptionSchema),
  aiController.processDescription.bind(aiController)
);

// LLM设置
router.get(
  '/settings/llm',
  authenticate,
  aiController.getLLMSettings.bind(aiController)
);

router.put(
  '/settings/llm',
  authenticate,
  validate(updateLLMSettingsSchema),
  aiController.updateLLMSettings.bind(aiController)
);

export default router;
```

#### 3.3.3 注册AI路由

在 `server/src/routes/index.ts` 中注册AI路由：

```typescript
import { Router } from 'express';
import authRoutes from './auth-routes';
import userRoutes from './user-routes';
import transactionRoutes from './transaction-routes';
import categoryRoutes from './category-routes';
import budgetRoutes from './budget-routes';
import accountRoutes from './account-routes';
import aiRoutes from './ai-routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/categories', categoryRoutes);
router.use('/budgets', budgetRoutes);
router.use('/accounts', accountRoutes);
router.use('/ai', aiRoutes);

export default router;
```

#### 3.3.4 前端集成

在前端创建AI服务：

```typescript
// client/src/services/ai-service.ts
import axios from 'axios';
import { API_URL } from '../config';

export const processDescription = async (description: string, accountId?: string, accountType?: string) => {
  try {
    const response = await axios.post(`${API_URL}/api/ai/process-description`, {
      description,
      accountId,
      accountType
    });
    
    return response.data.data;
  } catch (error) {
    console.error('处理描述错误:', error);
    throw error;
  }
};

export const getLLMSettings = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/ai/settings/llm`);
    return response.data.data;
  } catch (error) {
    console.error('获取LLM设置错误:', error);
    throw error;
  }
};

export const updateLLMSettings = async (settings: any) => {
  try {
    const response = await axios.put(`${API_URL}/api/ai/settings/llm`, settings);
    return response.data.data;
  } catch (error) {
    console.error('更新LLM设置错误:', error);
    throw error;
  }
};
```

### 3.4 测试和优化

#### 3.4.1 单元测试

创建 `server/src/__tests__/unit/ai/langgraph/smart-accounting.test.ts`：

```typescript
import { SmartAccounting } from '../../../../ai/langgraph/smart-accounting';
import { LLMProviderService } from '../../../../ai/llm/llm-provider-service';

describe('SmartAccounting', () => {
  let smartAccounting: SmartAccounting;
  let mockLLMProviderService: jest.Mocked<LLMProviderService>;
  
  beforeEach(() => {
    mockLLMProviderService = {
      getLLMSettings: jest.fn(),
      getProvider: jest.fn()
    } as any;
    
    smartAccounting = new SmartAccounting(mockLLMProviderService);
  });
  
  it('should process description correctly', async () => {
    // 测试代码
    // ...
  });
});
```

#### 3.4.2 集成测试

创建 `server/src/__tests__/integration/ai/ai-api.test.ts`：

```typescript
import request from 'supertest';
import app from '../../../app';
import { generateToken } from '../../../utils/auth';

describe('AI API', () => {
  let token: string;
  
  beforeAll(() => {
    // 创建测试用户和令牌
    token = generateToken({ id: 'test-user-id', email: 'test@example.com' });
  });
  
  it('should process description', async () => {
    const response = await request(app)
      .post('/api/ai/process-description')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: '昨天在星巴克买了一杯咖啡，花了30元'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.amount).toBe(30);
    expect(response.body.data.categoryName).toBeDefined();
  });
});
```

## 4. 依赖和环境变量

### 4.1 依赖列表

```json
{
  "dependencies": {
    "@langchain/core": "^0.1.0",
    "@langchain/openai": "^0.0.10",
    "@langchain/anthropic": "^0.0.10",
    "langchain": "^0.1.0",
    "langgraph": "^0.0.15",
    "node-cache": "^5.1.2",
    "dotenv": "^16.3.1"
  }
}
```

### 4.2 环境变量

在 `.env` 文件中添加以下环境变量：

```
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# 其他LLM提供商
SILICONFLOW_API_KEY=your_siliconflow_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
ALIYUN_API_KEY=your_aliyun_api_key
```

## 5. 后续扩展计划

1. **预算建议功能**: 基于用户的历史消费数据提供个性化的预算建议
2. **消费模式分析**: 识别用户的消费习惯和模式，发现周期性支出和异常交易
3. **财务健康评估**: 评估用户的整体财务状况，提供改进建议
4. **智能报表生成**: 自动生成个性化的财务报表和分析
