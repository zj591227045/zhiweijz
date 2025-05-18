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
          budget.name === '月度总预算' || budget.name === '年度总预算' || !budget.categoryId
        );

        // 分类预算（有categoryId的预算）
        const categoryBudgets = budgetData.filter(budget =>
          budget.categoryId && budget.name !== '月度总预算' && budget.name !== '年度总预算'
        );

        console.log('处理预算响应数据 - 总预算项:', totalBudgetItem);
        console.log('处理预算响应数据 - 分类预算:', categoryBudgets);

        // 如果没有找到总预算项，创建一个默认的
        if (!totalBudgetItem) {
          totalBudgetItem = {
            id: 'default-total-budget',
            name: '月度总预算',
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
      const response = await apiClient.get<Budget>(`/budgets/${budgetId}`);
      return response;
    } catch (error) {
      console.error('获取预算详情失败:', error);
      throw error;
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
