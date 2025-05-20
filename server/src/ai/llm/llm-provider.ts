import { LLMProviderOptions, Message } from '../types/llm-types';
import { BaseMessage } from '@langchain/core/messages';

/**
 * LLM提供商接口
 * 定义了所有LLM提供商必须实现的方法
 */
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
  generateChat(messages: Message[] | BaseMessage[], options: LLMProviderOptions): Promise<string>;
}
