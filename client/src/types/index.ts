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
export interface AccountBook {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
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
  accountBookId: string;
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
