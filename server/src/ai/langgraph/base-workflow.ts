import { LLMProviderService } from '../llm/llm-provider-service';
import { WorkflowState, WorkflowConfig } from '../types/workflow-types';

/**
 * 基础工作流类
 * 所有工作流都应该继承这个类
 */
export abstract class BaseWorkflow<T extends WorkflowState> {
  /** LLM提供商服务 */
  protected llmProviderService: LLMProviderService;
  /** 工作流配置 */
  protected config: WorkflowConfig;

  /**
   * 构造函数
   * @param llmProviderService LLM提供商服务
   * @param config 工作流配置
   */
  constructor(llmProviderService: LLMProviderService, config: WorkflowConfig) {
    this.llmProviderService = llmProviderService;
    this.config = config;
  }

  /**
   * 创建工作流
   * 子类必须实现这个方法
   */
  protected abstract createWorkflow(): any;

  /**
   * 运行工作流
   * @param initialState 初始状态
   * @returns 工作流结果
   */
  public abstract run(initialState: Partial<T>): Promise<T>;

  /**
   * 生成工作流ID
   * @returns 工作流ID
   */
  protected generateWorkflowId(): string {
    return `${this.config.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 处理错误
   * @param error 错误
   * @param state 当前状态
   * @returns 更新后的状态
   */
  protected handleError(error: any, state: T): T {
    console.error(`Error in workflow ${this.config.name}:`, error);
    return {
      ...state,
      error: error.message || String(error),
    };
  }
}
