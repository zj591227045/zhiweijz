/**
 * LLM提供商选项接口
 */
export interface LLMProviderOptions {
  /** API密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 温度参数 (0-1) */
  temperature: number;
  /** 最大token数 */
  maxTokens?: number;
  /** 其他可选参数 */
  [key: string]: any;
}

/**
 * LLM提供商设置接口
 */
export interface LLMSettings {
  /** 提供商名称 */
  provider: string;
  /** API密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 温度参数 (0-1) */
  temperature: number;
  /** 最大token数 */
  maxTokens?: number;
  /** 其他可选参数 */
  [key: string]: any;
}

/**
 * 消息类型
 */
export interface Message {
  /** 消息角色 */
  role: 'system' | 'user' | 'assistant' | 'function';
  /** 消息内容 */
  content: string;
  /** 函数调用名称 (仅用于function角色) */
  name?: string;
}

// WorkflowConfig 已移动到 workflow-types.ts 中
