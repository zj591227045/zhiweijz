import { CategoryBudget as PrismaCategoryBudget } from '@prisma/client';
import { CategoryResponseDto } from './category.model';

/**
 * 分类预算创建DTO
 */
export interface CreateCategoryBudgetDto {
  budgetId: string;
  categoryId: string;
  amount: number;
}

/**
 * 分类预算更新DTO
 */
export interface UpdateCategoryBudgetDto {
  amount?: number;
  spent?: number;
}

/**
 * 分类预算查询参数
 */
export interface CategoryBudgetQueryParams {
  budgetId?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分类预算响应DTO
 */
export interface CategoryBudgetResponseDto {
  id: string;
  budgetId: string;
  categoryId: string;
  category?: CategoryResponseDto;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverspent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 分类预算分页响应DTO
 */
export interface CategoryBudgetPaginatedResponseDto {
  total: number;
  page: number;
  limit: number;
  data: CategoryBudgetResponseDto[];
}

/**
 * 将分类预算实体转换为响应DTO
 */
export function toCategoryBudgetResponseDto(
  categoryBudget: PrismaCategoryBudget,
  category?: CategoryResponseDto
): CategoryBudgetResponseDto {
  const {
    id,
    budgetId,
    categoryId,
    amount,
    spent,
    createdAt,
    updatedAt
  } = categoryBudget;

  // 计算预算执行情况
  const numericAmount = Number(amount);
  const numericSpent = Number(spent);
  const remaining = numericAmount - numericSpent;
  const percentage = numericAmount > 0 ? (numericSpent / numericAmount) * 100 : 0;
  const isOverspent = numericSpent > numericAmount;

  return {
    id,
    budgetId,
    categoryId,
    category,
    amount: numericAmount,
    spent: numericSpent,
    remaining,
    percentage,
    isOverspent,
    createdAt,
    updatedAt
  };
}
