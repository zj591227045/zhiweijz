# 只为记账 - LLM提供商集成指南

本文档提供了在"只为记账"项目中集成新的LLM提供商的详细指南，包括实现提供商接口、注册提供商和使用提供商。

## 1. LLM提供商接口

所有LLM提供商必须实现`LLMProvider`接口：

```typescript
export interface LLMProvider {
  /** 提供商名称 */
  name: string;

  /**
   * 获取LLM模型实例
   * @param options LLM提供商选项
   * @returns LLM模型实例
   */
  getModel(options: LLMProviderOptions): any;

  /**
   * 生成文本
   * @param prompt 提示文本
   * @param options LLM提供商选项
   * @returns 生成的文本
   */
  generateText(prompt: string, options: LLMProviderOptions): Promise<string>;

  /**
   * 生成聊天响应
   * @param messages 消息数组
   * @param options LLM提供商选项
   * @returns 生成的响应
   */
  generateChat(messages: Message[], options: LLMProviderOptions): Promise<string>;
}
```

## 2. 实现新的LLM提供商

### 2.1 创建提供商类

创建一个新的提供商类，实现`LLMProvider`接口：

```typescript
// server/src/ai/llm/anthropic-provider.ts
import { LLMProvider } from './llm-provider';
import { LLMProviderOptions, Message } from '../types/llm-types';

/**
 * Anthropic提供商实现
 * 实现了LLMProvider接口，提供Anthropic Claude API的调用方法
 */
export class AnthropicProvider implements LLMProvider {
  /** 提供商名称 */
  public name = 'anthropic';

  /**
   * 获取Anthropic模型实例
   * @param options LLM提供商选项
   * @returns Anthropic模型实例
   */
  public getModel(options: LLMProviderOptions): any {
    // 需要安装@langchain/anthropic依赖
    // 这里使用ChatAnthropic类
    return {
      apiKey: options.apiKey,
      modelName: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };
  }

  /**
   * 生成文本
   * @param prompt 提示文本
   * @param options LLM提供商选项
   * @returns 生成的文本
   */
  public async generateText(prompt: string, options: LLMProviderOptions): Promise<string> {
    // 这里需要实际调用Anthropic API
    // 暂时返回一个模拟的响应
    console.log(`[Anthropic] Generating text with prompt: ${prompt.substring(0, 50)}...`);
    return `This is a mock response from Anthropic for prompt: ${prompt.substring(0, 20)}...`;
  }

  /**
   * 生成聊天响应
   * @param messages 消息数组
   * @param options LLM提供商选项
   * @returns 生成的响应
   */
  public async generateChat(messages: Message[], options: LLMProviderOptions): Promise<string> {
    // 这里需要实际调用Anthropic API
    // 暂时返回一个模拟的响应
    console.log(`[Anthropic] Generating chat response with ${messages.length} messages`);
    return `This is a mock chat response from Anthropic`;
  }
}
```

### 2.2 实现实际的API调用

使用LangChain的Anthropic集成实现实际的API调用：

```typescript
import { ChatAnthropic } from 'langchain/chat_models/anthropic';
import { HumanMessage, SystemMessage, AIMessage } from 'langchain/schema';

/**
 * 生成聊天响应
 * @param messages 消息数组
 * @param options LLM提供商选项
 * @returns 生成的响应
 */
public async generateChat(messages: Message[], options: LLMProviderOptions): Promise<string> {
  try {
    // 创建Anthropic模型实例
    const model = new ChatAnthropic({
      apiKey: options.apiKey,
      modelName: options.model || 'claude-2',
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });
    
    // 转换消息格式
    const langchainMessages = messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
    
    // 调用API
    const response = await model.invoke(langchainMessages);
    
    // 返回响应内容
    return response.content.toString();
  } catch (error) {
    console.error('[Anthropic] Error generating chat response:', error);
    throw error;
  }
}
```

## 3. 注册LLM提供商

### 3.1 在LLMProviderService中注册提供商

修改`LLMProviderService`类，注册新的提供商：

```typescript
// server/src/ai/llm/llm-provider-service.ts
import { AnthropicProvider } from './anthropic-provider';

/**
 * 构造函数
 * 注册默认提供商
 */
constructor() {
  // 注册OpenAI提供商
  this.registerProvider(new OpenAIProvider());
  
  // 注册Anthropic提供商
  this.registerProvider(new AnthropicProvider());
}
```

### 3.2 动态注册提供商

在应用启动时动态注册提供商：

```typescript
// server/src/server.ts
import { createAIService } from './ai';
import { AnthropicProvider } from './ai/llm/anthropic-provider';

// 创建AI服务
const aiService = createAIService();

// 注册Anthropic提供商
aiService.llmProviderService.registerProvider(new AnthropicProvider());
```

## 4. 使用LLM提供商

### 4.1 设置用户的LLM提供商

更新用户的LLM设置，使用新的提供商：

```typescript
// 更新用户LLM设置
await aiService.llmProviderService.updateUserLLMSettings(userId, {
  provider: 'anthropic',
  apiKey: 'your-anthropic-api-key',
  model: 'claude-2',
  temperature: 0.7,
});
```

### 4.2 设置账本的LLM提供商

更新账本的LLM设置，使用新的提供商：

```typescript
// 更新账本LLM设置
await aiService.llmProviderService.updateAccountLLMSettings(
  accountId,
  'personal',
  {
    provider: 'anthropic',
    apiKey: 'your-anthropic-api-key',
    model: 'claude-2',
    temperature: 0.7,
  }
);
```

### 4.3 直接使用提供商

直接获取并使用提供商：

```typescript
// 获取Anthropic提供商
const anthropicProvider = aiService.llmProviderService.getProvider('anthropic');

// 使用提供商生成文本
const response = await anthropicProvider.generateText(
  '写一段关于人工智能的简短介绍',
  {
    apiKey: 'your-anthropic-api-key',
    model: 'claude-2',
    temperature: 0.7,
  }
);

console.log(response);
```

## 5. 支持的LLM提供商

### 5.1 OpenAI

OpenAI提供商支持GPT-3.5和GPT-4系列模型：

```typescript
// 更新用户LLM设置为OpenAI
await aiService.llmProviderService.updateUserLLMSettings(userId, {
  provider: 'openai',
  apiKey: 'your-openai-api-key',
  model: 'gpt-4',
  temperature: 0.7,
});
```

### 5.2 Anthropic

Anthropic提供商支持Claude系列模型：

```typescript
// 更新用户LLM设置为Anthropic
await aiService.llmProviderService.updateUserLLMSettings(userId, {
  provider: 'anthropic',
  apiKey: 'your-anthropic-api-key',
  model: 'claude-2',
  temperature: 0.7,
});
```

### 5.3 其他兼容OpenAI API的提供商

对于兼容OpenAI API的提供商，可以使用OpenAI提供商并修改API基础URL：

```typescript
// 更新用户LLM设置为兼容OpenAI API的提供商
await aiService.llmProviderService.updateUserLLMSettings(userId, {
  provider: 'openai',
  apiKey: 'your-api-key',
  model: 'your-model',
  temperature: 0.7,
  baseUrl: 'https://your-api-endpoint.com/v1',
});
```

## 6. 添加新提供商的步骤总结

1. **创建提供商类**：实现`LLMProvider`接口
2. **安装必要的依赖**：如`@langchain/anthropic`
3. **实现API调用**：使用LangChain的集成
4. **注册提供商**：在`LLMProviderService`中注册
5. **更新用户/账本设置**：设置使用新的提供商
6. **测试提供商**：确保API调用正常工作

## 7. 最佳实践

### 7.1 API密钥管理

安全地管理API密钥：

1. 使用环境变量存储默认API密钥
2. 在数据库中加密存储用户的API密钥
3. 使用密钥轮换机制定期更新API密钥

### 7.2 错误处理

妥善处理API错误：

```typescript
try {
  const response = await model.invoke(messages);
  return response.content.toString();
} catch (error) {
  // 处理特定错误
  if (error.response && error.response.status === 429) {
    console.error('[Anthropic] Rate limit exceeded:', error);
    throw new Error('API rate limit exceeded. Please try again later.');
  }
  
  // 处理通用错误
  console.error('[Anthropic] Error generating chat response:', error);
  throw new Error('Failed to generate response. Please try again later.');
}
```

### 7.3 模型参数优化

根据不同提供商优化模型参数：

```typescript
// 根据提供商调整默认参数
switch (provider) {
  case 'anthropic':
    return {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
    };
  case 'openai':
    return {
      temperature: 0.7,
      maxTokens: 1000,
      presencePenalty: 0.1,
      frequencyPenalty: 0.1,
    };
  default:
    return {
      temperature: 0.7,
      maxTokens: 1000,
    };
}
```
