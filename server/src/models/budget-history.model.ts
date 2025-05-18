import { BudgetHistory as PrismaBudgetHistory, RolloverType } from '@prisma/client';

/**
 * 预算历史创建DTO
 */
export interface CreateBudgetHistoryDto {
  budgetId: string;
  period: string;
  amount: number;
  type: RolloverType;
  description?: string;
}

/**
 * 预算历史查询参数
 */
export interface BudgetHistoryQueryParams {
  budgetId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 预算历史响应DTO
 */
export interface BudgetHistoryResponseDto {
  id: string;
  budgetId: string;
  period: string;
  amount: number;
  type: RolloverType;
  description?: string;
  createdAt: Date;
}

/**
 * 预算历史分页响应DTO
 */
export interface BudgetHistoryPaginatedResponseDto {
  total: number;
  page: number;
  limit: number;
  data: BudgetHistoryResponseDto[];
}

/**
 * 将预算历史实体转换为响应DTO
 */
export function toBudgetHistoryResponseDto(budgetHistory: PrismaBudgetHistory): BudgetHistoryResponseDto {
  const {
    id,
    budgetId,
    period,
    amount,
    type,
    description,
    createdAt
  } = budgetHistory;

  return {
    id,
    budgetId,
    period,
    amount: Number(amount),
    type,
    description: description || undefined,
    createdAt
  };
}
