import { Budget, BudgetPeriod, TransactionType } from '@prisma/client';
import { CategoryResponseDto } from './category.model';

/**
 * 预算创建DTO
 */
export interface CreateBudgetDto {
  name: string;
  amount: number;
  period: BudgetPeriod;
  categoryId?: string;
  startDate: Date;
  endDate: Date;
  rollover: boolean;
  familyId?: string;
}

/**
 * 预算更新DTO
 */
export interface UpdateBudgetDto {
  name?: string;
  amount?: number;
  period?: BudgetPeriod;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  rollover?: boolean;
}

/**
 * 预算查询参数
 */
export interface BudgetQueryParams {
  period?: BudgetPeriod;
  categoryId?: string;
  familyId?: string;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 预算响应DTO
 */
export interface BudgetResponseDto {
  id: string;
  name: string;
  amount: number;
  period: BudgetPeriod;
  categoryId?: string;
  category?: CategoryResponseDto;
  startDate: Date;
  endDate: Date;
  rollover: boolean;
  userId: string;
  familyId?: string;
  createdAt: Date;
  updatedAt: Date;
  // 预算执行情况
  spent?: number;
  remaining?: number;
  progress?: number;
}

/**
 * 预算分页响应DTO
 */
export interface BudgetPaginatedResponseDto {
  total: number;
  page: number;
  limit: number;
  data: BudgetResponseDto[];
}

/**
 * 将预算实体转换为响应DTO
 */
export function toBudgetResponseDto(budget: Budget, category?: CategoryResponseDto, spent?: number): BudgetResponseDto {
  const { id, name, amount, period, categoryId, startDate, endDate, rollover, userId, familyId, createdAt, updatedAt } = budget;

  // 计算预算执行情况
  const numericAmount = Number(amount);
  const numericSpent = spent !== undefined ? Number(spent) : undefined;
  const remaining = numericSpent !== undefined ? numericAmount - numericSpent : undefined;
  const progress = numericSpent !== undefined && numericAmount > 0 ? (numericSpent / numericAmount) * 100 : undefined;

  return {
    id,
    name,
    amount: numericAmount,
    period,
    categoryId: categoryId || undefined,
    category,
    startDate,
    endDate: endDate || undefined,
    rollover,
    userId: userId || '',
    familyId: familyId || undefined,
    createdAt,
    updatedAt,
    spent: numericSpent,
    remaining,
    progress,
  };
}
