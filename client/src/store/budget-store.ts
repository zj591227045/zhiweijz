import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置dayjs语言为中文
dayjs.locale('zh-cn');

// 账本类型
export interface AccountBook {
  id: string;
  name: string;
  type: 'PERSONAL' | 'FAMILY';
  familyId?: string;
  isDefault?: boolean;
}

// 家庭成员类型
export interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
}

// 总体预算类型
export interface TotalBudget {
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  daysRemaining: number;
  rolloverAmount?: number;
  dailyAvailable: number;
}

// 预算类型
export interface Budget {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverspent: boolean;
  rollover: boolean;
  rolloverAmount?: number;
  enableCategoryBudget: boolean;
  userId: string;
  familyMemberId?: string;
}

// 预算状态类型
interface BudgetState {
  // 账本相关
  accountBooks: AccountBook[];
  selectedAccountBook: AccountBook | null;

  // 预算类型和周期
  budgetType: 'MONTHLY' | 'YEARLY';
  currentPeriod: {
    startDate: Date;
    endDate: Date;
    displayText: string;
  };

  // 家庭成员（仅家庭账本）
  familyMembers: FamilyMember[];
  selectedFamilyMemberId: string | null;

  // 预算数据
  totalBudget: TotalBudget | null;
  budgets: Budget[];
  familyBudgets: Record<string, Budget[]>; // 按成员ID分组的预算

  // UI状态
  isLoading: boolean;
  isRefreshing: boolean;
  isDeleting: boolean;
  activeFilter: 'all' | 'overspent' | 'rollover';
  expandedFamilyMembers: Record<string, boolean>; // 记录展开状态的家庭成员

  // 操作方法
  setSelectedAccountBook: (accountBook: AccountBook) => void;
  setBudgetType: (type: 'MONTHLY' | 'YEARLY') => void;
  setCurrentPeriod: (period: { startDate: Date; endDate: Date }) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  setSelectedFamilyMember: (memberId: string | null) => void;
  setActiveFilter: (filter: 'all' | 'overspent' | 'rollover') => void;
  toggleFamilyMemberExpanded: (memberId: string) => void;
  setFamilyMembers: (members: FamilyMember[]) => void;
  setAccountBooks: (books: AccountBook[]) => void;
  setTotalBudget: (budget: TotalBudget) => void;
  setBudgets: (budgets: Budget[]) => void;
  setFamilyBudgets: (budgets: Record<string, Budget[]>) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsRefreshing: (isRefreshing: boolean) => void;
  setIsDeleting: (isDeleting: boolean) => void;
}

// 创建预算状态仓库
export const useBudgetStore = create<BudgetState>()(
  devtools(
    (set) => ({
      // 初始状态
      accountBooks: [],
      selectedAccountBook: null,
      budgetType: 'MONTHLY',
      currentPeriod: {
        startDate: dayjs().startOf('month').toDate(),
        endDate: dayjs().endOf('month').toDate(),
        displayText: dayjs().format('YYYY年M月'),
      },
      familyMembers: [],
      selectedFamilyMemberId: null,
      totalBudget: null,
      budgets: [],
      familyBudgets: {},
      isLoading: false,
      isRefreshing: false,
      isDeleting: false,
      activeFilter: 'all',
      expandedFamilyMembers: {},

      // 操作方法
      setSelectedAccountBook: (accountBook) => set({ selectedAccountBook: accountBook }),
      
      setBudgetType: (type) => {
        if (type === 'MONTHLY') {
          set({
            budgetType: type,
            currentPeriod: {
              startDate: dayjs().startOf('month').toDate(),
              endDate: dayjs().endOf('month').toDate(),
              displayText: dayjs().format('YYYY年M月'),
            },
          });
        } else {
          set({
            budgetType: type,
            currentPeriod: {
              startDate: dayjs().startOf('year').toDate(),
              endDate: dayjs().endOf('year').toDate(),
              displayText: dayjs().format('YYYY年'),
            },
          });
        }
      },
      
      setCurrentPeriod: (period) => {
        const { startDate, endDate } = period;
        const displayText = dayjs(startDate).format(
          dayjs(startDate).year() === dayjs(endDate).year() 
            ? (dayjs(startDate).month() === dayjs(endDate).month() ? 'YYYY年M月' : 'YYYY年M月-M月')
            : 'YYYY年M月-YYYY年M月'
        );
        set({ currentPeriod: { ...period, displayText } });
      },
      
      nextMonth: () => set((state) => {
        if (state.budgetType === 'MONTHLY') {
          const nextMonth = dayjs(state.currentPeriod.startDate).add(1, 'month');
          return {
            currentPeriod: {
              startDate: nextMonth.startOf('month').toDate(),
              endDate: nextMonth.endOf('month').toDate(),
              displayText: nextMonth.format('YYYY年M月'),
            },
          };
        } else {
          const nextYear = dayjs(state.currentPeriod.startDate).add(1, 'year');
          return {
            currentPeriod: {
              startDate: nextYear.startOf('year').toDate(),
              endDate: nextYear.endOf('year').toDate(),
              displayText: nextYear.format('YYYY年'),
            },
          };
        }
      }),
      
      prevMonth: () => set((state) => {
        if (state.budgetType === 'MONTHLY') {
          const prevMonth = dayjs(state.currentPeriod.startDate).subtract(1, 'month');
          return {
            currentPeriod: {
              startDate: prevMonth.startOf('month').toDate(),
              endDate: prevMonth.endOf('month').toDate(),
              displayText: prevMonth.format('YYYY年M月'),
            },
          };
        } else {
          const prevYear = dayjs(state.currentPeriod.startDate).subtract(1, 'year');
          return {
            currentPeriod: {
              startDate: prevYear.startOf('year').toDate(),
              endDate: prevYear.endOf('year').toDate(),
              displayText: prevYear.format('YYYY年'),
            },
          };
        }
      }),
      
      setSelectedFamilyMember: (memberId) => set({ selectedFamilyMemberId: memberId }),
      
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      
      toggleFamilyMemberExpanded: (memberId) => set((state) => ({
        expandedFamilyMembers: {
          ...state.expandedFamilyMembers,
          [memberId]: !state.expandedFamilyMembers[memberId],
        },
      })),
      
      setFamilyMembers: (members) => set({ familyMembers: members }),
      
      setAccountBooks: (books) => set({ accountBooks: books }),
      
      setTotalBudget: (budget) => set({ totalBudget: budget }),
      
      setBudgets: (budgets) => set({ budgets: budgets }),
      
      setFamilyBudgets: (budgets) => set({ familyBudgets: budgets }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
      
      setIsDeleting: (isDeleting) => set({ isDeleting }),
    }),
    { name: 'budget-store' }
  )
);
