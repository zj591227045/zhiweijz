import { apiClient } from '@/lib/api-client';

export interface CreateBudgetRequest {
  name: string;
  amount: number;
  accountBookId: string;
  categoryId?: string;
  startDate: string;
  endDate?: string;
  period: 'monthly' | 'weekly' | 'yearly' | 'custom';
  rollover?: boolean;
  enableCategoryBudget?: boolean;
  familyMemberId?: string;
}

export interface BudgetResponse {
  id: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  accountBookId: string;
  categoryId?: string;
  startDate: string;
  endDate?: string;
  period: string;
  rollover: boolean;
  enableCategoryBudget: boolean;
  familyMemberId?: string;
  userId?: string;
  budgetType?: 'PERSONAL' | 'FAMILY';
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

/**
 * 预算API服务
 */
export class BudgetApiService {
  /**
   * 创建预算
   */
  static async createBudget(data: CreateBudgetRequest): Promise<BudgetResponse> {
    try {
      const response = await apiClient.post('/budgets', data);
      return response;
    } catch (error: any) {
      console.error('创建预算失败:', error);
      throw new Error(error.response?.data?.message || '创建预算失败');
    }
  }

  /**
   * 获取预算列表
   */
  static async getBudgets(params?: {
    accountBookId?: string;
    familyMemberId?: string;
    startDate?: string;
    endDate?: string;
    budgetType?: 'PERSONAL' | 'FAMILY';
  }): Promise<BudgetResponse[]> {
    try {
      const response = await apiClient.get('/budgets', { params });
      return Array.isArray(response) ? response : response.data || [];
    } catch (error: any) {
      console.error('获取预算列表失败:', error);
      throw new Error(error.response?.data?.message || '获取预算列表失败');
    }
  }

  /**
   * 获取预算详情
   */
  static async getBudgetById(id: string): Promise<BudgetResponse> {
    try {
      const response = await apiClient.get(`/budgets/${id}`);
      return response;
    } catch (error: any) {
      console.error('获取预算详情失败:', error);
      throw new Error(error.response?.data?.message || '获取预算详情失败');
    }
  }

  /**
   * 更新预算
   */
  static async updateBudget(
    id: string,
    data: Partial<CreateBudgetRequest>,
  ): Promise<BudgetResponse> {
    try {
      const response = await apiClient.put(`/budgets/${id}`, data);
      return response;
    } catch (error: any) {
      console.error('更新预算失败:', error);
      throw new Error(error.response?.data?.message || '更新预算失败');
    }
  }

  /**
   * 删除预算
   */
  static async deleteBudget(id: string): Promise<void> {
    try {
      await apiClient.delete(`/budgets/${id}`);
    } catch (error: any) {
      console.error('删除预算失败:', error);
      throw new Error(error.response?.data?.message || '删除预算失败');
    }
  }

  /**
   * 获取活跃预算
   */
  static async getActiveBudgets(accountBookId?: string): Promise<BudgetResponse[]> {
    try {
      const params = accountBookId ? { accountBookId } : undefined;
      const response = await apiClient.get('/budgets/active', { params });
      return Array.isArray(response) ? response : response.data || [];
    } catch (error: any) {
      console.error('获取活跃预算失败:', error);
      throw new Error(error.response?.data?.message || '获取活跃预算失败');
    }
  }

  /**
   * 根据日期获取预算列表
   */
  static async getBudgetsByDate(date: string, accountBookId: string): Promise<BudgetResponse[]> {
    try {
      const response = await apiClient.get('/budgets/by-date', {
        params: { date, accountBookId },
      });
      return Array.isArray(response) ? response : response.data || [];
    } catch (error: any) {
      console.error('根据日期获取预算失败:', error);
      throw new Error(error.response?.data?.message || '根据日期获取预算失败');
    }
  }

  /**
   * 批量创建预算（用于引导流程）
   */
  static async createBudgets(budgets: CreateBudgetRequest[]): Promise<BudgetResponse[]> {
    try {
      const results = await Promise.all(budgets.map((budget) => this.createBudget(budget)));
      return results;
    } catch (error: any) {
      console.error('批量创建预算失败:', error);
      throw new Error('批量创建预算失败');
    }
  }
}
