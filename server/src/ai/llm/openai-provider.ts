import { ChatOpenAI } from '@langchain/openai';
import { LLMProvider } from './llm-provider';
import { LLMProviderOptions, Message } from '../types/llm-types';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

/**
 * OpenAI提供商实现
 * 实现了LLMProvider接口，提供OpenAI API的调用方法
 */
export class OpenAIProvider implements LLMProvider {
  /** 提供商名称 */
  public name = 'openai';

  /**
   * 获取OpenAI模型实例
   * @param options LLM提供商选项
   * @returns OpenAI模型实例
   */
  public getModel(options: LLMProviderOptions): any {
    const modelConfig: any = {
      apiKey: options.apiKey,
      modelName: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };

    // 如果提供了自定义基础URL，使用它
    if (options.baseUrl) {
      modelConfig.configuration = {
        baseURL: options.baseUrl
      };
    }

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
      return response.content.toString();
    } catch (error) {
      console.error('[OpenAI] 生成文本时出错:', error);
      throw error;
    }
  }

  /**
   * 生成聊天响应
   * @param messages 消息数组
   * @param options LLM提供商选项
   * @returns 生成的响应
   */
  public async generateChat(messages: Message[] | BaseMessage[], options: LLMProviderOptions): Promise<string> {
    try {
      const model = this.getModel(options);

      // 检查消息类型，如果是我们自己的Message类型，转换为LangChain的BaseMessage类型
      let langchainMessages: BaseMessage[];

      if (messages.length > 0 && 'role' in messages[0]) {
        // 转换我们的消息格式为LangChain消息格式
        langchainMessages = (messages as Message[]).map(msg => {
          switch (msg.role) {
            case 'system':
              return new SystemMessage(msg.content);
            case 'user':
              return new HumanMessage(msg.content);
            default:
              return new HumanMessage(msg.content);
          }
        });
      } else {
        // 已经是LangChain消息格式
        langchainMessages = messages as BaseMessage[];
      }

      const response = await model.invoke(langchainMessages);
      return response.content.toString();
    } catch (error) {
      console.error('[OpenAI] 生成聊天响应时出错:', error);
      throw error;
    }
  }
}
