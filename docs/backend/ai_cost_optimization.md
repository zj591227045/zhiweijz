# 只为记账 - AI成本控制和优化指南

本文档详细描述了"只为记账"应用中AI功能的成本控制和优化策略，包括缓存策略、批处理、提示优化和资源管理。

## 成本挑战

使用LLM API实现AI功能面临以下成本挑战：

1. **API调用费用**：LLM API调用通常按token计费，成本可能迅速累积
2. **用量不可预测**：用户使用AI功能的频率和方式难以准确预测
3. **模型选择权衡**：高级模型提供更好的结果但成本更高
4. **提示长度影响**：提示和响应的长度直接影响成本
5. **错误重试成本**：错误处理和重试会增加API调用次数

## 成本优化策略概述

我们将采用多层次的成本优化策略：

1. **缓存策略**：缓存LLM响应以减少重复调用
2. **批处理**：合并多个请求以减少API调用次数
3. **提示优化**：优化提示以减少token消耗
4. **模型选择**：根据任务复杂性选择适当的模型
5. **用户限制**：实施合理的用户使用限制
6. **资源监控**：监控和分析API使用情况

## 缓存策略

缓存是减少LLM API调用成本的最有效方法之一。

### 缓存级别

1. **结果缓存**：缓存完整的LLM响应
2. **计算缓存**：缓存中间计算结果
3. **用户级缓存**：针对特定用户的缓存

### 缓存实现

```typescript
// server/src/services/llm-cache.service.ts
import { createClient } from 'redis';
import { createHash } from 'crypto';

export class LLMCacheService {
  private redisClient;
  private defaultTTL = 60 * 60 * 24; // 24小时
  
  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL
    });
    this.redisClient.connect();
  }
  
  // 生成缓存键
  private generateCacheKey(prompt: string, model: string, temperature: number): string {
    const hash = createHash('md5')
      .update(`${prompt}|${model}|${temperature}`)
      .digest('hex');
    return `llm:response:${hash}`;
  }
  
  // 获取缓存的响应
  async getCachedResponse(prompt: string, model: string, temperature: number): Promise<string | null> {
    const cacheKey = this.generateCacheKey(prompt, model, temperature);
    return await this.redisClient.get(cacheKey);
  }
  
  // 缓存响应
  async cacheResponse(
    prompt: string, 
    model: string, 
    temperature: number, 
    response: string, 
    ttl: number = this.defaultTTL
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(prompt, model, temperature);
    await this.redisClient.set(cacheKey, response, { EX: ttl });
  }
  
  // 缓存失效
  async invalidateCache(prompt: string, model: string, temperature: number): Promise<void> {
    const cacheKey = this.generateCacheKey(prompt, model, temperature);
    await this.redisClient.del(cacheKey);
  }
  
  // 批量缓存失效
  async invalidateCachePattern(pattern: string): Promise<void> {
    const keys = await this.redisClient.keys(`llm:response:${pattern}*`);
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
  }
}
```

### 缓存策略

1. **确定性查询缓存**：对于相同输入总是产生相同输出的查询
2. **时间敏感缓存**：根据数据变化频率设置缓存过期时间
3. **用户特定缓存**：针对特定用户的个性化响应缓存

### 缓存使用示例

```typescript
// 在LLM调用中使用缓存
async function callLLMWithCache(prompt: string, model: string, temperature: number) {
  const cacheService = new LLMCacheService();
  
  // 尝试从缓存获取
  const cachedResponse = await cacheService.getCachedResponse(prompt, model, temperature);
  if (cachedResponse) {
    console.log('Cache hit!');
    return JSON.parse(cachedResponse);
  }
  
  // 缓存未命中，调用API
  console.log('Cache miss, calling API...');
  const llm = new ChatOpenAI({
    modelName: model,
    temperature: temperature
  });
  
  const response = await llm.invoke([
    new SystemMessage("You are a helpful assistant."),
    new HumanMessage(prompt)
  ]);
  
  // 缓存响应
  await cacheService.cacheResponse(
    prompt, 
    model, 
    temperature, 
    JSON.stringify(response)
  );
  
  return response;
}
```

## 批处理策略

批处理通过合并多个请求减少API调用次数。

### 批处理方法

1. **请求合并**：将多个相似请求合并为一个
2. **响应拆分**：将单个响应拆分为多个结果
3. **队列处理**：使用队列批量处理请求

### 批处理实现

```typescript
// server/src/services/llm-batch.service.ts
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { SystemMessage, HumanMessage } from 'langchain/schema';

interface BatchRequest {
  id: string;
  prompt: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export class LLMBatchService {
  private batchQueue: BatchRequest[] = [];
  private batchSize: number = 5;
  private batchTimeout: number = 200; // 毫秒
  private timeoutId: NodeJS.Timeout | null = null;
  private processing: boolean = false;
  
  constructor(batchSize: number = 5, batchTimeout: number = 200) {
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;
  }
  
  // 添加请求到批处理队列
  async addRequest(prompt: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // 创建请求对象
      const request: BatchRequest = {
        id: Math.random().toString(36).substring(2, 9),
        prompt,
        resolve,
        reject
      };
      
      // 添加到队列
      this.batchQueue.push(request);
      
      // 如果队列达到批处理大小，立即处理
      if (this.batchQueue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.timeoutId) {
        // 否则设置超时处理
        this.timeoutId = setTimeout(() => this.processBatch(), this.batchTimeout);
      }
    });
  }
  
  // 处理批处理队列
  private async processBatch() {
    if (this.processing || this.batchQueue.length === 0) return;
    
    // 清除超时
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    this.processing = true;
    
    // 获取当前批次
    const currentBatch = this.batchQueue.splice(0, this.batchSize);
    
    try {
      // 构建批处理提示
      const batchPrompt = currentBatch.map((req, index) => 
        `Request ${index + 1}:\n${req.prompt}`
      ).join('\n\n---\n\n');
      
      // 构建系统提示
      const systemPrompt = `
        You are a helpful assistant. You will receive multiple requests.
        Please respond to each request separately in the following JSON format:
        {
          "responses": [
            {"requestId": 1, "response": "your response to request 1"},
            {"requestId": 2, "response": "your response to request 2"},
            ...
          ]
        }
      `;
      
      // 调用LLM
      const llm = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.3
      });
      
      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(batchPrompt)
      ]);
      
      // 解析响应
      const content = response.content.toString();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // 分发响应
        if (result.responses && Array.isArray(result.responses)) {
          result.responses.forEach((resp, index) => {
            if (index < currentBatch.length) {
              currentBatch[index].resolve(resp.response);
            }
          });
        }
      } else {
        // 解析失败，拒绝所有请求
        currentBatch.forEach(req => {
          req.reject(new Error('Failed to parse batch response'));
        });
      }
    } catch (error) {
      // 错误处理
      currentBatch.forEach(req => {
        req.reject(error);
      });
    } finally {
      this.processing = false;
      
      // 如果队列中还有请求，继续处理
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
    }
  }
}
```

### 批处理使用示例

```typescript
// 使用批处理服务
const batchService = new LLMBatchService(5, 200);

// 客户端代码
async function classifyTransaction(description: string) {
  try {
    const prompt = `请将交易"${description}"分类到最合适的类别。`;
    const response = await batchService.addRequest(prompt);
    return response;
  } catch (error) {
    console.error('批处理请求失败:', error);
    // 回退到单个请求
    return fallbackClassifyTransaction(description);
  }
}
```

## 提示优化

优化提示可以显著减少token消耗，从而降低成本。

### 提示优化技巧

1. **简洁明了**：使用简洁的语言，避免不必要的词语
2. **结构化输入**：使用结构化格式提供数据
3. **限制上下文**：只提供必要的上下文信息
4. **精确指令**：提供精确的指令，避免歧义
5. **控制输出格式**：明确指定所需的输出格式和长度

### 提示优化示例

**优化前**：

```
你是一个专业的财务分析师。我需要你帮我分析一下这笔交易应该属于什么类别。
这笔交易的描述是"星巴克咖啡"，金额是30元，发生在2023年5月15日下午2点30分。
请你根据这些信息，告诉我这笔交易最可能属于哪个类别，比如餐饮、购物、交通等等。
请详细解释你的分类理由，并且如果有其他可能的类别，也请一并列出。谢谢！
```

**优化后**：

```
分类交易:
- 描述: 星巴克咖啡
- 金额: 30元
- 日期: 2023-05-15

返回JSON格式:
{"category":"类别名","confidence":0.9,"reason":"简短理由"}
```

### Token计数工具

实现token计数工具以监控token使用情况：

```typescript
// server/src/utils/token-counter.ts
import { encoding_for_model } from '@dqbd/tiktoken';

export function countTokens(text: string, model: string = 'gpt-3.5-turbo'): number {
  try {
    const encoder = encoding_for_model(model);
    const tokens = encoder.encode(text);
    encoder.free();
    return tokens.length;
  } catch (error) {
    console.error('Token counting error:', error);
    // 回退到简单估计: 平均每个token约4个字符
    return Math.ceil(text.length / 4);
  }
}

export function estimateCost(promptTokens: number, responseTokens: number, model: string = 'gpt-3.5-turbo'): number {
  // 价格可能变动，应定期更新
  const prices = {
    'gpt-3.5-turbo': {
      prompt: 0.0015, // 每1000 tokens
      response: 0.002  // 每1000 tokens
    },
    'gpt-4': {
      prompt: 0.03,    // 每1000 tokens
      response: 0.06   // 每1000 tokens
    }
  };
  
  const modelPrices = prices[model] || prices['gpt-3.5-turbo'];
  
  const promptCost = (promptTokens / 1000) * modelPrices.prompt;
  const responseCost = (responseTokens / 1000) * modelPrices.response;
  
  return promptCost + responseCost;
}
```

## 模型选择策略

根据任务复杂性选择适当的模型可以优化成本。

### 模型分级

1. **基础任务**：使用gpt-3.5-turbo等较经济的模型
   - 简单分类
   - 基础文本生成
   - 格式转换

2. **复杂任务**：使用gpt-4等高级模型
   - 复杂推理
   - 财务分析
   - 多步骤规划

### 自适应模型选择

实现自适应模型选择逻辑：

```typescript
// server/src/services/model-selector.service.ts
export enum TaskComplexity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export class ModelSelectorService {
  // 根据任务复杂性选择模型
  selectModel(taskComplexity: TaskComplexity, userTier: string = 'standard'): string {
    // 考虑用户等级
    if (userTier === 'premium') {
      return this.selectPremiumModel(taskComplexity);
    }
    
    // 标准用户的模型选择
    switch (taskComplexity) {
      case TaskComplexity.LOW:
        return 'gpt-3.5-turbo';
      case TaskComplexity.MEDIUM:
        return 'gpt-3.5-turbo-16k';
      case TaskComplexity.HIGH:
        return 'gpt-4';
      default:
        return 'gpt-3.5-turbo';
    }
  }
  
  // 高级用户的模型选择
  private selectPremiumModel(taskComplexity: TaskComplexity): string {
    switch (taskComplexity) {
      case TaskComplexity.LOW:
        return 'gpt-3.5-turbo-16k';
      case TaskComplexity.MEDIUM:
      case TaskComplexity.HIGH:
        return 'gpt-4';
      default:
        return 'gpt-3.5-turbo-16k';
    }
  }
  
  // 估计任务复杂性
  estimateTaskComplexity(
    promptLength: number,
    requiresReasoning: boolean,
    multiStep: boolean
  ): TaskComplexity {
    let score = 0;
    
    // 根据提示长度评分
    if (promptLength > 1000) score += 2;
    else if (promptLength > 500) score += 1;
    
    // 根据是否需要推理评分
    if (requiresReasoning) score += 2;
    
    // 根据是否多步骤评分
    if (multiStep) score += 2;
    
    // 根据总分确定复杂性
    if (score >= 4) return TaskComplexity.HIGH;
    if (score >= 2) return TaskComplexity.MEDIUM;
    return TaskComplexity.LOW;
  }
}
```

## 用户限制策略

实施合理的用户使用限制可以控制成本。

### 限制方法

1. **配额限制**：限制每个用户的API调用次数
2. **频率限制**：限制API调用的频率
3. **复杂度限制**：限制复杂查询的使用
4. **分级访问**：根据用户等级提供不同的访问级别

### 实现示例

```typescript
// server/src/middlewares/ai-rate-limiter.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';

// 创建Redis客户端
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.connect();

// 创建不同的限制器
const aiLimiters = {
  // 基础AI功能限制器
  basic: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'ratelimit:ai:basic',
    points: 50,              // 50次请求
    duration: 60 * 60 * 24,  // 每24小时
  }),
  
  // 高级AI功能限制器
  advanced: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'ratelimit:ai:advanced',
    points: 20,              // 20次请求
    duration: 60 * 60 * 24,  // 每24小时
  }),
  
  // 高频率限制器（防止短时间内大量请求）
  burst: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'ratelimit:ai:burst',
    points: 5,               // 5次请求
    duration: 60,            // 每分钟
  })
};

// 中间件工厂函数
export function aiRateLimiter(type: 'basic' | 'advanced' | 'burst' = 'basic') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 获取用户ID
      const userId = req.user?.id || req.ip;
      
      // 检查用户等级，高级用户可能有更高的限制
      const userTier = req.user?.tier || 'standard';
      
      // 高级用户可能有更高的限制
      let limiter = aiLimiters[type];
      let pointsToConsume = 1;
      
      if (userTier === 'premium') {
        // 高级用户消耗更少的点数
        pointsToConsume = 0.5;
      }
      
      // 尝试消耗点数
      await limiter.consume(userId, pointsToConsume);
      next();
    } catch (error) {
      // 如果超出限制，返回429错误
      if (error.name === 'RateLimiterRes') {
        return res.status(429).json({
          error: {
            message: 'AI功能使用次数已达上限，请稍后再试或升级账户',
            retryAfter: Math.round(error.msBeforeNext / 1000) || 60
          }
        });
      }
      
      // 其他错误
      next(error);
    }
  };
}
```

### 使用示例

```typescript
// 在路由中使用限制器
router.post(
  '/api/ai/classify-transaction',
  authenticate,
  aiRateLimiter('basic'),
  aiRateLimiter('burst'),
  transactionController.classifyTransaction
);

router.get(
  '/api/ai/financial-health',
  authenticate,
  aiRateLimiter('advanced'),
  aiRateLimiter('burst'),
  financialHealthController.getFinancialHealth
);
```

## 资源监控

监控和分析API使用情况对于成本控制至关重要。

### 监控指标

1. **API调用次数**：按用户、功能和时间段统计
2. **Token消耗**：按提示和响应分别统计
3. **缓存命中率**：缓存的有效性指标
4. **错误率**：需要重试的请求比例
5. **成本趋势**：成本随时间的变化趋势

### 实现示例

```typescript
// server/src/services/ai-usage-tracker.service.ts
import { PrismaClient } from '@server/prisma/client';
import { countTokens } from '../utils/token-counter';

export class AIUsageTrackerService {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  // 记录API调用
  async trackAPICall(
    userId: string,
    feature: string,
    model: string,
    prompt: string,
    response: string,
    cacheHit: boolean = false,
    error: boolean = false
  ) {
    // 计算token
    const promptTokens = countTokens(prompt, model);
    const responseTokens = error ? 0 : countTokens(response, model);
    
    // 记录使用情况
    await this.prisma.aiUsage.create({
      data: {
        userId,
        feature,
        model,
        promptTokens,
        responseTokens,
        cacheHit,
        error,
        timestamp: new Date()
      }
    });
  }
  
  // 获取用户使用统计
  async getUserUsageStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 查询使用记录
    const usageRecords = await this.prisma.aiUsage.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate
        }
      }
    });
    
    // 计算统计数据
    const totalCalls = usageRecords.length;
    const totalPromptTokens = usageRecords.reduce((sum, record) => sum + record.promptTokens, 0);
    const totalResponseTokens = usageRecords.reduce((sum, record) => sum + record.responseTokens, 0);
    const cacheHits = usageRecords.filter(record => record.cacheHit).length;
    const errors = usageRecords.filter(record => record.error).length;
    
    // 按功能分组
    const featureUsage = {};
    usageRecords.forEach(record => {
      if (!featureUsage[record.feature]) {
        featureUsage[record.feature] = {
          calls: 0,
          promptTokens: 0,
          responseTokens: 0
        };
      }
      
      featureUsage[record.feature].calls++;
      featureUsage[record.feature].promptTokens += record.promptTokens;
      featureUsage[record.feature].responseTokens += record.responseTokens;
    });
    
    return {
      totalCalls,
      totalPromptTokens,
      totalResponseTokens,
      cacheHitRate: totalCalls > 0 ? cacheHits / totalCalls : 0,
      errorRate: totalCalls > 0 ? errors / totalCalls : 0,
      featureUsage
    };
  }
  
  // 获取系统级使用统计
  async getSystemUsageStats(days: number = 30) {
    // 类似于getUserUsageStats，但不过滤用户
    // ...
  }
}
```

## 成本预测与预算

实施成本预测和预算控制机制。

### 预测方法

1. **历史趋势分析**：基于历史使用数据预测未来成本
2. **用户增长模型**：考虑用户增长对成本的影响
3. **季节性调整**：考虑使用模式的季节性变化

### 预算控制

1. **成本预警**：当成本接近预算时发出警报
2. **自动降级**：当接近预算上限时自动降级服务
3. **动态限制**：根据当前成本动态调整用户限制

## 最佳实践总结

1. **分层优化**：从提示优化、缓存到用户限制，实施多层次优化
2. **数据驱动**：基于使用数据持续优化成本策略
3. **用户体验平衡**：在成本控制和用户体验之间找到平衡
4. **持续监控**：实时监控API使用情况和成本
5. **定期审查**：定期审查成本策略的有效性
6. **透明沟通**：向用户清晰传达使用限制和原因
