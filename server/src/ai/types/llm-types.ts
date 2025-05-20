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

/**
 * 工作流配置接口
 */
export interface WorkflowConfig {
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 默认LLM提供商 */
  defaultProvider: string;
  /** 默认模型 */
  defaultModel: string;
  /** 默认温度 */
  defaultTemperature: number;
  /** 默认最大token数 */
  defaultMaxTokens?: number;
  /** 其他配置 */
  [key: string]: any;
}
