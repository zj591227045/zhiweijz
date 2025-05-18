import { create } from 'zustand';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

// 预算详情数据类型
export interface Budget {
  id: string;
  name: string;
  accountBookId: string;
  accountBookName: string;
  accountBookType: 'PERSONAL' | 'FAMILY';
  familyId?: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  enableCategoryBudget: boolean;
  startDate: string;
  endDate: string;
  period: 'MONTHLY' | 'YEARLY';
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  daysTotal: number;
  daysRemaining: number;
  dailySpent: number;
  dailyAvailable: number;
  rollover: boolean;
  rolloverAmount?: number;
}

// 账本数据类型
export interface AccountBook {
  id: string;
  name: string;
  type: 'PERSONAL' | 'FAMILY';
  familyId?: string;
}

// 分类预算数据类型
export interface CategoryBudget {
  id: string;
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
}

// 结转记录数据类型
export interface RolloverRecord {
  id: string;
  budgetId: string;
  period: string;
  amount: number;
  type: 'SURPLUS' | 'DEFICIT';
  createdAt: string;
}

// 趋势数据点类型
export interface TrendPoint {
  date: string; // 或 week/month 标识
  amount: number;
  rolloverImpact: number;
  total: number;
}

// 交易数据类型
export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  time: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  budgetId: string;
}

// 预算详情状态类型
interface BudgetDetailState {
  // 数据状态
  budget: Budget | null;
  accountBook: AccountBook | null;
  categoryBudgets: CategoryBudget[];
  rolloverHistory: RolloverRecord[];
  trendData: {
    daily: TrendPoint[];
    weekly: TrendPoint[];
    monthly: TrendPoint[];
  };
  transactions: Transaction[];

  // UI状态
  isLoading: boolean;
  isRolloverHistoryOpen: boolean;
  chartViewMode: 'daily' | 'weekly' | 'monthly';
  showRolloverImpact: boolean;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  error: string | null;

  // 操作方法
  fetchBudgetDetail: (budgetId: string) => Promise<void>;
  fetchRolloverHistory: (budgetId: string) => Promise<void>;
  fetchTrendData: (budgetId: string, viewMode: 'daily' | 'weekly' | 'monthly') => Promise<void>;
  fetchTransactions: (budgetId: string, page?: number, familyMemberId?: string | null) => Promise<void>;
  setChartViewMode: (mode: 'daily' | 'weekly' | 'monthly') => void;
  toggleRolloverImpact: () => void;
  toggleRolloverHistory: () => void;
  toggleDeleteDialog: () => void;
  deleteBudget: (budgetId: string) => Promise<boolean>;
  resetState: () => void;
}

// 创建预算详情状态管理
export const useBudgetDetailStore = create<BudgetDetailState>((set, get) => ({
  // 初始数据状态
  budget: null,
  accountBook: null,
  categoryBudgets: [],
  rolloverHistory: [],
  trendData: {
    daily: [],
    weekly: [],
    monthly: []
  },
  transactions: [],

  // 初始UI状态
  isLoading: false,
  isRolloverHistoryOpen: false,
  chartViewMode: 'weekly',
  showRolloverImpact: true,
  isDeleteDialogOpen: false,
  isDeleting: false,
  error: null,

  // 获取预算详情
  fetchBudgetDetail: async (budgetId: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('获取预算详情:', budgetId);

      // 获取预算详情
      const budget = await apiClient.get<Budget>(`/budgets/${budgetId}`);
      console.log('预算详情数据:', budget);

      // 获取账本信息
      if (budget?.accountBookId) {
        const accountBook = await apiClient.get<AccountBook>(`/account-books/${budget.accountBookId}`);
        set({ accountBook });
      }

      // 获取分类预算（如果启用）
      if (budget?.enableCategoryBudget) {
        const categoryBudgets = await apiClient.get<CategoryBudget[]>(`/budgets/${budgetId}/categories`);
        set({ categoryBudgets: categoryBudgets || [] });
      }

      set({ budget, isLoading: false });
    } catch (error) {
      console.error('获取预算详情失败:', error);
      set({
        isLoading: false,
        error: '获取预算详情失败，请重试'
      });
    }
  },

  // 获取结转历史
  fetchRolloverHistory: async (budgetId: string) => {
    try {
      console.log('获取结转历史:', budgetId);
      const history = await apiClient.get<RolloverRecord[]>(`/budgets/${budgetId}/rollover-history`);
      set({ rolloverHistory: history || [] });
    } catch (error) {
      console.error('获取结转历史失败:', error);
      toast.error('获取结转历史失败');
    }
  },

  // 获取趋势数据
  fetchTrendData: async (budgetId: string, viewMode: 'daily' | 'weekly' | 'monthly') => {
    try {
      console.log('获取趋势数据:', budgetId, viewMode);
      const data = await apiClient.get<TrendPoint[]>(`/budgets/${budgetId}/trends?viewMode=${viewMode}`);

      // 更新对应视图模式的数据
      set(state => ({
        trendData: {
          ...state.trendData,
          [viewMode]: data || []
        }
      }));
    } catch (error) {
      console.error('获取趋势数据失败:', error);
      toast.error('获取趋势数据失败');
    }
  },

  // 获取相关交易
  fetchTransactions: async (budgetId: string, page = 1, familyMemberId?: string | null) => {
    try {
      console.log('获取相关交易:', budgetId, page, familyMemberId ? `家庭成员: ${familyMemberId}` : '所有成员');

      let url = `/budgets/${budgetId}/transactions?page=${page}&limit=10`;
      if (familyMemberId) {
        url += `&familyMemberId=${familyMemberId}`;
      }

      const response = await apiClient.get<Transaction[]>(url);

      // 如果是第一页，替换数据；否则追加数据
      if (page === 1) {
        set({ transactions: response || [] });
      } else {
        set(state => ({
          transactions: [...state.transactions, ...(response || [])]
        }));
      }
    } catch (error) {
      console.error('获取相关交易失败:', error);
      toast.error('获取相关交易失败');
    }
  },

  // 设置图表视图模式
  setChartViewMode: (mode: 'daily' | 'weekly' | 'monthly') => {
    set({ chartViewMode: mode });

    // 如果当前模式的数据为空，则获取数据
    const { trendData, budget } = get();
    if (budget && (!trendData[mode] || trendData[mode].length === 0)) {
      get().fetchTrendData(budget.id, mode);
    }
  },

  // 切换结转影响显示
  toggleRolloverImpact: () => {
    set(state => ({ showRolloverImpact: !state.showRolloverImpact }));
  },

  // 切换结转历史对话框
  toggleRolloverHistory: () => {
    const { isRolloverHistoryOpen, budget } = get();

    // 如果要打开对话框且结转历史为空，则获取数据
    if (!isRolloverHistoryOpen && budget && get().rolloverHistory.length === 0) {
      get().fetchRolloverHistory(budget.id);
    }

    set(state => ({ isRolloverHistoryOpen: !state.isRolloverHistoryOpen }));
  },

  // 切换删除对话框
  toggleDeleteDialog: () => {
    set(state => ({ isDeleteDialogOpen: !state.isDeleteDialogOpen }));
  },

  // 删除预算
  deleteBudget: async (budgetId: string) => {
    try {
      set({ isDeleting: true });
      console.log('删除预算:', budgetId);
      await apiClient.delete(`/budgets/${budgetId}`);
      set({ isDeleting: false, isDeleteDialogOpen: false });
      toast.success('预算已成功删除');
      return true;
    } catch (error) {
      console.error('删除预算失败:', error);
      set({ isDeleting: false });
      toast.error('删除预算失败，请重试');
      return false;
    }
  },

  // 重置状态
  resetState: () => {
    set({
      budget: null,
      accountBook: null,
      categoryBudgets: [],
      rolloverHistory: [],
      trendData: {
        daily: [],
        weekly: [],
        monthly: []
      },
      transactions: [],
      isLoading: false,
      isRolloverHistoryOpen: false,
      chartViewMode: 'weekly',
      showRolloverImpact: true,
      isDeleteDialogOpen: false,
      isDeleting: false,
      error: null
    });
  }
}));
