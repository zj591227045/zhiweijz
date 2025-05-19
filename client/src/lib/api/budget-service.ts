import { apiClient } from '@/lib/api';
import {
  Budget,
  TotalBudget,
  BudgetResponse,
  BudgetQueryParams,
  CreateBudgetDto,
  UpdateBudgetDto,
  CategoryBudget,
  CreateCategoryBudgetDto,
  UpdateCategoryBudgetDto
} from '@/types/budget';

// 分类预算服务
class CategoryBudgetService {
  /**
   * 创建分类预算
   */
  async createCategoryBudget(data: CreateCategoryBudgetDto): Promise<CategoryBudget> {
    try {
      console.log(`发送创建分类预算请求: ${JSON.stringify(data)}`);
      const response = await apiClient.post<CategoryBudget>('/category-budgets', data);
      console.log('创建分类预算响应:', response);
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
      console.log(`发送获取分类预算列表请求: /category-budgets/budget/${budgetId}`);
      const response = await apiClient.get<CategoryBudget[]>(`/category-budgets/budget/${budgetId}`);
      console.log('获取分类预算列表响应:', response);
      return response;
    } catch (error) {
      console.error('获取分类预算列表失败:', error);
      return [];
    }
  }

  /**
   * 更新分类预算
   */
  async updateCategoryBudget(id: string, data: Omit<UpdateCategoryBudgetDto, 'id'>): Promise<CategoryBudget> {
    try {
      console.log(`发送更新分类预算请求: /category-budgets/${id}`);
      const response = await apiClient.put<CategoryBudget>(`/category-budgets/${id}`, data);
      console.log('更新分类预算响应:', response);
      return response;
    } catch (error) {
      console.error('更新分类预算失败:', error);
      throw error;
    }
  }

  /**
   * 删除分类预算
   */
  async deleteCategoryBudget(id: string): Promise<void> {
    try {
      console.log(`发送删除分类预算请求: /category-budgets/${id}`);
      await apiClient.delete(`/category-budgets/${id}`);
      console.log('删除分类预算成功');
    } catch (error) {
      console.error('删除分类预算失败:', error);
      throw error;
    }
  }
}

// 创建分类预算服务实例
export const categoryBudgetService = new CategoryBudgetService();

// 预算服务
export const budgetService = {
  /**
   * 获取预算列表
   */
  async getBudgets(params: BudgetQueryParams): Promise<BudgetResponse> {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();

      // 确保账本ID存在且有效
      if (params.accountBookId) {
        console.log('使用账本ID获取预算:', params.accountBookId);
        queryParams.append('accountBookId', params.accountBookId);
      } else {
        console.warn('获取预算时没有提供账本ID');
      }

      queryParams.append('period', params.period);
      queryParams.append('startDate', params.startDate);
      queryParams.append('endDate', params.endDate);

      if (params.familyMemberId) {
        queryParams.append('familyMemberId', params.familyMemberId);
      }

      if (params.filter && params.filter !== 'all') {
        queryParams.append('filter', params.filter);
      }

      // 发送请求
      console.log(`发送预算请求: /budgets?${queryParams.toString()}`);
      const response = await apiClient.get<BudgetResponse>(`/budgets?${queryParams.toString()}`);
      console.log('预算响应数据:', response);

      // 处理响应数据
      let processedResponse: BudgetResponse;

      if (response && typeof response === 'object') {
        console.log('处理预算响应数据 - 原始格式:', response);

        // 检查是否是分页格式（包含data字段）
        const budgetData = Array.isArray(response.data) ? response.data : [];
        console.log('处理预算响应数据 - 提取的预算数组:', budgetData);

        // 分离总预算和分类预算
        let totalBudgetItem = budgetData.find(budget =>
          budget.name === '个人预算' || budget.name === '年度总预算' || !budget.categoryId
        );

        // 分类预算（有categoryId的预算）
        const categoryBudgets = budgetData.filter(budget =>
          budget.categoryId && budget.name !== '个人预算' && budget.name !== '年度总预算'
        );

        console.log('处理预算响应数据 - 总预算项:', totalBudgetItem);
        console.log('处理预算响应数据 - 分类预算:', categoryBudgets);

        // 如果没有找到总预算项，创建一个默认的
        if (!totalBudgetItem) {
          totalBudgetItem = {
            id: 'default-total-budget',
            name: '个人预算',
            amount: categoryBudgets.reduce((sum, budget) => sum + (budget.amount || 0), 0),
            spent: categoryBudgets.reduce((sum, budget) => sum + (budget.spent || 0), 0),
            remaining: 0,
            percentage: 0,
            isOverspent: false,
            rollover: false,
            enableCategoryBudget: true,
            userId: '',
            period: 'MONTHLY'
          };

          // 计算剩余金额和百分比
          totalBudgetItem.remaining = totalBudgetItem.amount - totalBudgetItem.spent;
          totalBudgetItem.percentage = totalBudgetItem.amount > 0
            ? (totalBudgetItem.spent / totalBudgetItem.amount) * 100
            : 0;
          totalBudgetItem.isOverspent = totalBudgetItem.spent > totalBudgetItem.amount;
        }

        // 构建总预算对象
        const totalBudget: TotalBudget = {
          amount: totalBudgetItem.amount || 0,
          spent: totalBudgetItem.spent || 0,
          remaining: totalBudgetItem.remaining || 0,
          percentage: totalBudgetItem.percentage || 0,
          daysRemaining: calculateDaysRemaining(),
          rolloverAmount: totalBudgetItem.rolloverAmount,
          dailyAvailable: calculateDailyAvailable(totalBudgetItem.remaining || 0)
        };

        // 确保familyBudgets是对象
        const familyBudgets = response.familyBudgets && typeof response.familyBudgets === 'object'
          ? response.familyBudgets
          : {};

        processedResponse = {
          totalBudget,
          budgets: categoryBudgets,
          familyBudgets
        };

        console.log('处理后的预算响应数据:', processedResponse);
      } else {
        // 如果响应不是预期的格式，返回默认数据
        console.warn('预算响应数据格式不符合预期:', response);
        processedResponse = {
          totalBudget: {
            amount: 0,
            spent: 0,
            remaining: 0,
            percentage: 0,
            daysRemaining: calculateDaysRemaining(),
            dailyAvailable: 0
          },
          budgets: []
        };
      }

      // 辅助函数：计算剩余天数
      function calculateDaysRemaining(): number {
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const diffTime = endOfMonth.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // 辅助函数：计算日均可用金额
      function calculateDailyAvailable(remaining: number): number {
        const daysRemaining = calculateDaysRemaining();
        return daysRemaining > 0 ? remaining / daysRemaining : 0;
      }

      return processedResponse;
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
  },

  /**
   * 删除预算
   */
  async deleteBudget(budgetId: string): Promise<void> {
    try {
      await apiClient.delete(`/budgets/${budgetId}`);
    } catch (error) {
      console.error('删除预算失败:', error);
      throw error;
    }
  },

  /**
   * 获取预算详情
   */
  async getBudgetById(budgetId: string): Promise<Budget> {
    try {
      console.log(`发送获取预算详情请求: /budgets/${budgetId}`);
      const response = await apiClient.get<Budget>(`/budgets/${budgetId}`);
      console.log('获取预算详情响应:', response);
      return response;
    } catch (error) {
      console.error('获取预算详情失败:', error);
      throw error;
    }
  },

  /**
   * 获取预算趋势数据
   * @param budgetId 预算ID
   * @param viewMode 视图模式：日/周/月
   * @param timeRange 时间范围：6个月或12个月
   * @param familyMemberId 家庭成员ID（可选）
   */
  async getBudgetTrends(
    budgetId: string,
    viewMode: 'daily' | 'weekly' | 'monthly' = 'monthly',
    timeRange: '6months' | '12months' = '6months',
    familyMemberId?: string
  ): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('viewMode', viewMode);
      // 始终请求12个月的数据，前端根据timeRange参数决定显示多少
      queryParams.append('timeRange', '12months');

      // 如果指定了家庭成员ID，添加到查询参数中
      if (familyMemberId) {
        queryParams.append('familyMemberId', familyMemberId);
      }

      console.log(`发送获取预算趋势请求: /budgets/${budgetId}/trends?${queryParams.toString()}`);
      const response = await apiClient.get<any[]>(`/budgets/${budgetId}/trends?${queryParams.toString()}`);
      console.log('获取预算趋势响应:', response);

      // 如果没有数据或数据不足，填充缺失的月份
      if (!response || !Array.isArray(response) || response.length === 0) {
        console.log('趋势数据为空或格式不正确，生成空数据');
        return this.generateEmptyTrendData(viewMode, '12months');
      }

      // 检查响应数据格式是否符合预期
      const validData = response.every(item =>
        item && typeof item === 'object' && 'date' in item && 'amount' in item
      );

      if (!validData) {
        console.log('趋势数据格式不符合预期，生成空数据');
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

      console.log('处理后的趋势数据:', result);
      return result;
    } catch (error) {
      console.error('获取预算趋势失败:', error);
      return this.generateEmptyTrendData(viewMode, timeRange);
    }
  },

  /**
   * 获取最近N个月的月份列表（YYYY-MM格式）
   */
  getLastNMonths(n: number): string[] {
    const result = [];
    const today = new Date();

    for (let i = n - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      result.push(`${year}-${month}`);
    }

    return result;
  },

  /**
   * 生成空的趋势数据（用于API返回空数据时）
   */
  generateEmptyTrendData(viewMode: 'daily' | 'weekly' | 'monthly', timeRange: '6months' | '12months'): any[] {
    const months = this.getLastNMonths(timeRange === '6months' ? 6 : 12);

    // 为每个月创建空数据点
    return months.map(month => ({
      date: month,
      amount: 0,
      total: 0
    }));
  },

  /**
   * 获取预算统计数据
   */
  async getBudgetStatistics(params: {
    accountBookId: string;
    budgetType?: 'PERSONAL' | 'GENERAL'; // 设为可选参数
    month: string;
    userId?: string; // 保留参数但不使用
  }): Promise<any> {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();

      if (params.accountBookId) {
        queryParams.append('accountBookId', params.accountBookId);
      }

      // 移除budgetType参数，后端不接受此参数
      // if (params.budgetType) {
      //   queryParams.append('budgetType', params.budgetType);
      // }

      queryParams.append('month', params.month);

      // 移除userId参数，后端不接受此参数
      // if (params.userId) {
      //   queryParams.append('userId', params.userId);
      // }

      console.log(`发送获取预算统计请求: /statistics/budgets?${queryParams.toString()}`);
      const response = await apiClient.get<any>(`/statistics/budgets?${queryParams.toString()}`);
      console.log('获取预算统计响应:', response);

      // 后端已经返回完整数据，不再需要额外调用getActiveBudgets
      if (!response?.overview && params.accountBookId) {
        console.log('未获取到预算概览数据，返回空数据');
      }

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
  },

  /**
   * 计算剩余天数
   */
  calculateDaysRemaining(endDate?: string): number {
    if (!endDate) return 0;

    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  },

  /**
   * 计算日均消费
   */
  calculateDailySpent(spent: number, startDate?: string): number {
    if (!startDate) return 0;

    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const daysPassed = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return spent / daysPassed;
  },

  /**
   * 计算日均可用
   */
  calculateDailyAvailable(remaining: number, endDate?: string): number {
    const daysRemaining = this.calculateDaysRemaining(endDate);
    return daysRemaining > 0 ? remaining / daysRemaining : 0;
  },

  /**
   * 获取活跃预算
   * @param accountBookId 可选的账本ID，用于过滤特定账本的预算
   */
  async getActiveBudgets(accountBookId?: string): Promise<any[]> {
    try {
      let url = '/budgets/active';
      if (accountBookId) {
        url += `?accountBookId=${accountBookId}`;
      }
      console.log(`发送获取活跃预算请求: ${url}`);
      const response = await apiClient.get<any[]>(url);
      console.log('获取活跃预算响应:', response);
      return response || [];
    } catch (error) {
      console.error('获取活跃预算失败:', error);
      return [];
    }
  },

  /**
   * 获取预算结转历史
   */
  async getRolloverHistory(budgetId: string): Promise<any[]> {
    try {
      console.log(`发送获取结转历史请求: /budgets/${budgetId}/rollover-history`);
      const response = await apiClient.get<any[]>(`/budgets/${budgetId}/rollover-history`);
      console.log('获取结转历史响应:', response);
      return response || [];
    } catch (error) {
      console.error('获取结转历史失败:', error);
      return [];
    }
  },

  /**
   * 获取预算相关交易
   * @param budgetId 预算ID
   * @param page 页码
   * @param limit 每页数量
   * @param familyMemberId 家庭成员ID（可选）
   */
  async getBudgetTransactions(
    budgetId: string,
    page: number = 1,
    limit: number = 10,
    familyMemberId?: string
  ): Promise<any> {
    try {
      let url = `/budgets/${budgetId}/transactions?page=${page}&limit=${limit}`;

      // 如果指定了家庭成员ID，添加到查询参数中
      if (familyMemberId) {
        url += `&familyMemberId=${familyMemberId}`;
      }

      console.log(`发送获取预算交易请求: ${url}`);
      const response = await apiClient.get<any>(url);
      console.log('获取预算交易响应:', response, '家庭成员ID:', familyMemberId || '无');
      return response || { data: [], hasMore: false, nextPage: null };
    } catch (error) {
      console.error('获取预算交易失败:', error);
      return { data: [], hasMore: false, nextPage: null };
    }
  },

  /**
   * 创建预算
   */
  async createBudget(budgetData: CreateBudgetDto): Promise<Budget> {
    try {
      const response = await apiClient.post<Budget>('/budgets', budgetData);
      return response;
    } catch (error) {
      console.error('创建预算失败:', error);
      throw error;
    }
  },

  /**
   * 更新预算
   */
  async updateBudget(budgetId: string, budgetData: UpdateBudgetDto): Promise<Budget> {
    try {
      const response = await apiClient.put<Budget>(`/budgets/${budgetId}`, budgetData);
      return response;
    } catch (error) {
      console.error('更新预算失败:', error);
      throw error;
    }
  },

  /**
   * 启用/禁用分类预算
   */
  async toggleCategoryBudget(id: string, enable: boolean): Promise<Budget> {
    try {
      console.log(`发送${enable ? '启用' : '禁用'}分类预算请求: /budgets/${id}`);
      const response = await apiClient.put<Budget>(`/budgets/${id}`, {
        enableCategoryBudget: enable
      });
      console.log(`${enable ? '启用' : '禁用'}分类预算响应:`, response);
      return response;
    } catch (error) {
      console.error(`${enable ? '启用' : '禁用'}分类预算失败:`, error);
      throw error;
    }
  }
};

// 账本服务
export const accountBookService = {
  /**
   * 获取账本列表
   */
  async getAccountBooks() {
    try {
      console.log('发送账本请求: /account-books');
      const response = await apiClient.get('/account-books');
      console.log('账本响应数据:', response);

      // 处理不同的响应格式
      if (response && typeof response === 'object') {
        // 如果响应是对象且有data字段，且data是数组
        if (Array.isArray(response.data)) {
          console.log('账本数据格式为分页格式，提取data字段');
          return response.data;
        }

        // 如果响应本身是数组
        if (Array.isArray(response)) {
          console.log('账本数据格式为数组');
          return response;
        }
      }

      // 默认返回响应
      return response || [];
    } catch (error) {
      console.error('获取账本列表失败:', error);
      return [];
    }
  },

  /**
   * 获取默认账本
   */
  async getDefaultAccountBook() {
    try {
      console.log('发送默认账本请求: /account-books/default');
      const response = await apiClient.get('/account-books/default');
      console.log('默认账本响应数据:', response);
      return response;
    } catch (error) {
      console.error('获取默认账本失败:', error);
      return null;
    }
  }
};

// 家庭成员服务
export const familyService = {
  /**
   * 获取家庭成员列表
   */
  async getFamilyMembers(familyId: string) {
    try {
      console.log(`发送家庭成员请求: /families/${familyId}/members`);
      const response = await apiClient.get(`/families/${familyId}/members`);
      console.log('家庭成员响应数据:', response);
      return response;
    } catch (error) {
      console.error('获取家庭成员列表失败:', error);
      return [];
    }
  }
};
