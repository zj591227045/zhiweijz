# 只为记账 - LangGraph开发规范

本文档定义了在"只为记账"项目中使用LangGraph进行AI功能开发的标准化规范，包括开发规范、调用规范和最佳实践。

## 1. 目录结构

```
server/src/ai/
  ├── langgraph/                # LangGraph工作流
  │   ├── base-workflow.ts      # 基础工作流类
  │   ├── workflow-manager.ts   # 工作流管理器
  │   └── [feature]-workflow.ts # 特定功能的工作流
  ├── llm/                      # LLM提供商服务
  │   ├── llm-provider.ts       # LLM提供商接口
  │   ├── openai-provider.ts    # OpenAI实现
  │   └── llm-provider-service.ts # LLM提供商服务
  ├── prompts/                  # 提示模板
  │   ├── base-prompts.ts       # 基础提示模板
  │   └── [feature]-prompts.ts  # 特定功能的提示模板
  ├── types/                    # 类型定义
  │   ├── llm-types.ts          # LLM相关类型
  │   └── workflow-types.ts     # 工作流相关类型
  └── index.ts                  # 导出模块
```

## 2. LLM提供商开发规范

### 2.1 提供商接口

所有LLM提供商必须实现`LLMProvider`接口：

```typescript
export interface LLMProvider {
  name: string;
  
  getModel(options: LLMProviderOptions): any;
  
  generateText(prompt: string, options: LLMProviderOptions): Promise<string>;
  
  generateChat(messages: Message[], options: LLMProviderOptions): Promise<string>;
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
    return response.content.toString();
  }
  
  public async generateChat(messages: Message[], options: LLMProviderOptions): Promise<string> {
    const model = this.getModel(options);
    const response = await model.invoke(messages);
    return response.content.toString();
  }
}
```

### 2.3 注册提供商

在`LLMProviderService`中注册新的提供商：

```typescript
constructor() {
  // 注册OpenAI提供商
  this.registerProvider(new OpenAIProvider());
  
  // 注册其他提供商
  this.registerProvider(new AnthropicProvider());
}
```

## 3. LangGraph工作流开发规范

### 3.1 工作流结构

每个LangGraph工作流应继承`BaseWorkflow`类并实现必要的方法：

```typescript
export class MyWorkflow extends BaseWorkflow<MyWorkflowState> {
  constructor(
    llmProviderService: LLMProviderService,
    config: WorkflowConfig = {
      name: 'my-workflow',
      defaultProvider: 'openai',
      defaultModel: 'gpt-3.5-turbo',
      defaultTemperature: 0.7,
    }
  ) {
    super(llmProviderService, config);
  }
  
  protected createWorkflow() {
    // 创建LangGraph工作流
    // ...
  }
  
  public async run(initialState: Partial<MyWorkflowState>): Promise<MyWorkflowState> {
    // 运行工作流
    // ...
  }
}
```

### 3.2 工作流状态

每个工作流应定义自己的状态接口，继承自`WorkflowState`：

```typescript
export interface MyWorkflowState extends WorkflowState {
  input1: string;
  input2: number;
  // ...
  output?: string;
}
```

### 3.3 注册工作流

在`WorkflowManager`中注册新的工作流：

```typescript
private registerDefaultWorkflows(): void {
  // 注册现有工作流
  // ...
  
  // 注册新工作流
  const myWorkflowConfig: WorkflowConfig = {
    name: 'my-workflow',
    description: '我的工作流',
    defaultProvider: 'openai',
    defaultModel: 'gpt-3.5-turbo',
    defaultTemperature: 0.7,
  };
  
  this.registerWorkflowConfig('my-workflow', myWorkflowConfig);
  this.registerWorkflow('my-workflow', new MyWorkflow(this.llmProviderService, myWorkflowConfig));
}
```

## 4. 提示模板开发规范

### 4.1 提示模板结构

提示模板应遵循以下结构：

```typescript
export const MY_PROMPTS: Record<string, PromptTemplate> = {
  myPrompt: {
    name: 'myPrompt',
    description: '我的提示模板',
    systemMessage: '系统消息...',
    userMessageTemplate: '用户消息模板，包含{placeholder}...',
    exampleInput: { placeholder: '示例值' },
    exampleOutput: '示例输出...',
  },
};
```

### 4.2 使用提示模板

在工作流中使用提示模板：

```typescript
import { MY_PROMPTS } from '../prompts/my-prompts';

// ...

const promptTemplate = MY_PROMPTS.myPrompt;
const userMessage = promptTemplate.userMessageTemplate.replace(
  '{placeholder}',
  state.input
);

const messages = [
  { role: 'system', content: promptTemplate.systemMessage },
  { role: 'user', content: userMessage },
];

const response = await this.llmProviderService.generateChat(
  messages,
  state.userId,
  state.accountId,
  state.accountType
);
```

## 5. 调用规范

### 5.1 创建AI服务

在应用中使用AI功能时，应首先创建AI服务：

```typescript
import { createAIService } from '../ai';

const aiService = createAIService();
```

### 5.2 运行工作流

使用AI服务运行工作流：

```typescript
// 运行简单工作流
const result = await aiService.runSimpleWorkflow(
  '用户输入',
  userId,
  {
    promptTemplate: '提示模板',
    systemMessage: '系统消息',
    accountId: accountId,
    accountType: 'personal',
  }
);

console.log(result.output);
```

### 5.3 自定义工作流

使用工作流管理器运行自定义工作流：

```typescript
// 获取自定义工作流
const myWorkflow = aiService.workflowManager.getWorkflow<MyWorkflowState>('my-workflow');

// 运行自定义工作流
const result = await myWorkflow.run({
  input1: 'value1',
  input2: 123,
  userId: userId,
  accountId: accountId,
  accountType: 'personal',
});

console.log(result.output);
```

## 6. 最佳实践

### 6.1 错误处理

所有工作流应妥善处理错误：

```typescript
try {
  // 工作流逻辑
} catch (error) {
  return this.handleError(error, state);
}
```

### 6.2 日志记录

在关键步骤添加日志记录：

```typescript
console.log(`[${this.config.name}] Processing input: ${state.input.substring(0, 50)}...`);
```

### 6.3 缓存结果

对于计算密集型或频繁调用的工作流，考虑缓存结果：

```typescript
const cacheKey = `${workflowName}:${JSON.stringify(initialState)}`;
const cachedResult = await cache.get(cacheKey);

if (cachedResult) {
  return cachedResult;
}

const result = await workflow.run(initialState);
await cache.set(cacheKey, result, 3600); // 缓存1小时

return result;
```

### 6.4 批处理请求

对于多个相似请求，考虑批处理：

```typescript
const batchResults = await Promise.all([
  workflow.run(state1),
  workflow.run(state2),
  workflow.run(state3),
]);
```

### 6.5 提示优化

定期优化提示模板以提高质量并减少token消耗：

1. 使用清晰、简洁的指令
2. 提供良好的示例
3. 指定所需的输出格式
4. 避免不必要的上下文
