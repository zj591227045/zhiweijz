import { Budget as PrismaBudget, BudgetPeriod, BudgetType, RolloverType } from '@prisma/client';
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
  budgetType?: BudgetType;
  familyMemberId?: string; // 托管成员ID
  refreshDay?: number; // 预算刷新日期（1, 5, 10, 15, 20, 25）
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
  budgetType?: BudgetType;
  rolloverAmount?: number;
  amountModified?: boolean; // 预算金额是否已被修改
  lastAmountModifiedAt?: Date; // 最后一次修改预算金额的时间
  refreshDay?: number; // 预算刷新日期（1, 5, 10, 15, 20, 25）
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
  budgetType?: BudgetType;
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
  userName?: string; // 用户名称
  familyId?: string;
  familyMemberId?: string; // 托管成员ID
  familyMemberName?: string; // 托管成员名称
  accountBookId?: string;
  accountBookName?: string;
  accountBookType?: string;
  budgetType: BudgetType;
  rolloverAmount?: number;
  refreshDay?: number; // 预算刷新日期
  createdAt: Date;
  updatedAt: Date;
  // 预算执行情况
  spent?: number;
  remaining?: number;
  progress?: number;
  adjustedRemaining?: number; // 考虑结转后的剩余金额
  // 日均统计
  daysRemaining?: number;
  dailySpent?: number;
  dailyAvailable?: number;
  // 分类预算
  categoryBudgets?: CategoryBudgetResponseDto[];
  // 预算金额修改状态
  amountModified?: boolean;
  lastAmountModifiedAt?: Date;
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
export function toBudgetResponseDto(
  budget: PrismaBudget,
  category?: CategoryResponseDto,
  spent?: number,
): BudgetResponseDto {
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
    updatedAt,
  } = budget;

  // 使用类型断言获取新字段
  const budgetAny = budget as any;
  const enableCategoryBudget = budgetAny.enableCategoryBudget;
  const isAutoCalculated = budgetAny.isAutoCalculated;
  const rolloverAmount = budgetAny.rolloverAmount;
  const budgetType = budgetAny.budgetType || BudgetType.PERSONAL;
  const amountModified = budgetAny.amountModified;
  const lastAmountModifiedAt = budgetAny.lastAmountModifiedAt;
  const familyMemberId = budgetAny.familyMemberId;
  const refreshDay = budgetAny.refreshDay;

  // 获取托管成员信息
  const familyMember = budgetAny.familyMember;

  // 计算预算执行情况
  const numericAmount = Number(amount);
  const numericRolloverAmount = rolloverAmount ? Number(rolloverAmount) : 0;
  const numericSpent = spent !== undefined ? Number(spent) : undefined;
  const remaining = numericSpent !== undefined ? numericAmount - numericSpent : undefined;

  // 计算总可用金额（基础预算 + 结转金额）
  const totalAvailable = numericAmount + numericRolloverAmount;

  // 计算考虑结转后的剩余金额：总可用金额 - 已用金额
  const adjustedRemaining = numericSpent !== undefined ? totalAvailable - numericSpent : undefined;

  // 计算基于总可用金额的进度百分比
  const progress =
    numericSpent !== undefined && totalAvailable > 0
      ? (numericSpent / totalAvailable) * 100
      : undefined;

  // 计算日均统计
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, totalDays - daysRemaining);

  const dailySpent = elapsedDays > 0 && numericSpent !== undefined ? numericSpent / elapsedDays : 0;
  const dailyAvailable =
    daysRemaining > 0 && adjustedRemaining !== undefined ? adjustedRemaining / daysRemaining : 0;

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
    userName: undefined, // 将在服务层填充
    familyId: familyId || undefined,
    familyMemberId: familyMemberId || undefined,
    familyMemberName: familyMember ? familyMember.name : undefined, // 添加托管成员名称
    accountBookId: accountBookId || undefined,
    budgetType: budgetType,
    rolloverAmount: numericRolloverAmount,
    refreshDay: refreshDay || 1,
    createdAt,
    updatedAt,
    spent: numericSpent,
    remaining,
    progress,
    adjustedRemaining,
    daysRemaining,
    dailySpent,
    dailyAvailable,
    amountModified,
    lastAmountModifiedAt,
  };
}
