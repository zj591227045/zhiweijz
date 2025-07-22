import { BudgetHistory as PrismaBudgetHistory, RolloverType } from '@prisma/client';

/**
 * 预算历史创建DTO
 */
export interface CreateBudgetHistoryDto {
  budgetId: string;
  userId: string; // 用户ID，必填
  period: string;
  amount: number;
  type: RolloverType;
  description?: string;
  budgetAmount?: number; // 预算金额
  spentAmount?: number; // 已使用金额
  previousRollover?: number; // 上一期结转金额
  accountBookId?: string; // 账本ID
  budgetType?: string; // 预算类型
}

/**
 * 预算历史查询参数
 */
export interface BudgetHistoryQueryParams {
  budgetId?: string;
  userId?: string; // 用户ID
  accountBookId?: string; // 账本ID
  budgetType?: string; // 预算类型
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 用户级别预算历史查询参数
 */
export interface UserBudgetHistoryQueryParams {
  userId: string;
  accountBookId: string;
  budgetType?: string;
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
  userId?: string; // 用户ID
  period: string;
  amount: number;
  type: RolloverType;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  budgetAmount?: number; // 预算金额
  spentAmount?: number; // 已使用金额
  previousRollover?: number; // 上一期结转金额
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
export function toBudgetHistoryResponseDto(
  budgetHistory: PrismaBudgetHistory,
): BudgetHistoryResponseDto {
  const {
    id,
    budgetId,
    userId,
    period,
    amount,
    type,
    description,
    createdAt,
    updatedAt,
    budgetAmount,
    spentAmount,
    previousRollover,
  } = budgetHistory as any; // 使用any类型避免TypeScript错误

  return {
    id,
    budgetId,
    userId: userId || undefined,
    period,
    amount: Number(amount),
    type,
    description: description || undefined,
    createdAt,
    updatedAt: updatedAt || createdAt, // 如果updatedAt不存在，使用createdAt
    budgetAmount: budgetAmount ? Number(budgetAmount) : undefined,
    spentAmount: spentAmount ? Number(spentAmount) : undefined,
    previousRollover: previousRollover ? Number(previousRollover) : undefined,
  };
}
