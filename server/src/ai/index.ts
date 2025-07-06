import { LLMProviderService } from './llm/llm-provider-service';
import { WorkflowManager } from './langgraph/workflow-manager';
import { SimpleWorkflow } from './langgraph/simple-workflow';
import { BASE_PROMPTS } from './prompts/base-prompts';
import { ACCOUNTING_PROMPTS } from './prompts/accounting-prompts';

// 导出类型
export * from './types/llm-types';
export * from './types/workflow-types';

// 导出提供商接口和实现
export * from './llm/llm-provider';
export * from './llm/openai-provider';
export * from './llm/llm-provider-service';

// 导出工作流
export * from './langgraph/base-workflow';
export * from './langgraph/simple-workflow';
export * from './langgraph/workflow-manager';

// 导出提示模板
export { BASE_PROMPTS, ACCOUNTING_PROMPTS };

/**
 * 创建LLM提供商服务
 * @returns LLM提供商服务实例
 */
export function createLLMProviderService(): LLMProviderService {
  return new LLMProviderService();
}

/**
 * 创建工作流管理器
 * @param llmProviderService LLM提供商服务
 * @returns 工作流管理器实例
 */
export function createWorkflowManager(llmProviderService: LLMProviderService): WorkflowManager {
  return new WorkflowManager(llmProviderService);
}

/**
 * 创建AI服务
 * 这是使用AI模块的主要入口点
 * @returns AI服务对象
 */
export function createAIService() {
  // 创建LLM提供商服务
  const llmProviderService = createLLMProviderService();

  // 创建工作流管理器
  const workflowManager = createWorkflowManager(llmProviderService);

  return {
    llmProviderService,
    workflowManager,

    /**
     * 运行简单工作流
     * @param input 输入文本
     * @param userId 用户ID
     * @param options 其他选项
     * @returns 工作流结果
     */
    async runSimpleWorkflow(input: string, userId: string, options = {}) {
      return workflowManager.runSimpleWorkflow(input, userId, options);
    },
  };
}
