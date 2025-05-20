/**
 * 工作流状态接口
 * 所有工作流状态都应该继承这个接口
 */
export interface WorkflowState {
  /** 工作流ID */
  workflowId?: string;
  /** 用户ID */
  userId?: string;
  /** 账本ID */
  accountId?: string;
  /** 账本类型 */
  accountType?: 'personal' | 'family';
  /** 结果 */
  result?: any;
  /** 错误 */
  error?: string;
}

/**
 * 工作流节点函数类型
 */
export type WorkflowNodeFunction<T extends WorkflowState> = (state: T) => Promise<T>;

/**
 * 工作流边条件函数类型
 */
export type WorkflowEdgeCondition<T extends WorkflowState> = (state: T) => Promise<string>;

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
