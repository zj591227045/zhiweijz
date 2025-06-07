import { apiClient } from './api-client';
import { getCurrentMonthRange } from './utils';

// 账本相关API
export const accountBookService = {
  // 获取所有账本
  getAccountBooks: () => {
    return apiClient.get('/account-books');
  },

  // 获取默认账本
  getDefaultAccountBook: () => {
    return apiClient.get('/account-books/default');
  },

  // 获取单个账本
  getAccountBook: (id: string) => {
    return apiClient.get(`/account-books/${id}`);
  },

  // 创建账本
  createAccountBook: (data: any) => {
    return apiClient.post('/account-books', data);
  },

  // 更新账本
  updateAccountBook: (id: string, data: any) => {
    return apiClient.put(`/account-books/${id}`, data);
  },

  // 删除账本
  deleteAccountBook: (id: string) => {
    return apiClient.delete(`/account-books/${id}`);
  },

  // 设置默认账本
  setDefaultAccountBook: (id: string) => {
    return apiClient.put(`/account-books/${id}/default`);
  },
};

// 交易相关API
export const transactionService = {
  // 获取所有交易
  getTransactions: (params?: any) => {
    return apiClient.get('/transactions', { params });
  },

  // 获取单个交易
  getTransaction: (id: string) => {
    return apiClient.get(`/transactions/${id}`);
  },

  // 创建交易
  createTransaction: (data: any) => {
    return apiClient.post('/transactions', data);
  },

  // 更新交易
  updateTransaction: (id: string, data: any) => {
    return apiClient.put(`/transactions/${id}`, data);
  },

  // 删除交易
  deleteTransaction: (id: string) => {
    return apiClient.delete(`/transactions/${id}`);
  },

  // 获取最近交易
  getRecentTransactions: (accountBookId: string, limit: number = 10) => {
    return apiClient.get('/transactions', {
      params: {
        accountBookId,
        limit,
        sort: 'date:desc',
      },
    });
  },

  // 获取按日期分组的交易
  getGroupedTransactions: (accountBookId: string, params?: any) => {
    const defaultParams = {
      accountBookId,
      groupBy: 'date',
      sort: 'date:desc',
    };
    return apiClient.get('/transactions/grouped', {
      params: { ...defaultParams, ...params },
    });
  },
};

// 分类相关API（集成缓存）
export const categoryService = {
  // 获取所有分类（带缓存）
  getCategories: async (params?: any) => {
    // 动态导入缓存服务以避免循环依赖
    const { categoryCacheService } = await import('../services/category-cache.service');
    const { useAuthStore } = await import('../store/auth-store');

    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      return apiClient.get('/categories', { params });
    }

    const type = params?.type as 'EXPENSE' | 'INCOME' | undefined;

    // 尝试从缓存获取
    const cachedCategories = categoryCacheService.getCachedCategories(userId, type);
    if (cachedCategories) {
      console.log('CategoryService: 使用缓存数据');
      return cachedCategories;
    }

    // 从API获取数据
    console.log('CategoryService: 从API获取数据');
    const response = await apiClient.get('/categories', { params });

    // 缓存数据
    if (Array.isArray(response)) {
      categoryCacheService.setCachedCategories(userId, response, type);
    }

    return response;
  },

  // 获取单个分类
  getCategory: (id: string) => {
    return apiClient.get(`/categories/${id}`);
  },

  // 创建分类（清除缓存）
  createCategory: async (data: any) => {
    const response = await apiClient.post('/categories', data);

    // 清除缓存
    const { categoryCacheService } = await import('../services/category-cache.service');
    const { useAuthStore } = await import('../store/auth-store');
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      categoryCacheService.clearAllUserCache(userId);
      console.log('CategoryService: 创建分类后清除缓存');
    }

    return response;
  },

  // 更新分类（清除缓存）
  updateCategory: async (id: string, data: any) => {
    const response = await apiClient.put(`/categories/${id}`, data);

    // 清除缓存
    const { categoryCacheService } = await import('../services/category-cache.service');
    const { useAuthStore } = await import('../store/auth-store');
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      categoryCacheService.clearAllUserCache(userId);
      console.log('CategoryService: 更新分类后清除缓存');
    }

    return response;
  },

  // 删除分类（清除缓存）
  deleteCategory: async (id: string) => {
    const response = await apiClient.delete(`/categories/${id}`);

    // 清除缓存
    const { categoryCacheService } = await import('../services/category-cache.service');
    const { useAuthStore } = await import('../store/auth-store');
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      categoryCacheService.clearAllUserCache(userId);
      console.log('CategoryService: 删除分类后清除缓存');
    }

    return response;
  },

  // 更新分类排序（清除缓存）
  updateCategoryOrder: async (data: any) => {
    const response = await apiClient.put('/categories/order', data);

    // 清除缓存
    const { categoryCacheService } = await import('../services/category-cache.service');
    const { useAuthStore } = await import('../store/auth-store');
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      categoryCacheService.clearAllUserCache(userId);
      console.log('CategoryService: 更新分类排序后清除缓存');
    }

    return response;
  },

  // 清除分类缓存
  clearCache: async () => {
    const { categoryCacheService } = await import('../services/category-cache.service');
    const { useAuthStore } = await import('../store/auth-store');
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      categoryCacheService.clearAllUserCache(userId);
      console.log('CategoryService: 手动清除缓存');
    }
  },
};

// 预算相关API
export const budgetService = {
  // 获取所有预算
  getBudgets: (params?: any) => {
    return apiClient.get('/budgets', { params });
  },

  // 获取单个预算
  getBudget: (id: string) => {
    return apiClient.get(`/budgets/${id}`);
  },

  // 创建预算
  createBudget: (data: any) => {
    return apiClient.post('/budgets', data);
  },

  // 更新预算
  updateBudget: (id: string, data: any) => {
    return apiClient.put(`/budgets/${id}`, data);
  },

  // 删除预算
  deleteBudget: (id: string) => {
    return apiClient.delete(`/budgets/${id}`);
  },

  // 获取预算统计
  getBudgetStatistics: (accountBookId: string, params?: any) => {
    const defaultParams = {
      accountBookId,
    };
    return apiClient.get('/statistics/budgets', {
      params: { ...defaultParams, ...params },
    });
  },

  // 获取预算趋势数据
  getBudgetTrends: (budgetId: string, params?: any) => {
    return apiClient.get(`/budgets/${budgetId}/trends`, { params });
  },

  // 获取预算交易记录
  getBudgetTransactions: (budgetId: string, params?: any) => {
    return apiClient.get(`/budgets/${budgetId}/transactions`, { params });
  },

  // 获取预算结转历史（兼容旧版本）
  getBudgetRolloverHistory: (budgetId: string) => {
    return apiClient.get(`/budgets/${budgetId}/rollover-history`);
  },

  // 根据日期获取预算列表
  getBudgetsByDate: (date: string, accountBookId: string) => {
    return apiClient.get('/budgets/by-date', {
      params: { date, accountBookId }
    });
  },


};

// 统计相关API
export const statisticsService = {
  // 获取统计数据
  getStatistics: (accountBookId: string, params?: any) => {
    const { startDate, endDate } = getCurrentMonthRange();
    const defaultParams = {
      accountBookId,
      startDate,
      endDate,
    };
    return apiClient.get('/statistics/overview', {
      params: { ...defaultParams, ...params },
    });
  },

  // 获取月度统计
  getMonthlyStatistics: (accountBookId: string, yearMonth: string) => {
    const year = parseInt(yearMonth.split('-')[0]);
    const month = parseInt(yearMonth.split('-')[1]);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return apiClient.get('/statistics/overview', {
      params: {
        accountBookId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    });
  },

  // 获取当前月份统计
  getCurrentMonthStatistics: (accountBookId: string) => {
    const { startDate, endDate } = getCurrentMonthRange();
    return apiClient.get('/statistics/overview', {
      params: {
        accountBookId,
        startDate,
        endDate,
      },
    });
  },
};

// 仪表盘相关API
export const dashboardService = {
  // 获取仪表盘数据
  getDashboardData: (accountBookId: string) => {
    return apiClient.get(`/dashboard?accountBookId=${accountBookId}`);
  },
};

// 导出相关API
export const exportService = {
  // 导出交易记录
  exportTransactions: (accountBookId: string, format: 'csv' | 'json' = 'csv') => {
    return apiClient.post(
      `/transactions/export?accountBookId=${accountBookId}`,
      {
        format,
      },
      {
        responseType: 'blob',
      },
    );
  },
};

// 反馈相关API
export const feedbackService = {
  // 提交反馈
  submitFeedback: (data: {
    type: 'bug' | 'feature' | 'other';
    title: string;
    content: string;
    contact?: string;
  }) => {
    return apiClient.post('/feedback', data);
  },

  // 获取用户反馈列表
  getUserFeedbacks: () => {
    return apiClient.get('/feedback/my');
  },
};
