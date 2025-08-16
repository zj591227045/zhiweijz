/**
 * 用户相关类型
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

/**
 * 账本相关类型
 */
export enum AccountBookType {
  PERSONAL = 'PERSONAL',
  FAMILY = 'FAMILY',
}

export interface AccountBook {
  id: string;
  name: string;
  description?: string;
  type: AccountBookType;
  familyId?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  userLLMSettingId?: string; // 账本绑定的LLM服务ID
  aiService?: {
    enabled: boolean;
    provider?: string;
    model?: string;
    apiKey?: string;
    customPrompt?: string;
    language?: string;
  };
}

/**
 * 记账相关类型
 */
export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

// 多人预算分摊项
export interface BudgetAllocationItem {
  budgetId: string;
  budgetName: string;
  memberName: string;
  memberId?: string;
  amount: number;
  isSelected?: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  category?: Category;
  description?: string;
  date: string;
  accountBookId: string;
  accountBook?: AccountBook;
  budgetId?: string;
  budget?: {
    id: string;
    name: string;
    amount: number;
    remaining: number;
  };
  familyId?: string;
  familyMemberId?: string;
  isMultiBudget?: boolean;
  budgetAllocation?: BudgetAllocationItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionData {
  amount: number;
  type: TransactionType;
  categoryId: string;
  description?: string;
  date: string;
  accountBookId: string;
  familyId?: string;
  familyMemberId?: string;
}

export interface UpdateTransactionData {
  amount?: number;
  type?: TransactionType;
  categoryId?: string;
  description?: string;
  date?: string;
  budgetId?: string;
  isMultiBudget?: boolean;
  budgetAllocation?: BudgetAllocationItem[];
}

/**
 * 分类相关类型
 */
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  accountBookId?: string;
  isDefault?: boolean;
  isHidden?: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 预算相关类型
 */
export interface Budget {
  id: string;
  name: string; // 预算名称
  amount: number;
  categoryId: string;
  category?: Category;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate?: string;
  accountBookId: string;
  createdAt: string;
  updatedAt: string;
  familyMemberName?: string; // 成员名称
  familyMemberId?: string; // 成员ID
  budgetType?: string; // 预算类型
  rolloverAmount?: number; // 结转金额
  spent?: number; // 已用金额
  remaining?: number; // 剩余金额
  adjustedRemaining?: number; // 考虑结转后的剩余金额
}

/**
 * 统计相关类型
 */
export interface StatisticsPeriod {
  startDate: string;
  endDate: string;
}

export interface CategoryStatistics {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface DailyStatistics {
  date: string;
  income: number;
  expense: number;
}

export interface StatisticsResponse {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory: CategoryStatistics[];
  expenseByCategory: CategoryStatistics[];
  dailyStatistics: DailyStatistics[];
}

export interface BudgetStatistics {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentage: number;
  categories: BudgetCategoryStatistics[];
}

export interface BudgetCategoryStatistics {
  category: {
    id: string;
    name: string;
    icon?: string;
  };
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  period?: string; // 添加预算周期字段
}

export interface TransactionGroup {
  date: string;
  transactions: Transaction[];
}

/**
 * 家庭相关类型
 */
export enum FamilyRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  members?: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId?: string;
  name: string;
  gender?: string;
  birthDate?: string;
  role: FamilyRole;
  isRegistered: boolean;
  isCustodial?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFamilyData {
  name: string;
}

export interface CreateFamilyMemberData {
  name: string;
  role?: FamilyRole;
  userId?: string;
  isRegistered?: boolean;
}

export interface CreateCustodialMemberData {
  name: string;
  gender?: string;
  birthDate?: string;
  role?: FamilyRole;
}

export interface UpdateCustodialMemberData {
  name?: string;
  gender?: string;
  birthDate?: string;
  role?: FamilyRole;
}

/**
 * API响应类型
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

/**
 * 智能记账相关类型
 */
export interface SmartAccountingResult {
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  description: string;
  date: string;
  confidence: number;
}
