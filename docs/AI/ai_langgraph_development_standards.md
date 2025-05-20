# 只为记账 - LangGraph开发和调用规范

本文档定义了在"只为记账"项目中使用LangGraph进行AI功能开发的标准化规范，包括开发规范、调用规范和最佳实践。

## 1. LangGraph工作流开发规范

### 1.1 工作流结构

每个LangGraph工作流应遵循以下结构：

```typescript
import { createGraph } from 'langchain/langgraph';
import { LLMProviderService } from '../llm/llm-provider-service';

export interface WorkflowState {
  // 定义工作流状态
  input1: string;
  input2: number;
  // ...
  result?: any;
}

export class MyWorkflow {
  private llmProviderService: LLMProviderService;
  
  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
  }
  
  public async execute(input1: string, input2: number, userId: string, accountId?: string, accountType?: string) {
    // 创建工作流
    const workflow = createGraph<WorkflowState>({
      channels: {
        input1: {},
        input2: {},
        userId: {},
        accountId: {},
        accountType: {},
        result: {},
      },
    });
    
    // 添加节点
    workflow.addNode("node1", this.node1Handler.bind(this));
    workflow.addNode("node2", this.node2Handler.bind(this));
    
    // 添加边
    workflow.addEdge("node1", "node2");
    
    // 设置入口点
    workflow.setEntryPoint("node1");
    
    // 执行工作流
    const initialState: WorkflowState = {
      input1,
      input2,
      userId,
      accountId,
      accountType,
    };
    
    const result = await workflow.invoke(initialState);
    return result.result;
  }
  
  private async node1Handler(state: WorkflowState) {
    // 节点1的处理逻辑
    return { ...state, intermediateResult: "处理结果" };
  }
  
  private async node2Handler(state: WorkflowState) {
    // 节点2的处理逻辑
    return { ...state, result: "最终结果" };
  }
}
```

### 1.2 命名规范

- **类名**: 使用PascalCase，以功能名称开头，如`TransactionClassifier`
- **方法名**: 使用camelCase，动词开头，如`classifyTransaction`
- **变量名**: 使用camelCase，描述性命名，如`userTransactions`
- **接口名**: 使用PascalCase，以I开头或以功能名称加State结尾，如`ILLMProvider`或`ClassifierState`
- **文件名**: 使用kebab-case，如`transaction-classifier.ts`

### 1.3 错误处理

每个工作流节点应包含适当的错误处理：

```typescript
private async nodeHandler(state: WorkflowState) {
  try {
    // 节点处理逻辑
    return { ...state, result: "处理结果" };
  } catch (error) {
    console.error("节点处理错误:", error);
    // 提供默认结果或错误信息
    return { ...state, error: error.message };
  }
}
```

### 1.4 日志记录

在关键节点添加日志记录，便于调试和监控：

```typescript
private async nodeHandler(state: WorkflowState) {
  console.log(`开始处理节点，输入: ${JSON.stringify(state)}`);
  // 节点处理逻辑
  console.log(`节点处理完成，结果: ${JSON.stringify(result)}`);
  return { ...state, result };
}
```

## 2. LLM提供商集成规范

### 2.1 提供商接口

所有LLM提供商应实现统一的接口：

```typescript
export interface LLMProvider {
  name: string;
  getModel(options: LLMProviderOptions): any;
  generateText(prompt: string, options: LLMProviderOptions): Promise<string>;
  generateChat(messages: any[], options: LLMProviderOptions): Promise<string>;
}
```

### 2.2 提供商实现

每个提供商的实现应遵循以下结构：

```typescript
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
    return response.content;
  }
  
  public async generateChat(messages: any[], options: LLMProviderOptions): Promise<string> {
    const model = this.getModel(options);
    const response = await model.invoke(messages);
    return response.content;
  }
}
```

### 2.3 提供商服务

创建一个服务来管理所有LLM提供商：

```typescript
export class LLMProviderService {
  private providers: Map<string, LLMProvider> = new Map();
  
  constructor() {
    // 注册提供商
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new AnthropicProvider());
    // ...
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
    // 获取用户或账本的LLM设置
    // ...
  }
}
```

## 3. 前端调用规范

### 3.1 API调用

前端应通过标准的API接口调用AI功能：

```typescript
// 调用智能记账功能
const classifyTransaction = async (description: string, amount: number, date: Date) => {
  try {
    const response = await axios.post('/api/ai/classify-transaction', {
      description,
      amount,
      date,
      accountId: currentAccountId,
      accountType: currentAccountType
    });
    
    return response.data;
  } catch (error) {
    console.error('分类交易错误:', error);
    throw error;
  }
};
```

### 3.2 错误处理

前端应处理AI功能调用可能出现的错误：

```typescript
try {
  const result = await classifyTransaction(description, amount, date);
  // 处理结果
} catch (error) {
  if (error.response && error.response.status === 429) {
    // 处理速率限制错误
    showNotification('请求过于频繁，请稍后再试');
  } else {
    // 处理其他错误
    showNotification('分类失败，请重试');
  }
}
```

### 3.3 加载状态

前端应显示AI功能调用的加载状态：

```typescript
const [loading, setLoading] = useState(false);

const handleClassify = async () => {
  setLoading(true);
  try {
    const result = await classifyTransaction(description, amount, date);
    // 处理结果
  } catch (error) {
    // 处理错误
  } finally {
    setLoading(false);
  }
};
```

## 4. 后端API规范

### 4.1 API结构

AI功能的API应遵循RESTful设计原则：

```typescript
// server/src/routes/ai-routes.ts
import { Router } from 'express';
import { AIController } from '../controllers/ai-controller';

const router = Router();
const aiController = new AIController();

// 分类交易
router.post('/classify-transaction', aiController.classifyTransaction);

// 预算建议
router.get('/budget-suggestions', aiController.getBudgetSuggestions);

export default router;
```

### 4.2 请求验证

使用中间件验证API请求：

```typescript
// server/src/validators/ai-validators.ts
import Joi from 'joi';

export const classifyTransactionSchema = Joi.object({
  description: Joi.string().required(),
  amount: Joi.number().required(),
  date: Joi.date().required(),
  accountId: Joi.string().optional(),
  accountType: Joi.string().valid('personal', 'family').optional()
});

// server/src/middlewares/validate.ts
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

// server/src/routes/ai-routes.ts
router.post('/classify-transaction', validate(classifyTransactionSchema), aiController.classifyTransaction);
```

### 4.3 响应格式

API响应应遵循统一的格式：

```typescript
// 成功响应
res.json({
  success: true,
  data: result
});

// 错误响应
res.status(statusCode).json({
  success: false,
  error: {
    message: errorMessage,
    code: errorCode
  }
});
```

## 5. 工作流开发最佳实践

### 5.1 模块化设计

将复杂的工作流拆分为多个小型、可重用的组件：

```typescript
// 分类工作流
export class TransactionClassifier {
  // ...
}

// 预算建议工作流
export class BudgetAdvisor {
  // ...
}

// 消费模式分析工作流
export class ConsumptionPatternAnalyzer {
  // ...
}
```

### 5.2 提示模板分离

将提示模板与工作流逻辑分离：

```typescript
// server/src/ai/prompts/transaction-prompts.ts
export const CLASSIFICATION_SYSTEM_PROMPT = `
  你是一个专业的财务分类助手。你的任务是将交易记录分配到最合适的分类中。
  
  可用的分类有：
  {{categories}}
  
  请根据交易描述、金额和日期，选择最合适的分类。
  你的回答必须是一个JSON对象，包含以下字段：
  - categoryId: 选择的分类ID
  - confidence: 你对这个分类的置信度，范围0-1
  - reasoning: 你选择这个分类的理由
  
  只返回JSON对象，不要有其他文字。
`;

export const CLASSIFICATION_USER_PROMPT = `
  交易记录：
  - 描述: {{description}}
  - 金额: {{amount}}元
  - 日期: {{date}}
`;
```

### 5.3 缓存策略

实现适当的缓存策略，减少重复计算：

```typescript
import NodeCache from 'node-cache';

export class TransactionClassifier {
  private cache: NodeCache;
  
  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1小时过期
  }
  
  public async classifyTransaction(description: string, amount: number, date: Date, userId: string) {
    // 生成缓存键
    const cacheKey = `classify:${userId}:${description}:${amount}:${date.toISOString()}`;
    
    // 检查缓存
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // 执行工作流
    const result = await this.executeWorkflow(description, amount, date, userId);
    
    // 缓存结果
    this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

## 6. 测试规范

### 6.1 单元测试

为每个工作流组件编写单元测试：

```typescript
// server/src/__tests__/unit/ai/langgraph/transaction-classifier.test.ts
describe('TransactionClassifier', () => {
  let transactionClassifier: TransactionClassifier;
  let mockLLMProviderService: jest.Mocked<LLMProviderService>;
  
  beforeEach(() => {
    mockLLMProviderService = {
      getLLMSettings: jest.fn(),
      getProvider: jest.fn()
    } as any;
    
    transactionClassifier = new TransactionClassifier(mockLLMProviderService);
  });
  
  it('should classify transaction correctly', async () => {
    // 准备测试数据
    const description = '星巴克咖啡';
    const amount = 30;
    const date = new Date();
    const userId = 'user-id';
    
    // 模拟LLM响应
    mockLLMProviderService.getLLMSettings.mockResolvedValue({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 1000
    });
    
    // 执行测试
    const result = await transactionClassifier.classifyTransaction(description, amount, date, userId);
    
    // 验证结果
    expect(result).toBeDefined();
    expect(result.categoryId).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });
});
```

### 6.2 集成测试

编写集成测试验证API接口：

```typescript
// server/src/__tests__/integration/ai/ai-api.test.ts
describe('AI API', () => {
  it('should classify transaction', async () => {
    const response = await request(app)
      .post('/api/ai/classify-transaction')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: '星巴克咖啡',
        amount: 30,
        date: new Date().toISOString()
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.categoryId).toBeDefined();
  });
});
```
