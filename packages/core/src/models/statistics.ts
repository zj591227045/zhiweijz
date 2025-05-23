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
