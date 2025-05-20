import { ChatOpenAI } from '@langchain/openai';
import { LLMProvider } from './llm-provider';
import { LLMProviderOptions, Message } from '../types/llm-types';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

/**
 * 硅基流动提供商实现
 * 实现了LLMProvider接口，提供硅基流动API的调用方法
 */
export class SiliconFlowProvider implements LLMProvider {
  /** 提供商名称 */
  public name = 'siliconflow';

  /** 基础URL */
  private baseUrl = 'https://api.siliconflow.cn/v1';

  /** 模型优先级 */
  private modelPriority = [
    'Qwen/Qwen3-32B',
    'Qwen/Qwen2.5-32B-Instruct',
    'Qwen/Qwen3-14B',
    'Qwen/Qwen3-30B-A3B'
  ];

  /**
   * 获取硅基流动模型实例
   * @param options LLM提供商选项
   * @returns 硅基流动模型实例
   */
  public getModel(options: LLMProviderOptions) {
    // 如果没有指定模型，使用优先级最高的模型
    const model = options.model || this.modelPriority[0];

    return new ChatOpenAI({
      apiKey: options.apiKey,
      modelName: model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      configuration: {
        baseURL: this.baseUrl,
      },
    });
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
      console.error(`[SiliconFlow] 使用模型 ${options.model} 生成文本时出错:`, error);

      // 如果当前模型不是优先级最低的模型，尝试使用下一个优先级的模型
      if (options.model && this.modelPriority.includes(options.model)) {
        const currentIndex = this.modelPriority.indexOf(options.model);
        if (currentIndex < this.modelPriority.length - 1) {
          const nextModel = this.modelPriority[currentIndex + 1];
          console.log(`[SiliconFlow] 尝试使用下一个模型: ${nextModel}`);

          return this.generateText(prompt, {
            ...options,
            model: nextModel
          });
        }
      }

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
      console.error(`[SiliconFlow] 使用模型 ${options.model} 生成聊天响应时出错:`, error);

      // 如果当前模型不是优先级最低的模型，尝试使用下一个优先级的模型
      if (options.model && this.modelPriority.includes(options.model)) {
        const currentIndex = this.modelPriority.indexOf(options.model);
        if (currentIndex < this.modelPriority.length - 1) {
          const nextModel = this.modelPriority[currentIndex + 1];
          console.log(`[SiliconFlow] 尝试使用下一个模型: ${nextModel}`);

          return this.generateChat(messages, {
            ...options,
            model: nextModel
          });
        }
      }

      throw error;
    }
  }
}
