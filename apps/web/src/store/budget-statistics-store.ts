import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { budgetService } from '@/lib/api-services';
import { toast } from 'sonner';
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

// 结转记录类型
export interface RolloverRecord {
  id: string;
  budgetId: string;
  period: string;
  amount: number;
  type: 'SURPLUS' | 'DEFICIT';
  createdAt: string;
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

  // 结转历史记录
  rolloverHistory: RolloverRecord[];

  // 图表视图模式
  chartViewMode: 'daily' | 'weekly' | 'monthly';

  // 图表时间范围
  chartTimeRange: '6months' | '12months';

  // 是否显示结转影响
  showRolloverImpact: boolean;

  // 分类预算筛选选项
  categoryFilter: 'all' | 'overspent';

  // 是否启用分类预算
  enableCategoryBudget: boolean;

  // UI状态
  isLoading: boolean;
  isLoadingTrends: boolean;
  isRolloverHistoryOpen: boolean;
  error: string | null;

  // 操作方法
  setBudgetType: (type: 'personal' | 'general') => void;
  setSelectedBudgetId: (id: string | null) => void;
  setChartViewMode: (mode: 'daily' | 'weekly' | 'monthly') => void;
  setChartTimeRange: (range: '6months' | '12months') => void;
  toggleRolloverImpact: () => void;
  toggleRolloverHistory: () => void;
  setCategoryFilter: (filter: 'all' | 'overspent') => void;
  fetchBudgetStatistics: (accountBookId: string, budgetType?: 'personal' | 'general', userId?: string) => Promise<void>;
  fetchBudgetTrends: (budgetId: string, viewMode?: 'daily' | 'weekly' | 'monthly', timeRange?: '6months' | '12months', familyMemberId?: string) => Promise<void>;
  fetchRolloverHistory: (budgetId: string) => Promise<void>;
  resetState: () => void;
}

// 辅助函数：计算剩余天数
const calculateDaysRemaining = (endDate: string): number => {
  const end = dayjs(endDate);
  const now = dayjs();
  return Math.max(0, end.diff(now, 'day'));
};

// 辅助函数：计算日均支出
const calculateDailySpent = (spent: number, startDate: string): number => {
  const start = dayjs(startDate);
  const now = dayjs();
  const daysPassed = Math.max(1, now.diff(start, 'day') + 1);
  return spent / daysPassed;
};

// 辅助函数：计算日均可用
const calculateDailyAvailable = (remaining: number, endDate: string): number => {
  const daysRemaining = calculateDaysRemaining(endDate);
  return daysRemaining > 0 ? remaining / daysRemaining : 0;
};

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
      rolloverHistory: [],
      chartViewMode: 'monthly', // 默认显示月视图
      chartTimeRange: '6months', // 默认显示6个月
      showRolloverImpact: true,
      categoryFilter: 'all',
      enableCategoryBudget: false,
      isLoading: false,
      isLoadingTrends: false,
      isRolloverHistoryOpen: false,
      error: null,

      // 设置预算类型
      setBudgetType: (type) => set({ budgetType: type }),

      // 设置选中的预算ID
      setSelectedBudgetId: (id) => set({ selectedBudgetId: id }),

      // 设置图表视图模式
      setChartViewMode: (mode) => {
        set({ chartViewMode: mode });

        // 如果已有预算ID，获取对应视图模式的趋势数据
        const { selectedBudgetId, chartTimeRange } = get();
        if (selectedBudgetId) {
          get().fetchBudgetTrends(selectedBudgetId, mode, chartTimeRange);
        }
      },

      // 设置图表时间范围
      setChartTimeRange: (range) => {
        set({ chartTimeRange: range });

        // 如果已有预算ID，获取对应时间范围的趋势数据
        const { selectedBudgetId, chartViewMode } = get();
        if (selectedBudgetId) {
          get().fetchBudgetTrends(selectedBudgetId, chartViewMode, range);
        }
      },

      // 切换是否显示结转影响
      toggleRolloverImpact: () => set(state => ({
        showRolloverImpact: !state.showRolloverImpact
      })),

      // 切换结转历史对话框
      toggleRolloverHistory: () => set(state => ({
        isRolloverHistoryOpen: !state.isRolloverHistoryOpen
      })),

      // 设置分类预算筛选选项
      setCategoryFilter: (filter) => set({ categoryFilter: filter }),

      // 获取预算结转历史
      fetchRolloverHistory: async (budgetId) => {
        try {
          console.log(`获取预算结转历史，预算ID: ${budgetId}`);
          const response = await budgetService.getBudgetRolloverHistory(budgetId);
          console.log('获取到结转历史:', response);
          set({ rolloverHistory: response || [] });
          return response;
        } catch (error) {
          console.error('获取结转历史失败:', error);
          set({ rolloverHistory: [] });
          toast.error('获取结转历史失败');
          return [];
        }
      },

      // 获取预算统计数据
      fetchBudgetStatistics: async (accountBookId, budgetType, userId) => {
        try {
          set({ isLoading: true, error: null });

          // 构建请求参数
          const params: any = {
            accountBookId,
            month: dayjs().format('YYYY-MM')
          };

          // 调用API获取预算统计数据
          const response = await budgetService.getBudgetStatistics(accountBookId, params);

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

          // 确定默认选中的预算ID
          let defaultSelectedBudgetId = null;

          if (filteredBudgetCards.length > 0) {
            // 如果是个人预算类型且有家庭成员数据，优先选择当前用户的预算
            if (currentBudgetType === 'personal' && response.familyMembers && response.familyMembers.length > 0) {
              try {
                // 导入当前用户信息
                const { useAuthStore } = await import('@/store/auth-store');
                const currentUser = useAuthStore.getState().user;

                if (currentUser) {
                  // 查找当前用户对应的家庭成员
                  const currentUserMember = response.familyMembers.find(member =>
                    !member.isCustodial && member.name === currentUser.name
                  );

                  if (currentUserMember && currentUserMember.budgetId) {
                    defaultSelectedBudgetId = currentUserMember.budgetId;
                    console.log('找到当前用户的预算:', currentUserMember.name, currentUserMember.budgetId);
                  } else {
                    // 如果找不到当前用户的预算，使用第一个预算
                    defaultSelectedBudgetId = filteredBudgetCards[0]?.id || null;
                    console.log('未找到当前用户的预算，使用第一个预算:', defaultSelectedBudgetId);
                  }
                } else {
                  defaultSelectedBudgetId = filteredBudgetCards[0]?.id || null;
                  console.log('未获取到当前用户信息，使用第一个预算:', defaultSelectedBudgetId);
                }
              } catch (error) {
                console.error('获取当前用户信息失败:', error);
                defaultSelectedBudgetId = filteredBudgetCards[0]?.id || null;
              }
            } else {
              // 其他情况使用第一个预算
              defaultSelectedBudgetId = filteredBudgetCards[0]?.id || null;
            }
          }

          // 更新状态
          set({
            budgetCards: filteredBudgetCards,
            familyMembers: response.familyMembers || [],
            overview: filteredBudgetCards.length > 0 ? response.overview || null : null,
            categoryBudgets: response.categories || [],
            recentTransactions: response.recentTransactions || [],
            selectedBudgetId: defaultSelectedBudgetId,
            enableCategoryBudget: response.enableCategoryBudget || false,
            isLoading: false
          });

          // 如果有选中的预算ID，获取该预算的趋势数据
          if (defaultSelectedBudgetId) {
            // 如果是个人预算且有家庭成员，需要传递家庭成员ID
            if (currentBudgetType === 'personal' && response.familyMembers && response.familyMembers.length > 0) {
              const selectedMember = response.familyMembers.find(member => member.budgetId === defaultSelectedBudgetId);
              if (selectedMember) {
                get().fetchBudgetTrends(defaultSelectedBudgetId, get().chartViewMode, get().chartTimeRange, selectedMember.id);
              } else {
                get().fetchBudgetTrends(defaultSelectedBudgetId, get().chartViewMode);
              }
            } else {
              get().fetchBudgetTrends(defaultSelectedBudgetId, get().chartViewMode);
            }
          }
        } catch (error) {
          console.error('获取预算统计数据失败:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : '获取预算统计数据失败'
          });
          toast.error('获取预算统计数据失败');
        }
      },

      // 获取预算趋势数据
      fetchBudgetTrends: async (budgetId, viewMode, timeRange, familyMemberId) => {
        try {
          set({ isLoadingTrends: true });

          // 使用当前状态中的默认值
          const currentViewMode = viewMode || get().chartViewMode;
          const currentTimeRange = timeRange || get().chartTimeRange;

          // 调用API获取预算趋势数据
          let trendData = [];
          try {
            const params: any = {
              viewMode: currentViewMode,
              timeRange: currentTimeRange
            };
            if (familyMemberId) {
              params.familyMemberId = familyMemberId;
            }

            const response = await budgetService.getBudgetTrends(budgetId, params);
            trendData = response || [];
            console.log('获取到的趋势数据:', trendData, '家庭成员ID:', familyMemberId || '无');

            // 如果返回的数据为空或不是数组，使用空数组
            if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
              console.log('趋势数据为空或格式不正确，使用空数组');
              trendData = [];
            }
          } catch (error) {
            console.error('获取趋势数据失败，使用空数组:', error);
            trendData = [];
          }

          // 获取预算详情，更新overview
          try {
            const budgetDetails = await budgetService.getBudget(budgetId);
            if (budgetDetails) {
              // 构建overview对象
              const totalAmount = Number(budgetDetails.amount) + Number(budgetDetails.rolloverAmount || 0);
              const spent = Number(budgetDetails.spent || 0);
              const remaining = totalAmount - spent;

              const overview = {
                id: budgetDetails.id,
                name: budgetDetails.name,
                period: `${new Date(budgetDetails.startDate).toLocaleDateString()} - ${new Date(budgetDetails.endDate).toLocaleDateString()}`,
                amount: Number(budgetDetails.amount),
                spent: spent,
                remaining: remaining,
                percentage: totalAmount > 0 ? (spent / totalAmount) * 100 : 0,
                rollover: Number(budgetDetails.rolloverAmount || 0),
                daysRemaining: calculateDaysRemaining(budgetDetails.endDate),
                dailySpent: calculateDailySpent(spent, budgetDetails.startDate),
                dailyAvailable: calculateDailyAvailable(remaining, budgetDetails.endDate)
              };

              // 更新overview
              set({ overview });
            }
          } catch (error) {
            console.error('获取预算详情失败:', error);
          }

          // 获取预算相关的交易记录
          try {
            const params: any = {
              page: 1,
              limit: 5
            };
            if (familyMemberId) {
              params.familyMemberId = familyMemberId;
            }

            const response = await budgetService.getBudgetTransactions(budgetId, params);
            console.log('获取到的交易记录:', response, '家庭成员ID:', familyMemberId || '无');

            // 更新最近交易记录
            if (response && response.data) {
              set({ recentTransactions: response.data });
            }
          } catch (error) {
            console.error('获取预算交易记录失败:', error);
          }

          // 更新状态
          set(state => ({
            trendData: {
              ...state.trendData,
              [currentViewMode]: trendData
            },
            isLoadingTrends: false
          }));
        } catch (error) {
          console.error('获取预算趋势数据失败:', error);
          set({ isLoadingTrends: false });
          toast.error('获取预算趋势数据失败');
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
        rolloverHistory: [],
        chartViewMode: 'monthly',
        chartTimeRange: '6months',
        showRolloverImpact: true,
        categoryFilter: 'all',
        enableCategoryBudget: false,
        isLoading: false,
        isLoadingTrends: false,
        isRolloverHistoryOpen: false,
        error: null
      })
    })
  )
);
