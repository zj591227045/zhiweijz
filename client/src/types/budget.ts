// 预算周期类型
export type BudgetPeriodType = 'MONTHLY' | 'YEARLY';

// 预算过滤器类型
export type BudgetFilterType = 'all' | 'overspent' | 'rollover';

// 总体预算类型
export interface TotalBudget {
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  daysRemaining: number;
  rolloverAmount?: number;
  dailyAvailable: number;
}

// 分类类型
export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
  type: 'EXPENSE' | 'INCOME';
}

// 分类预算类型
export interface CategoryBudget {
  id: string;
  budgetId: string;
  categoryId: string;
  category?: Category;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverspent: boolean;
}

// 预算类型
export interface Budget {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverspent: boolean;
  rollover: boolean;
  rolloverAmount?: number;
  enableCategoryBudget: boolean;
  isAutoCalculated: boolean;
  userId: string;
  familyMemberId?: string;
  categoryBudgets?: CategoryBudget[];
}

// 创建预算DTO
export interface CreateBudgetDto {
  name: string;
  amount: number;
  period: BudgetPeriodType;
  startDate: string;
  endDate: string;
  accountBookId: string;
  rollover: boolean;
  enableCategoryBudget: boolean;
  isAutoCalculated?: boolean;
}

// 更新预算DTO
export interface UpdateBudgetDto extends Partial<CreateBudgetDto> {
  id: string;
}

// 创建分类预算DTO
export interface CreateCategoryBudgetDto {
  budgetId: string;
  categoryId: string;
  amount: number;
}

// 更新分类预算DTO
export interface UpdateCategoryBudgetDto {
  id: string;
  amount?: number;
  spent?: number;
}

// 预算API响应类型
export interface BudgetResponse {
  totalBudget: TotalBudget;
  budgets: Budget[];
  familyBudgets?: Record<string, Budget[]>;
}

// 预算查询参数类型
export interface BudgetQueryParams {
  accountBookId?: string;
  period: BudgetPeriodType;
  startDate: string;
  endDate: string;
  familyMemberId?: string;
  filter?: BudgetFilterType;
}
