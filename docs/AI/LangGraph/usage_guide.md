# 只为记账 - LangGraph使用指南

本文档提供了在"只为记账"项目中使用LangGraph AI功能的详细指南，包括安装依赖、基本用法和高级功能。

## 1. 安装依赖

在使用LangGraph功能之前，需要安装以下依赖：

```bash
# 安装LangGraph和LangChain
npm install @langchain/core @langchain/openai langchain langgraph

# 安装其他可选依赖
npm install @langchain/anthropic # 如果需要使用Anthropic Claude
npm install node-cache # 如果需要使用缓存功能
```

## 2. 基本用法

### 2.1 创建AI服务

在应用中使用AI功能时，首先需要创建AI服务：

```typescript
import { createAIService } from '../ai';

// 创建AI服务
const aiService = createAIService();
```

### 2.2 运行简单工作流

使用简单工作流进行基本的文本生成：

```typescript
// 运行简单工作流
const result = await aiService.runSimpleWorkflow(
  '写一段关于人工智能的简短介绍',
  userId
);

console.log(result.output);
```

### 2.3 使用提示模板

结合提示模板使用简单工作流：

```typescript
import { BASE_PROMPTS } from '../ai/prompts/base-prompts';

// 获取提示模板
const promptTemplate = BASE_PROMPTS.textGeneration;

// 运行简单工作流
const result = await aiService.runSimpleWorkflow(
  '写一段关于人工智能的简短介绍',
  userId,
  {
    systemMessage: promptTemplate.systemMessage,
    promptTemplate: promptTemplate.userMessageTemplate,
  }
);

console.log(result.output);
```

## 3. 高级用法

### 3.1 自定义LLM提供商

注册并使用自定义LLM提供商：

```typescript
import { AnthropicProvider } from './anthropic-provider';

// 注册Anthropic提供商
aiService.llmProviderService.registerProvider(new AnthropicProvider());

// 更新用户LLM设置
await aiService.llmProviderService.updateUserLLMSettings(userId, {
  provider: 'anthropic',
  apiKey: 'your-anthropic-api-key',
  model: 'claude-2',
  temperature: 0.7,
});

// 现在，所有针对该用户的AI请求都将使用Anthropic Claude
```

### 3.2 自定义工作流

创建并注册自定义工作流：

```typescript
import { BaseWorkflow } from '../ai/langgraph/base-workflow';
import { WorkflowState } from '../ai/types/workflow-types';

// 定义工作流状态
interface MyWorkflowState extends WorkflowState {
  input1: string;
  input2: number;
  output?: string;
}

// 创建自定义工作流
class MyWorkflow extends BaseWorkflow<MyWorkflowState> {
  // 实现工作流逻辑
  // ...
}

// 注册自定义工作流
const myWorkflowConfig = {
  name: 'my-workflow',
  description: '我的自定义工作流',
  defaultProvider: 'openai',
  defaultModel: 'gpt-3.5-turbo',
  defaultTemperature: 0.7,
};

aiService.workflowManager.registerWorkflowConfig('my-workflow', myWorkflowConfig);
aiService.workflowManager.registerWorkflow('my-workflow', new MyWorkflow(aiService.llmProviderService, myWorkflowConfig));

// 使用自定义工作流
const myWorkflow = aiService.workflowManager.getWorkflow<MyWorkflowState>('my-workflow');
const result = await myWorkflow.run({
  input1: 'value1',
  input2: 123,
  userId: userId,
});

console.log(result.output);
```

### 3.3 账本级别的LLM设置

为特定账本设置LLM提供商：

```typescript
// 更新账本LLM设置
await aiService.llmProviderService.updateAccountLLMSettings(
  accountId,
  'personal',
  {
    provider: 'openai',
    apiKey: 'your-openai-api-key',
    model: 'gpt-4',
    temperature: 0.5,
  }
);

// 现在，所有针对该账本的AI请求都将使用OpenAI GPT-4
```

## 4. 实际应用示例

### 4.1 智能交易分类

使用AI自动分类交易：

```typescript
import { ACCOUNTING_PROMPTS } from '../ai/prompts/accounting-prompts';

// 获取交易分类提示模板
const promptTemplate = ACCOUNTING_PROMPTS.transactionClassification;

// 准备提示
const prompt = promptTemplate.userMessageTemplate
  .replace('{description}', '星巴克咖啡')
  .replace('{amount}', '35')
  .replace('{date}', '2023-05-15')
  .replace('{categories}', '1. 餐饮 2. 购物 3. 交通 4. 娱乐');

// 运行简单工作流
const result = await aiService.runSimpleWorkflow(
  prompt,
  userId,
  {
    systemMessage: promptTemplate.systemMessage,
  }
);

// 解析结果
const classification = JSON.parse(result.output);
console.log(`分类: ${classification.categoryId}, 置信度: ${classification.confidence}`);
```

### 4.2 预算建议

使用AI生成预算建议：

```typescript
import { ACCOUNTING_PROMPTS } from '../ai/prompts/accounting-prompts';

// 获取预算建议提示模板
const promptTemplate = ACCOUNTING_PROMPTS.budgetSuggestion;

// 准备提示
const prompt = promptTemplate.userMessageTemplate
  .replace('{spendingData}', '餐饮: 平均每月2000元\n购物: 平均每月1500元\n交通: 平均每月800元\n娱乐: 平均每月1200元')
  .replace('{income}', '10000')
  .replace('{savingsGoal}', '每月储蓄2000元');

// 运行简单工作流
const result = await aiService.runSimpleWorkflow(
  prompt,
  userId,
  {
    systemMessage: promptTemplate.systemMessage,
  }
);

console.log(result.output);
```

### 4.3 智能记账

使用AI从自然语言描述中提取交易信息：

```typescript
import { ACCOUNTING_PROMPTS } from '../ai/prompts/accounting-prompts';

// 获取智能记账提示模板
const promptTemplate = ACCOUNTING_PROMPTS.smartAccounting;

// 准备提示
const prompt = promptTemplate.userMessageTemplate
  .replace('{input}', '昨天在沃尔玛买了日用品，花了128.5元')
  .replace('{categories}', '1. 餐饮 2. 购物 3. 日用 4. 交通');

// 运行简单工作流
const result = await aiService.runSimpleWorkflow(
  prompt,
  userId,
  {
    systemMessage: promptTemplate.systemMessage,
  }
);

// 解析结果
const transaction = JSON.parse(result.output);
console.log(`金额: ${transaction.amount}, 类别: ${transaction.categoryId}, 日期: ${transaction.date}, 备注: ${transaction.note}`);
```

## 5. 性能优化

### 5.1 缓存结果

对于频繁调用的工作流，可以使用缓存来提高性能：

```typescript
import NodeCache from 'node-cache';

// 创建缓存
const cache = new NodeCache({ stdTTL: 3600 }); // 默认缓存1小时

// 使用缓存
const cacheKey = `simple-workflow:${input}:${userId}`;
const cachedResult = cache.get(cacheKey);

if (cachedResult) {
  return cachedResult;
}

const result = await aiService.runSimpleWorkflow(input, userId);
cache.set(cacheKey, result);

return result;
```

### 5.2 批处理请求

对于多个相似请求，可以使用批处理来减少API调用：

```typescript
// 批处理多个请求
const results = await Promise.all([
  aiService.runSimpleWorkflow('请求1', userId),
  aiService.runSimpleWorkflow('请求2', userId),
  aiService.runSimpleWorkflow('请求3', userId),
]);
```

## 6. 故障排除

### 6.1 常见错误

1. **API密钥错误**：确保在环境变量或数据库中设置了正确的API密钥
2. **提供商不存在**：确保已注册所需的LLM提供商
3. **工作流不存在**：确保已注册所需的工作流
4. **响应格式错误**：检查提示模板和系统消息是否正确指定了输出格式

### 6.2 调试技巧

1. 启用详细日志记录：

```typescript
// 在工作流中添加日志
console.log(`[${this.config.name}] Input:`, state.input);
console.log(`[${this.config.name}] Output:`, result);
```

2. 检查API响应：

```typescript
// 在LLM提供商中添加日志
console.log(`[${this.name}] API Response:`, response);
```

3. 使用try-catch捕获错误：

```typescript
try {
  const result = await aiService.runSimpleWorkflow(input, userId);
  console.log(result);
} catch (error) {
  console.error('Error running workflow:', error);
}
```
