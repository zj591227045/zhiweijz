import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LLMCallData {
  userId: string;
  userName: string;
  accountBookId?: string;
  accountBookName?: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  userMessage: string;
  assistantMessage?: string;
  systemPrompt?: string;
  isSuccess: boolean;
  errorMessage?: string;
  duration: number;
  cost?: number;
}

export class LLMLoggingService {
  /**
   * 记录LLM调用日志
   */
  static async logLLMCall(data: LLMCallData): Promise<void> {
    try {
      await prisma.llmCallLog.create({
        data: {
          userId: data.userId,
          userName: data.userName,
          accountBookId: data.accountBookId,
          accountBookName: data.accountBookName,
          provider: data.provider,
          model: data.model,
          promptTokens: data.promptTokens || 0,
          completionTokens: data.completionTokens || 0,
          totalTokens: data.totalTokens || 0,
          userMessage: data.userMessage,
          assistantMessage: data.assistantMessage,
          systemPrompt: data.systemPrompt,
          isSuccess: data.isSuccess,
          errorMessage: data.errorMessage,
          duration: data.duration,
          cost: data.cost ? data.cost.toString() : null
        }
      });
    } catch (error) {
      console.error('记录LLM调用日志失败:', error);
      // 不抛出错误，避免影响主要业务流程
    }
  }

  /**
   * 批量记录LLM调用日志
   */
  static async logLLMCallsBatch(calls: LLMCallData[]): Promise<void> {
    try {
      await prisma.llmCallLog.createMany({
        data: calls.map(call => ({
          userId: call.userId,
          userName: call.userName,
          accountBookId: call.accountBookId,
          accountBookName: call.accountBookName,
          provider: call.provider,
          model: call.model,
          promptTokens: call.promptTokens || 0,
          completionTokens: call.completionTokens || 0,
          totalTokens: call.totalTokens || 0,
          userMessage: call.userMessage,
          assistantMessage: call.assistantMessage,
          systemPrompt: call.systemPrompt,
          isSuccess: call.isSuccess,
          errorMessage: call.errorMessage,
          duration: call.duration,
          cost: call.cost ? call.cost.toString() : null
        }))
      });
    } catch (error) {
      console.error('批量记录LLM调用日志失败:', error);
      // 不抛出错误，避免影响主要业务流程
    }
  }

  /**
   * 清理过期的LLM调用日志
   * @param retentionDays 保留天数，默认90天
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.llmCallLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`清理了 ${result.count} 条过期的LLM调用日志`);
      return result.count;
    } catch (error) {
      console.error('清理过期LLM调用日志失败:', error);
      return 0;
    }
  }
}

/**
 * LLM调用包装器，自动记录调用日志
 */
export function withLLMLogging<T>(
  llmCall: () => Promise<T>,
  callData: Omit<LLMCallData, 'isSuccess' | 'errorMessage' | 'duration' | 'assistantMessage'>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    
    try {
      const result = await llmCall();
      const duration = Date.now() - startTime;
      
      // 记录成功的调用
      await LLMLoggingService.logLLMCall({
        ...callData,
        assistantMessage: typeof result === 'string' ? result : JSON.stringify(result),
        isSuccess: true,
        duration
      });
      
      resolve(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 记录失败的调用
      await LLMLoggingService.logLLMCall({
        ...callData,
        isSuccess: false,
        errorMessage,
        duration
      });
      
      reject(error);
    }
  });
}

/**
 * 计算Token使用成本的辅助函数
 */
export function calculateLLMCost(
  provider: string, 
  model: string, 
  promptTokens: number, 
  completionTokens: number
): number {
  // 这里可以根据不同的provider和model计算实际成本
  // 暂时返回估算值
  
  const costPerToken = getCostPerToken(provider, model);
  return (promptTokens * costPerToken.input + completionTokens * costPerToken.output);
}

/**
 * 获取每个Token的成本
 */
function getCostPerToken(provider: string, model: string): { input: number; output: number } {
  // 这里可以维护一个成本表
  // 暂时返回默认值（单位：美元/千个token）
  
  const costTable: { [key: string]: { [key: string]: { input: number; output: number } } } = {
    'openai': {
      'gpt-3.5-turbo': { input: 0.0015 / 1000, output: 0.002 / 1000 },
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 }
    },
    'siliconflow': {
      'Qwen/Qwen3-32B': { input: 0.0001 / 1000, output: 0.0002 / 1000 },
      'Qwen/Qwen2.5-32B-Instruct': { input: 0.0001 / 1000, output: 0.0002 / 1000 }
    },
    'default': {
      'default': { input: 0.001 / 1000, output: 0.002 / 1000 }
    }
  };

  const providerCosts = costTable[provider.toLowerCase()] || costTable['default'];
  return providerCosts[model] || providerCosts['default'] || costTable['default']['default'];
} 