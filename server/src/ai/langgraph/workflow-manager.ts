import { LLMProviderService } from '../llm/llm-provider-service';
import { BaseWorkflow } from './base-workflow';
import { SimpleWorkflow, SimpleWorkflowState } from './simple-workflow';
import { WorkflowConfig } from '../types/workflow-types';

/**
 * 工作流管理器
 * 管理多个工作流，提供统一的接口
 */
export class WorkflowManager {
  /** LLM提供商服务 */
  private llmProviderService: LLMProviderService;
  /** 工作流映射 */
  private workflows: Map<string, BaseWorkflow<any>> = new Map();
  /** 工作流配置映射 */
  private workflowConfigs: Map<string, WorkflowConfig> = new Map();

  /**
   * 构造函数
   * @param llmProviderService LLM提供商服务
   */
  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
    
    // 注册默认工作流
    this.registerDefaultWorkflows();
  }

  /**
   * 注册默认工作流
   */
  private registerDefaultWorkflows(): void {
    // 注册简单工作流
    const simpleWorkflowConfig: WorkflowConfig = {
      name: 'simple',
      description: '简单的单步工作流',
      defaultProvider: 'openai',
      defaultModel: 'gpt-3.5-turbo',
      defaultTemperature: 0.7,
    };
    
    this.registerWorkflowConfig('simple', simpleWorkflowConfig);
    this.registerWorkflow('simple', new SimpleWorkflow(this.llmProviderService, simpleWorkflowConfig));
  }

  /**
   * 注册工作流配置
   * @param name 工作流名称
   * @param config 工作流配置
   */
  public registerWorkflowConfig(name: string, config: WorkflowConfig): void {
    this.workflowConfigs.set(name, config);
  }

  /**
   * 获取工作流配置
   * @param name 工作流名称
   * @returns 工作流配置
   */
  public getWorkflowConfig(name: string): WorkflowConfig {
    const config = this.workflowConfigs.get(name);
    if (!config) {
      throw new Error(`Workflow config '${name}' not found`);
    }
    return config;
  }

  /**
   * 注册工作流
   * @param name 工作流名称
   * @param workflow 工作流
   */
  public registerWorkflow<T>(name: string, workflow: BaseWorkflow<T>): void {
    this.workflows.set(name, workflow);
  }

  /**
   * 获取工作流
   * @param name 工作流名称
   * @returns 工作流
   */
  public getWorkflow<T>(name: string): BaseWorkflow<T> {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      throw new Error(`Workflow '${name}' not found`);
    }
    return workflow as BaseWorkflow<T>;
  }

  /**
   * 运行简单工作流
   * @param input 输入文本
   * @param userId 用户ID
   * @param options 其他选项
   * @returns 工作流结果
   */
  public async runSimpleWorkflow(
    input: string,
    userId: string,
    options: {
      promptTemplate?: string;
      systemMessage?: string;
      accountId?: string;
      accountType?: 'personal' | 'family';
    } = {}
  ): Promise<SimpleWorkflowState> {
    const workflow = this.getWorkflow<SimpleWorkflowState>('simple');
    return await workflow.run({
      input,
      userId,
      promptTemplate: options.promptTemplate,
      systemMessage: options.systemMessage,
      accountId: options.accountId,
      accountType: options.accountType,
    });
  }
}
