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
  /** 是否为多提供商模式 */
  isMultiProvider?: boolean;
  /** 其他可选参数 */
  [key: string]: any;
}

/**
 * LLM提供商实例配置
 */
export interface LLMProviderInstance {
  /** 实例ID */
  id: string;
  /** 提供商名称 */
  provider: string;
  /** 显示名称 */
  name: string;
  /** API密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 基础URL */
  baseUrl?: string;
  /** 温度参数 */
  temperature: number;
  /** 最大token数 */
  maxTokens: number;
  /** 优先级 (数字越小优先级越高) */
  priority: number;
  /** 权重 (用于负载均衡) */
  weight: number;
  /** 是否启用 */
  enabled: boolean;
  /** 最后健康检查状态 */
  healthy: boolean;
  /** 最后健康检查时间 */
  lastHealthCheck?: Date;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 多提供商LLM配置
 */
export interface MultiProviderLLMConfig {
  /** 配置ID */
  id: string;
  /** 配置名称 */
  name: string;
  /** 是否启用多提供商 */
  enabled: boolean;
  /** 提供商实例列表 */
  providers: LLMProviderInstance[];
  /** 故障转移配置 */
  failover: {
    /** 启用故障转移 */
    enabled: boolean;
    /** 重试次数 */
    maxRetries: number;
    /** 重试间隔(毫秒) */
    retryInterval: number;
  };
  /** 负载均衡配置 */
  loadBalancing: {
    /** 负载均衡策略: round-robin | weighted | random */
    strategy: 'round-robin' | 'weighted' | 'random';
    /** 健康检查间隔(毫秒) */
    healthCheckInterval: number;
  };
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 提供商健康状态
 */
export interface ProviderHealthStatus {
  /** 提供商实例ID */
  providerId: string;
  /** 是否健康 */
  healthy: boolean;
  /** 响应时间(毫秒) */
  responseTime?: number;
  /** 错误信息 */
  error?: string;
  /** 检查时间 */
  checkedAt: Date;
}

/**
 * LLM请求结果
 */
export interface LLMRequestResult {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: string;
  /** 错误信息 */
  error?: string;
  /** 使用的提供商ID */
  providerId?: string;
  /** token使用量 */
  tokenUsage?: TokenUsage;
  /** 响应时间(毫秒) */
  responseTime?: number;
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
