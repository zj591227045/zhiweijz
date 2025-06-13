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
  /** 基础URL (用于自定义提供商) */
  baseUrl?: string;
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
  /** 基础URL (用于自定义提供商) */
  baseUrl?: string;
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
 * Token使用量信息
 */
export interface TokenUsage {
  /** 提示tokens数量 */
  prompt_tokens: number;
  /** 完成tokens数量 */
  completion_tokens: number;
  /** 总tokens数量 */
  total_tokens: number;
  /** 思考tokens数量（可选，某些模型支持） */
  reasoning_tokens?: number;
}

/**
 * LLM响应结果
 */
export interface LLMResponse {
  /** 生成的内容 */
  content: string;
  /** Token使用量信息 */
  usage?: TokenUsage;
}

// WorkflowConfig 已移动到 workflow-types.ts 中
