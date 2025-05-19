import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { budgetService } from '@/lib/api/budget-service';
import { useAccountBookStore } from './account-book-store';
import dayjs from 'dayjs';

// 趋势数据点类型
export interface TrendPoint {
  date: string;
  amount: number;
  total?: number;
}

// 分类预算类型
export interface CategoryBudget {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverspent: boolean;
}

// 预算概览类型
export interface BudgetOverview {
  id: string;
  name: string;
  period: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  rollover: number;
  daysRemaining: number;
  dailySpent: number;
  dailyAvailable: number;
}

// 预算卡片类型
export interface BudgetCard {
  id: string;
  name: string;
  period: string;
  type?: 'PERSONAL' | 'GENERAL'; // 添加预算类型字段
  userId?: string;
  userName?: string;
}

// 交易记录类型
export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  type: 'EXPENSE' | 'INCOME';
}

// 预算统计状态类型
interface BudgetStatisticsState {
  // 预算类型
  budgetType: 'personal' | 'general';

  // 当前选中的预算
  selectedBudgetId: string | null;

  // 预算卡片列表
  budgetCards: BudgetCard[];

  // 家庭成员列表（家庭账本模式）
  familyMembers: { id: string; name: string; budgetId: string }[];

  // 预算概览数据
  overview: BudgetOverview | null;

  // 预算趋势数据
  trendData: {
    daily: TrendPoint[];
    weekly: TrendPoint[];
    monthly: TrendPoint[];
  };

  // 分类预算列表
  categoryBudgets: CategoryBudget[];

  // 最近交易
  recentTransactions: Transaction[];

  // 图表视图模式
  chartViewMode: 'daily' | 'weekly' | 'monthly';

  // 是否显示结转影响
  showRolloverImpact: boolean;

  // 分类预算筛选选项
  categoryFilter: 'all' | 'overspent';

  // 是否启用分类预算
  enableCategoryBudget: boolean;

  // UI状态
  isLoading: boolean;
  isLoadingTrends: boolean;
  error: string | null;

  // 操作方法
  setBudgetType: (type: 'personal' | 'general') => void;
  setSelectedBudgetId: (id: string | null) => void;
  setChartViewMode: (mode: 'daily' | 'weekly' | 'monthly') => void;
  toggleRolloverImpact: () => void;
  setCategoryFilter: (filter: 'all' | 'overspent') => void;
  fetchBudgetStatistics: (accountBookId: string, budgetType?: 'personal' | 'general', userId?: string) => Promise<void>;
  fetchBudgetTrends: (budgetId: string, viewMode: 'daily' | 'weekly' | 'monthly') => Promise<void>;
  resetState: () => void;
}

// 创建预算统计状态仓库
export const useBudgetStatisticsStore = create<BudgetStatisticsState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      budgetType: 'personal',
      selectedBudgetId: null,
      budgetCards: [],
      familyMembers: [],
      overview: null,
      trendData: {
        daily: [],
        weekly: [],
        monthly: []
      },
      categoryBudgets: [],
      recentTransactions: [],
      chartViewMode: 'monthly', // 默认显示月视图
      showRolloverImpact: true,
      categoryFilter: 'all',
      enableCategoryBudget: false,
      isLoading: false,
      isLoadingTrends: false,
      error: null,

      // 设置预算类型
      setBudgetType: (type) => set({ budgetType: type }),

      // 设置选中的预算ID
      setSelectedBudgetId: (id) => set({ selectedBudgetId: id }),

      // 设置图表视图模式
      setChartViewMode: (mode) => {
        set({ chartViewMode: mode });

        // 如果已有预算ID，获取对应视图模式的趋势数据
        const { selectedBudgetId } = get();
        if (selectedBudgetId) {
          get().fetchBudgetTrends(selectedBudgetId, mode);
        }
      },

      // 切换是否显示结转影响
      toggleRolloverImpact: () => set(state => ({
        showRolloverImpact: !state.showRolloverImpact
      })),

      // 设置分类预算筛选选项
      setCategoryFilter: (filter) => set({ categoryFilter: filter }),

      // 获取预算统计数据
      fetchBudgetStatistics: async (accountBookId, budgetType, userId) => {
        try {
          set({ isLoading: true, error: null });

          // 构建请求参数
          const params: any = {
            accountBookId,
            // 移除budgetType参数，后端不接受此参数
            // budgetType: budgetType === 'personal' ? 'PERSONAL' : 'GENERAL',
            month: dayjs().format('YYYY-MM')
          };

          // 家庭账本模式下，不再添加用户ID，后端不接受此参数
          // if (userId) {
          //   params.userId = userId;
          // }

          // 调用API获取预算统计数据
          const response = await budgetService.getBudgetStatistics(params);

          // 根据当前选择的预算类型过滤数据
          const currentBudgetType = get().budgetType;

          // 过滤预算卡片
          let filteredBudgetCards = response.budgetCards || [];
          if (response.budgetCards && response.budgetCards.length > 0) {
            filteredBudgetCards = response.budgetCards.filter(card => {
              // 如果是个人预算，只显示PERSONAL类型的预算
              if (currentBudgetType === 'personal') {
                return card.type === 'PERSONAL';
              }
              // 如果是通用预算，只显示GENERAL类型的预算
              return card.type === 'GENERAL';
            });
          }

          // 更新状态
          set({
            budgetCards: filteredBudgetCards,
            familyMembers: response.familyMembers || [],
            overview: filteredBudgetCards.length > 0 ? response.overview || null : null,
            categoryBudgets: response.categories || [],
            recentTransactions: response.recentTransactions || [],
            selectedBudgetId: filteredBudgetCards.length > 0 ? filteredBudgetCards[0]?.id || null : null,
            enableCategoryBudget: response.enableCategoryBudget || false,
            isLoading: false
          });

          // 如果有选中的预算ID，获取该预算的趋势数据
          const selectedBudgetId = filteredBudgetCards.length > 0 ? filteredBudgetCards[0]?.id || null : null;
          if (selectedBudgetId) {
            get().fetchBudgetTrends(selectedBudgetId, get().chartViewMode);
          }
        } catch (error) {
          console.error('获取预算统计数据失败:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : '获取预算统计数据失败'
          });
        }
      },

      // 获取预算趋势数据
      fetchBudgetTrends: async (budgetId, viewMode) => {
        try {
          set({ isLoadingTrends: true });

          // 调用API获取预算趋势数据
          const trendData = await budgetService.getBudgetTrends(budgetId, viewMode);

          // 获取预算详情，更新overview
          try {
            const budgetDetails = await budgetService.getBudgetById(budgetId);
            if (budgetDetails) {
              // 构建overview对象
              const overview = {
                id: budgetDetails.id,
                name: budgetDetails.name,
                period: `${new Date(budgetDetails.startDate).toLocaleDateString()} - ${new Date(budgetDetails.endDate).toLocaleDateString()}`,
                amount: Number(budgetDetails.amount),
                spent: Number(budgetDetails.spent || 0),
                remaining: Number(budgetDetails.amount) - Number(budgetDetails.spent || 0),
                percentage: budgetDetails.amount > 0 ? (Number(budgetDetails.spent || 0) / Number(budgetDetails.amount)) * 100 : 0,
                rollover: Number(budgetDetails.rolloverAmount || 0),
                daysRemaining: budgetService.calculateDaysRemaining(budgetDetails.endDate),
                dailySpent: budgetService.calculateDailySpent(budgetDetails.spent || 0, budgetDetails.startDate),
                dailyAvailable: budgetService.calculateDailyAvailable(
                  Number(budgetDetails.amount) - Number(budgetDetails.spent || 0),
                  budgetDetails.endDate
                )
              };

              // 更新overview
              set({ overview });
            }
          } catch (error) {
            console.error('获取预算详情失败:', error);
          }

          // 更新状态
          set(state => ({
            trendData: {
              ...state.trendData,
              [viewMode]: trendData
            },
            isLoadingTrends: false
          }));
        } catch (error) {
          console.error('获取预算趋势数据失败:', error);
          set({ isLoadingTrends: false });
        }
      },

      // 重置状态
      resetState: () => set({
        selectedBudgetId: null,
        budgetCards: [],
        familyMembers: [],
        overview: null,
        trendData: {
          daily: [],
          weekly: [],
          monthly: []
        },
        categoryBudgets: [],
        recentTransactions: [],
        chartViewMode: 'monthly',
        showRolloverImpact: true,
        categoryFilter: 'all',
        enableCategoryBudget: false,
        isLoading: false,
        isLoadingTrends: false,
        error: null
      })
    })
  )
);
