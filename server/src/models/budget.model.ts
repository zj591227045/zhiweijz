import { Budget as PrismaBudget, BudgetPeriod } from '@prisma/client';
import { CategoryResponseDto } from './category.model';
import { CategoryBudgetResponseDto } from './category-budget.model';

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
  accountBookId?: string;
  enableCategoryBudget?: boolean;
  isAutoCalculated?: boolean;
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
  enableCategoryBudget?: boolean;
  isAutoCalculated?: boolean;
}

/**
 * 预算查询参数
 */
export interface BudgetQueryParams {
  period?: BudgetPeriod;
  categoryId?: string;
  familyId?: string;
  accountBookId?: string;
  familyMemberId?: string;
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
  enableCategoryBudget: boolean;
  isAutoCalculated: boolean;
  userId: string;
  familyId?: string;
  accountBookId?: string;
  rolloverAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  // 预算执行情况
  spent?: number;
  remaining?: number;
  progress?: number;
  adjustedRemaining?: number; // 考虑结转后的剩余金额
  // 分类预算
  categoryBudgets?: CategoryBudgetResponseDto[];
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
export function toBudgetResponseDto(budget: PrismaBudget, category?: CategoryResponseDto, spent?: number): BudgetResponseDto {
  const {
    id,
    name,
    amount,
    period,
    categoryId,
    startDate,
    endDate,
    rollover,
    userId,
    familyId,
    accountBookId,
    createdAt,
    updatedAt
  } = budget;

  // 使用类型断言获取新字段
  const budgetAny = budget as any;
  const enableCategoryBudget = budgetAny.enableCategoryBudget;
  const isAutoCalculated = budgetAny.isAutoCalculated;
  const rolloverAmount = budgetAny.rolloverAmount;

  // 计算预算执行情况
  const numericAmount = Number(amount);
  const numericRolloverAmount = rolloverAmount ? Number(rolloverAmount) : undefined;
  const numericSpent = spent !== undefined ? Number(spent) : undefined;
  const remaining = numericSpent !== undefined ? numericAmount - numericSpent : undefined;
  const progress = numericSpent !== undefined && numericAmount > 0 ? (numericSpent / numericAmount) * 100 : undefined;

  // 计算考虑结转后的剩余金额
  const adjustedRemaining = remaining !== undefined && numericRolloverAmount !== undefined
    ? remaining + numericRolloverAmount
    : remaining;

  return {
    id,
    name,
    amount: numericAmount,
    period,
    categoryId: categoryId || undefined,
    category,
    startDate,
    endDate,
    rollover,
    enableCategoryBudget: enableCategoryBudget ?? false,
    isAutoCalculated: isAutoCalculated ?? false,
    userId: userId || '',
    familyId: familyId || undefined,
    accountBookId: accountBookId || undefined,
    rolloverAmount: numericRolloverAmount,
    createdAt,
    updatedAt,
    spent: numericSpent,
    remaining,
    progress,
    adjustedRemaining,
  };
}
