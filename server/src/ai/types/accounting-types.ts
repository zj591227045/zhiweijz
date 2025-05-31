import { WorkflowState } from './workflow-types';

/**
 * 智能记账工作流状态接口
 */
export interface SmartAccountingState extends WorkflowState {
  // 输入
  description: string;
  userId: string;
  accountId?: string;
  accountType?: 'personal' | 'family';

  // 中间状态
  analyzedTransaction?: {
    amount: number;
    date: Date;
    categoryId: string;
    categoryName: string;
    type: 'EXPENSE' | 'INCOME';
    budgetName?: string;
    note: string;
    confidence: number;
  };

  matchedBudget?: {
    id: string;
    name: string;
  };

  // 调试信息
  debugInfo?: {
    systemPrompt: string;
    userPrompt: string;
    llmResponse: string;
    parsedResult: any;
  };

  // 错误信息
  error?: string;

  includeDebugInfo?: boolean;

  // 输出
  result?: {
    amount: number;
    date: Date;
    categoryId: string;
    categoryName: string;
    type: 'EXPENSE' | 'INCOME';
    note: string;
    accountId: string;
    accountType: 'personal' | 'family';
    budgetId?: string;
    budgetName?: string;
    confidence: number;
  };
}
