import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Budget } from '@/components/budgets/budget-list-card';

// 预算类型
export type BudgetType = 'PERSONAL' | 'GENERAL';

// 预算列表状态类型
interface BudgetListState {
  // 数据状态
  personalBudgets: Budget[];
  generalBudgets: Budget[];

  // UI状态
  selectedType: BudgetType;
  isLoading: boolean;
  error: string | null;
  showExpiredBudgets: boolean;

  // 操作方法
  fetchBudgets: (accountBookId: string) => Promise<void>;
  refreshBudgets: () => Promise<void>;
  setSelectedType: (type: BudgetType) => void;
  toggleShowExpiredBudgets: () => void;
  deleteBudget: (budgetId: string) => Promise<boolean>;
  resetState: () => void;

  // 内部状态
  lastAccountBookId: string | null;
}

// 创建预算列表状态管理
export const useBudgetListStore = create<BudgetListState>((set, get) => ({
  // 初始数据状态
  personalBudgets: [],
  generalBudgets: [],

  // 初始UI状态
  selectedType: 'PERSONAL',
  isLoading: false,
  error: null,
  showExpiredBudgets: false,

  // 内部状态
  lastAccountBookId: null,

  // 获取预算列表
  fetchBudgets: async (accountBookId: string) => {
    try {
      set({ isLoading: true, error: null, lastAccountBookId: accountBookId });
      console.log('获取预算列表:', accountBookId);

      // 获取个人预算
      const personalResponse = await apiClient.get('/budgets', {
        params: {
          accountBookId,
          budgetType: 'PERSONAL',
        },
      });

      // 获取通用预算
      const generalResponse = await apiClient.get('/budgets', {
        params: {
          accountBookId,
          budgetType: 'GENERAL',
        },
      });

      console.log('个人预算响应:', personalResponse);
      console.log('通用预算响应:', generalResponse);

      // 处理API响应，确保我们正确获取数据数组
      let personalBudgetsData = [];
      let generalBudgetsData = [];

      // 处理个人预算响应
      if (personalResponse) {
        if (Array.isArray(personalResponse)) {
          personalBudgetsData = personalResponse;
        } else if (personalResponse.data && Array.isArray(personalResponse.data)) {
          personalBudgetsData = personalResponse.data;
        } else if (personalResponse.budgets && Array.isArray(personalResponse.budgets)) {
          personalBudgetsData = personalResponse.budgets;
        }
      }

      // 处理通用预算响应
      if (generalResponse) {
        if (Array.isArray(generalResponse)) {
          generalBudgetsData = generalResponse;
        } else if (generalResponse.data && Array.isArray(generalResponse.data)) {
          generalBudgetsData = generalResponse.data;
        } else if (generalResponse.budgets && Array.isArray(generalResponse.budgets)) {
          generalBudgetsData = generalResponse.budgets;
        }
      }

      console.log('处理后的个人预算数据:', personalBudgetsData);
      console.log('处理后的通用预算数据:', generalBudgetsData);

      // 处理预算数据，添加警告和超支标志
      const processedPersonalBudgets = personalBudgetsData.map((budget: any) => {
        // 调试：打印原始预算数据
        console.log('原始预算数据:', {
          name: budget.name,
          amount: budget.amount,
          spent: budget.spent,
          percentage: budget.percentage,
          progress: budget.progress,
          remaining: budget.remaining,
        });

        // 获取当前账本类型
        const accountBookType = budget.accountBookType || 'PERSONAL';

        // 获取用户名称 - 从API响应中提取
        let userName = budget.userName;
        let familyMemberName = budget.familyMemberName;

        // 如果API没有返回userName，但返回了user对象，则从user对象中获取
        if (!userName && budget.user && budget.user.name) {
          userName = budget.user.name;
        }

        // 如果有familyMemberId但没有familyMemberName，使用userName作为备选
        if (budget.familyMemberId && !familyMemberName) {
          familyMemberName = userName;
        }

        // 确保percentage字段存在，如果不存在则从progress字段获取或计算
        const percentage =
          budget.percentage !== undefined
            ? budget.percentage
            : budget.progress !== undefined
              ? budget.progress
              : (() => {
                  // 计算总可用金额（基础预算 + 结转金额）
                  const totalAvailable = budget.amount + (budget.rolloverAmount || 0);
                  return totalAvailable > 0 ? (budget.spent / totalAvailable) * 100 : 0;
                })();

        const processedBudget = {
          ...budget,
          percentage, // 确保percentage字段存在
          warning: percentage >= 80 && percentage < 100,
          overSpent: percentage >= 100,
          accountBookType,
          userName,
          familyMemberName,
        };

        console.log('处理后的预算数据:', {
          name: processedBudget.name,
          amount: processedBudget.amount,
          spent: processedBudget.spent,
          rolloverAmount: processedBudget.rolloverAmount,
          remaining: processedBudget.remaining,
          adjustedRemaining: processedBudget.adjustedRemaining,
          percentage: processedBudget.percentage,
          warning: processedBudget.warning,
          overSpent: processedBudget.overSpent,
        });

        return processedBudget;
      });

      const processedGeneralBudgets = generalBudgetsData.map((budget: any) => {
        // 确保percentage字段存在，如果不存在则从progress字段获取或计算
        const percentage =
          budget.percentage !== undefined
            ? budget.percentage
            : budget.progress !== undefined
              ? budget.progress
              : (() => {
                  // 计算总可用金额（基础预算 + 结转金额）
                  const totalAvailable = budget.amount + (budget.rolloverAmount || 0);
                  return totalAvailable > 0 ? (budget.spent / totalAvailable) * 100 : 0;
                })();

        return {
          ...budget,
          percentage, // 确保percentage字段存在
          warning: percentage >= 80 && percentage < 100,
          overSpent: percentage >= 100,
          accountBookType: budget.accountBookType || 'PERSONAL',
        };
      });

      set({
        personalBudgets: processedPersonalBudgets,
        generalBudgets: processedGeneralBudgets,
        isLoading: false,
      });
    } catch (error) {
      console.error('获取预算列表失败:', error);
      set({
        isLoading: false,
        error: '获取预算列表失败，请重试',
      });
      toast.error('获取预算列表失败，请重试');
    }
  },

  // 刷新预算列表（使用上次的账本ID）
  refreshBudgets: async () => {
    const { lastAccountBookId } = get();
    if (lastAccountBookId) {
      console.log('刷新预算列表:', lastAccountBookId);
      await get().fetchBudgets(lastAccountBookId);
    }
  },

  // 设置选中的预算类型
  setSelectedType: (type: BudgetType) => {
    set({ selectedType: type });
  },

  // 切换显示已过期预算
  toggleShowExpiredBudgets: () => {
    set((state) => ({ showExpiredBudgets: !state.showExpiredBudgets }));
  },

  // 删除预算
  deleteBudget: async (budgetId: string) => {
    try {
      await apiClient.delete(`/budgets/${budgetId}`);

      // 更新状态，移除已删除的预算
      const { personalBudgets, generalBudgets } = get();

      set({
        personalBudgets: personalBudgets.filter((budget) => budget.id !== budgetId),
        generalBudgets: generalBudgets.filter((budget) => budget.id !== budgetId),
      });

      toast.success('预算已删除');
      return true;
    } catch (error) {
      console.error('删除预算失败:', error);
      toast.error('删除预算失败，请重试');
      return false;
    }
  },

  // 重置状态
  resetState: () => {
    set({
      personalBudgets: [],
      generalBudgets: [],
      selectedType: 'PERSONAL',
      isLoading: false,
      error: null,
    });
  },
}));
