import { logger } from '../../utils/logger';
import { ChatOpenAI } from '@langchain/openai';
import { LLMProvider } from './llm-provider';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Message, LLMResponse, LLMProviderOptions } from '../types/llm-types';

/**
 * 火山方舟提供商实现
 * 实现了LLMProvider接口，提供火山方舟API的调用方法
 * 使用OpenAI兼容API
 */
export class VolcengineProvider implements LLMProvider {
  /** 提供商名称 */
  public name = 'volcengine';

  /** 默认基础URL */
  private readonly defaultBaseUrl = 'https://ark.cn-beijing.volces.com/api/v3';

  /** 默认模型 */
  private readonly defaultModel = 'ep-20241217-xxxxx'; // 用户需要配置实际的接入点ID

  /** 支持的模型列表 */
  private readonly supportedModels = [
    'ep-20241217-xxxxx', // 豆包-pro-4k (示例)
    'ep-20241217-yyyyy', // 豆包-pro-32k (示例)
    'ep-20241217-zzzzz', // 豆包-lite-4k (示例)
    'ep-20241217-aaaaa', // 豆包-lite-32k (示例)
    'ep-20241217-bbbbb', // 豆包-pro-128k (示例)
    'doubao-1-5-lite-32k-250115', // 用户实际模型
    'ep-20250112212411-2kbkh', // 用户实际模型
  ];

  /**
   * 获取火山方舟模型实例
   * @param options LLM提供商选项
   * @returns 火山方舟模型实例
   */
  public getModel(options: LLMProviderOptions): any {
    const modelConfig: any = {
      apiKey: options.apiKey,
      modelName: options.model || this.defaultModel,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      configuration: {
        baseURL: options.baseUrl || this.defaultBaseUrl,
      },
    };

    return new ChatOpenAI(modelConfig);
  }

  /**
   * 生成文本
   * @param prompt 提示文本
   * @param options LLM提供商选项
   * @returns 生成的文本
   */
  public async generateText(prompt: string, options: LLMProviderOptions): Promise<string> {
    try {
      const model = this.getModel(options);
      const response = await model.invoke(prompt);
      return response.content;
    } catch (error) {
      logger.error('火山方舟文本生成失败:', error);
      throw new Error(`火山方舟文本生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 生成聊天响应
   * @param messages 消息数组
   * @param options LLM提供商选项
   * @returns 生成的响应
   */
  public async generateChat(messages: Message[], options: LLMProviderOptions): Promise<string> {
    try {
      const model = this.getModel(options);
      
      // 转换消息格式
      const langchainMessages = messages.map((msg) => {
        switch (msg.role) {
          case 'system':
            return new SystemMessage(msg.content);
          case 'user':
            return new HumanMessage(msg.content);
          case 'assistant':
            return new HumanMessage(msg.content); // 火山方舟可能需要特殊处理
          default:
            return new HumanMessage(msg.content);
        }
      });

      const response = await model.invoke(langchainMessages);
      return response.content;
    } catch (error) {
      logger.error('火山方舟聊天生成失败:', error);
      throw new Error(`火山方舟聊天生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 生成文本（带token使用量信息）
   * @param prompt 提示文本
   * @param options LLM提供商选项
   * @returns 生成的文本和token使用量信息
   */
  public async generateTextWithUsage(prompt: string, options: LLMProviderOptions): Promise<LLMResponse> {
    try {
      const model = this.getModel(options);
      const response = await model.invoke(prompt);
      
      // 火山方舟API可能返回usage信息，这里需要根据实际API响应调整
      const usage = response.response_metadata?.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      return {
        content: response.content,
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        },
      };
    } catch (error) {
      logger.error('火山方舟文本生成（带使用量）失败:', error);
      throw new Error(`火山方舟文本生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 生成聊天响应（带token使用量信息）
   * @param messages 消息数组
   * @param options LLM提供商选项
   * @returns 生成的响应和token使用量信息
   */
  public async generateChatWithUsage(messages: Message[], options: LLMProviderOptions): Promise<LLMResponse> {
    try {
      const model = this.getModel(options);
      
      // 转换消息格式
      const langchainMessages = messages.map((msg) => {
        switch (msg.role) {
          case 'system':
            return new SystemMessage(msg.content);
          case 'user':
            return new HumanMessage(msg.content);
          case 'assistant':
            return new HumanMessage(msg.content);
          default:
            return new HumanMessage(msg.content);
        }
      });

      const response = await model.invoke(langchainMessages);
      
      // 火山方舟API可能返回usage信息
      const usage = response.response_metadata?.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      return {
        content: response.content,
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        },
      };
    } catch (error) {
      logger.error('火山方舟聊天生成（带使用量）失败:', error);
      throw new Error(`火山方舟聊天生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取支持的模型列表
   * @returns 支持的模型列表
   */
  public getSupportedModels(): string[] {
    return [...this.supportedModels];
  }

  /**
   * 验证API密钥格式
   * @param apiKey API密钥
   * @returns 是否有效
   */
  public validateApiKey(apiKey: string): boolean {
    // 火山方舟API密钥格式验证
    // 通常是以特定前缀开头的字符串
    return !!(apiKey && apiKey.length > 10);
  }

  /**
   * 获取默认配置
   * @returns 默认配置
   */
  public getDefaultConfig(): Partial<LLMProviderOptions> {
    return {
      model: this.defaultModel,
      temperature: 0.7,
      maxTokens: 1000,
      baseUrl: this.defaultBaseUrl,
    };
  }
}
