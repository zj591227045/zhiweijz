import {
  Budget,
  BudgetPeriodType,
  BudgetQueryParams,
  BudgetResponse,
  CategoryBudget,
  CreateBudgetDto,
  CreateCategoryBudgetDto,
  UpdateBudgetDto,
  UpdateCategoryBudgetDto
} from "../models";

export interface BudgetServiceOptions {
  apiClient: any;
  debug?: boolean;
}

export class BudgetService {
  private apiClient: any;
  private debug: boolean;

  constructor(options: BudgetServiceOptions) {
    this.apiClient = options.apiClient;
    this.debug = options.debug || false;
  }

  /**
   * 获取预算列表
   */
  async getBudgets(params: BudgetQueryParams): Promise<BudgetResponse> {
    try {
      if (this.debug) {
        console.log('获取预算列表, 参数:', params);
      }

      // 发送请求
      const response = await this.apiClient.get('/budgets', { params }) as BudgetResponse;

      if (this.debug) {
        console.log('预算响应数据:', response);
      }

      // 如果响应不是预期的格式，返回默认数据
      if (!response || typeof response !== 'object') {
        if (this.debug) {
          console.warn('预算响应数据格式不符合预期:', response);
        }
        return {
          totalBudget: {
            amount: 0,
            spent: 0,
            remaining: 0,
            percentage: 0,
            daysRemaining: this.calculateDaysRemaining(),
            dailyAvailable: 0
          },
          budgets: []
        };
      }

      return response;
    } catch (error) {
      console.error('获取预算列表失败:', error);
      // 返回默认数据，避免页面崩溃
      return {
        totalBudget: {
          amount: 0,
          spent: 0,
          remaining: 0,
          percentage: 0,
          daysRemaining: 0,
          dailyAvailable: 0
        },
        budgets: []
      };
    }
  }

  /**
   * 获取预算详情
   */
  async getBudgetById(budgetId: string): Promise<Budget | null> {
    try {
      if (this.debug) {
        console.log(`获取预算详情, ID: ${budgetId}`);
      }
      const response = await this.apiClient.get(`/budgets/${budgetId}`) as Budget;
      return response;
    } catch (error) {
      console.error('获取预算详情失败:', error);
      return null;
    }
  }

  /**
   * 创建预算
   */
  async createBudget(budgetData: CreateBudgetDto): Promise<Budget | null> {
    try {
      const response = await this.apiClient.post('/budgets', budgetData) as Budget;
      return response;
    } catch (error) {
      console.error('创建预算失败:', error);
      throw error;
    }
  }

  /**
   * 更新预算
   */
  async updateBudget(budgetId: string, budgetData: UpdateBudgetDto): Promise<Budget | null> {
    try {
      const response = await this.apiClient.put(`/budgets/${budgetId}`, budgetData) as Budget;
      return response;
    } catch (error) {
      console.error('更新预算失败:', error);
      throw error;
    }
  }

  /**
   * 删除预算
   */
  async deleteBudget(budgetId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/budgets/${budgetId}`);
      return true;
    } catch (error) {
      console.error('删除预算失败:', error);
      throw error;
    }
  }

  /**
   * 获取预算趋势数据
   */
  async getBudgetTrends(
    budgetId: string,
    viewMode: 'daily' | 'weekly' | 'monthly' = 'monthly',
    timeRange: '6months' | '12months' = '6months',
    familyMemberId?: string
  ): Promise<any[]> {
    try {
      const params = {
        viewMode,
        timeRange: '12months', // 始终请求12个月的数据，前端根据timeRange参数决定显示多少
        familyMemberId
      };

      if (this.debug) {
        console.log(`获取预算趋势, ID: ${budgetId}, 参数:`, params);
      }

      const response = await this.apiClient.get(`/budgets/${budgetId}/trends`, { params }) as any[];

      // 如果没有数据或数据不足，填充缺失的月份
      if (!response || !Array.isArray(response) || response.length === 0) {
        if (this.debug) {
          console.log('趋势数据为空或格式不正确，生成空数据');
        }
        return this.generateEmptyTrendData(viewMode, '12months');
      }

      // 获取最近12个月的完整月份列表
      const months = this.getLastNMonths(12);

      // 创建一个映射，用于快速查找响应中的数据
      const responseMap = new Map();
      response.forEach(item => {
        responseMap.set(item.date, item);
      });

      // 填充缺失的月份数据
      const completeData = months.map(month => {
        if (responseMap.has(month)) {
          const item = responseMap.get(month);
          // 确保数据包含所有必要的字段
          return {
            date: item.date,
            amount: item.amount || 0,
            total: item.total || item.amount || 0
          };
        } else {
          return {
            date: month,
            amount: 0,
            total: 0
          };
        }
      });

      // 确保数据按日期排序
      const sortedData = [...completeData].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      // 根据timeRange参数截取数据
      const monthsToShow = timeRange === '6months' ? 6 : 12;
      const result = sortedData.slice(-monthsToShow);

      return result;
    } catch (error) {
      console.error('获取预算趋势失败:', error);
      return this.generateEmptyTrendData(viewMode, timeRange);
    }
  }

  /**
   * 获取预算统计数据
   */
  async getBudgetStatistics(params: {
    accountBookId: string;
    month: string;
  }): Promise<any> {
    try {
      if (this.debug) {
        console.log('获取预算统计, 参数:', params);
      }

      const response = await this.apiClient.get('/statistics/budgets', { params }) as any;

      return response || {
        budgetCards: [],
        familyMembers: [],
        overview: null,
        categories: [],
        recentTransactions: [],
        enableCategoryBudget: false
      };
    } catch (error) {
      console.error('获取预算统计失败:', error);
      return {
        budgetCards: [],
        familyMembers: [],
        overview: null,
        categories: [],
        recentTransactions: [],
        enableCategoryBudget: false
      };
    }
  }

  /**
   * 获取活跃预算
   */
  async getActiveBudgets(accountBookId?: string): Promise<any[]> {
    try {
      const params = accountBookId ? { accountBookId } : undefined;

      if (this.debug) {
        console.log('获取活跃预算, 参数:', params);
      }

      const response = await this.apiClient.get('/budgets/active', { params }) as any[];
      return response || [];
    } catch (error) {
      console.error('获取活跃预算失败:', error);
      return [];
    }
  }

  /**
   * 计算剩余天数
   */
  calculateDaysRemaining(endDate?: string): number {
    if (!endDate) {
      // 如果没有提供结束日期，计算到月底的天数
      const today = new Date();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const diffTime = endOfMonth.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * 获取最近N个月的月份列表（YYYY-MM格式）
   */
  private getLastNMonths(n: number): string[] {
    const result = [];
    const today = new Date();

    for (let i = n - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      result.push(`${year}-${month}`);
    }

    return result;
  }

  /**
   * 生成空的趋势数据（用于API返回空数据时）
   */
  private generateEmptyTrendData(viewMode: 'daily' | 'weekly' | 'monthly', timeRange: '6months' | '12months'): any[] {
    const months = this.getLastNMonths(timeRange === '6months' ? 6 : 12);

    // 为每个月创建空数据点
    return months.map(month => ({
      date: month,
      amount: 0,
      total: 0
    }));
  }
}

export class CategoryBudgetService {
  private apiClient: any;
  private debug: boolean;

  constructor(options: BudgetServiceOptions) {
    this.apiClient = options.apiClient;
    this.debug = options.debug || false;
  }

  /**
   * 创建分类预算
   */
  async createCategoryBudget(data: CreateCategoryBudgetDto): Promise<CategoryBudget | null> {
    try {
      if (this.debug) {
        console.log('创建分类预算, 数据:', data);
      }
      const response = await this.apiClient.post('/category-budgets', data) as CategoryBudget;
      return response;
    } catch (error) {
      console.error('创建分类预算失败:', error);
      throw error;
    }
  }

  /**
   * 获取预算的分类预算列表
   */
  async getCategoryBudgetsByBudgetId(budgetId: string): Promise<CategoryBudget[]> {
    try {
      if (this.debug) {
        console.log(`获取分类预算列表, 预算ID: ${budgetId}`);
      }
      const response = await this.apiClient.get(`/category-budgets/budget/${budgetId}`) as CategoryBudget[];
      return response || [];
    } catch (error) {
      console.error('获取分类预算列表失败:', error);
      return [];
    }
  }

  /**
   * 更新分类预算
   */
  async updateCategoryBudget(id: string, data: Omit<UpdateCategoryBudgetDto, 'id'>): Promise<CategoryBudget | null> {
    try {
      if (this.debug) {
        console.log(`更新分类预算, ID: ${id}, 数据:`, data);
      }
      const response = await this.apiClient.put(`/category-budgets/${id}`, data) as CategoryBudget;
      return response;
    } catch (error) {
      console.error('更新分类预算失败:', error);
      throw error;
    }
  }

  /**
   * 删除分类预算
   */
  async deleteCategoryBudget(id: string): Promise<boolean> {
    try {
      if (this.debug) {
        console.log(`删除分类预算, ID: ${id}`);
      }
      await this.apiClient.delete(`/category-budgets/${id}`);
      return true;
    } catch (error) {
      console.error('删除分类预算失败:', error);
      throw error;
    }
  }
}
