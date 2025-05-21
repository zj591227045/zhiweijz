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

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * 账本相关类型
 */
export enum AccountBookType {
  PERSONAL = "PERSONAL",
  FAMILY = "FAMILY",
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
 * 交易相关类型
 */
export enum TransactionType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
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

export interface CreateCategoryData {
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  accountBookId: string;
}

export interface UpdateCategoryData {
  name?: string;
  icon?: string;
  color?: string;
}

/**
 * 预算相关类型
 */
export interface Budget {
  id: string;
  amount: number;
  categoryId: string;
  category?: Category;
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  endDate?: string;
  accountBookId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetData {
  amount: number;
  categoryId: string;
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  endDate?: string;
  accountBookId: string;
}

export interface UpdateBudgetData {
  amount?: number;
  categoryId?: string;
  period?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate?: string;
  endDate?: string;
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
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
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
 * 账本创建和更新类型
 */
export interface CreateAccountBookData {
  name: string;
  description?: string;
  type?: AccountBookType;
  familyId?: string;
  isDefault?: boolean;
}

export interface UpdateAccountBookData {
  name?: string;
  description?: string;
  isDefault?: boolean;
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
