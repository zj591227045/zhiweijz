import { BaseWorkflow } from './base-workflow';
import { LLMProviderService } from '../llm/llm-provider-service';
import { WorkflowState, WorkflowConfig } from '../types/workflow-types';
import { Message } from '../types/llm-types';

/**
 * 简单工作流状态接口
 */
export interface SimpleWorkflowState extends WorkflowState {
  /** 输入文本 */
  input: string;
  /** 提示模板 */
  promptTemplate?: string;
  /** 系统消息 */
  systemMessage?: string;
  /** 输出文本 */
  output?: string;
}

/**
 * 简单工作流类
 * 实现了一个简单的单步工作流
 */
export class SimpleWorkflow extends BaseWorkflow<SimpleWorkflowState> {
  /**
   * 构造函数
   * @param llmProviderService LLM提供商服务
   * @param config 工作流配置
   */
  constructor(
    llmProviderService: LLMProviderService,
    config: WorkflowConfig = {
      name: 'simple-workflow',
      defaultProvider: 'openai',
      defaultModel: 'gpt-3.5-turbo',
      defaultTemperature: 0.7,
    },
  ) {
    super(llmProviderService, config);
  }

  /**
   * 创建工作流
   * 这个简单工作流只有一个节点
   */
  protected createWorkflow() {
    // 这里应该使用LangGraph创建工作流
    // 由于我们还没有安装LangGraph依赖，这里只是一个模拟实现
    return {
      invoke: async (state: SimpleWorkflowState) => {
        try {
          // 准备消息
          const messages: Message[] = [];

          // 添加系统消息
          if (state.systemMessage) {
            messages.push({
              role: 'system',
              content: state.systemMessage,
            });
          }

          // 添加用户消息
          let userMessage = state.input;
          if (state.promptTemplate) {
            userMessage = state.promptTemplate.replace('{input}', state.input);
          }

          messages.push({
            role: 'user',
            content: userMessage,
          });

          // 调用LLM
          const output = await this.llmProviderService.generateChat(
            messages,
            state.userId || '',
            state.accountId,
            state.accountType,
          );

          // 返回结果
          return {
            ...state,
            output,
            result: output,
          };
        } catch (error) {
          return this.handleError(error, state);
        }
      },
    };
  }

  /**
   * 运行工作流
   * @param initialState 初始状态
   * @returns 工作流结果
   */
  public async run(initialState: Partial<SimpleWorkflowState>): Promise<SimpleWorkflowState> {
    // 准备初始状态
    const state: SimpleWorkflowState = {
      workflowId: this.generateWorkflowId(),
      input: initialState.input || '',
      promptTemplate: initialState.promptTemplate,
      systemMessage: initialState.systemMessage,
      userId: initialState.userId,
      accountId: initialState.accountId,
      accountType: initialState.accountType,
    };

    // 创建并运行工作流
    const workflow = this.createWorkflow();
    return await workflow.invoke(state);
  }
}
