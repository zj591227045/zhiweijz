import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Category } from '@/types';

// 预算周期类型
export type BudgetPeriodType = 'MONTHLY' | 'YEARLY';

// 账本类型
export interface AccountBook {
  id: string;
  name: string;
  type: 'PERSONAL' | 'FAMILY';
  isDefault: boolean;
}

// 分类预算类型
export interface CategoryBudget {
  id?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
}

// 预算表单状态类型
interface BudgetFormState {
  // 表单模式
  mode: 'create' | 'edit';
  budgetId: string | null;

  // 账本选择
  accountBooks: AccountBook[];
  selectedAccountBookId: string | null;
  selectedAccountBookType: 'PERSONAL' | 'FAMILY' | null;

  // 基本信息
  formData: {
    name: string;
    amount: number;
    periodType: BudgetPeriodType;
    startDate: string;
    endDate: string;
  };

  // 分类预算
  enableCategoryBudget: boolean;
  categories: Category[];
  selectedCategoryId: string | null;
  categoryBudgetAmount: number;
  categoryBudgets: CategoryBudget[];

  // 结转设置
  enableRollover: boolean;
  rolloverData: {
    previousRollover: number | null;
    estimatedRollover: number | null;
  };

  // UI状态
  isLoading: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;

  // 操作方法
  setMode: (mode: 'create' | 'edit') => void;
  setBudgetId: (id: string | null) => void;
  setAccountBooks: (accountBooks: AccountBook[]) => void;
  setSelectedAccountBook: (id: string) => void;
  updateFormData: (data: Partial<BudgetFormState['formData']>) => void;
  toggleCategoryBudget: () => void;
  setCategories: (categories: Category[]) => void;
  setSelectedCategory: (id: string | null) => void;
  setCategoryBudgetAmount: (amount: number) => void;
  addCategoryBudget: () => void;
  removeCategoryBudget: (categoryId: string) => void;
  toggleRollover: () => void;
  setRolloverData: (data: BudgetFormState['rolloverData']) => void;
  resetForm: () => void;
  loadBudgetData: (budgetId: string) => Promise<void>;
  submitForm: () => Promise<void>;
}

// 创建预算表单状态存储
export const useBudgetFormStore = create<BudgetFormState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      mode: 'create',
      budgetId: null,

      // 账本选择
      accountBooks: [],
      selectedAccountBookId: null,
      selectedAccountBookType: null,

      // 基本信息
      formData: {
        name: '',
        amount: 0,
        periodType: 'MONTHLY',
        startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
        endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
      },

      // 分类预算
      enableCategoryBudget: false,
      categories: [],
      selectedCategoryId: null,
      categoryBudgetAmount: 0,
      categoryBudgets: [],

      // 结转设置
      enableRollover: false,
      rolloverData: {
        previousRollover: null,
        estimatedRollover: null,
      },

      // UI状态
      isLoading: false,
      isSubmitting: false,
      errors: {},

      // 设置模式
      setMode: (mode) => set({ mode }),

      // 设置预算ID
      setBudgetId: (id) => set({ budgetId: id }),

      // 设置账本列表
      setAccountBooks: (accountBooks) => set({ accountBooks }),

      // 设置选中的账本
      setSelectedAccountBook: (id) => {
        const accountBook = get().accountBooks.find(book => book.id === id);
        if (accountBook) {
          set({
            selectedAccountBookId: id,
            selectedAccountBookType: accountBook.type
          });
        }
      },

      // 更新表单数据
      updateFormData: (data) => set(state => ({
        formData: {
          ...state.formData,
          ...data
        }
      })),

      // 切换分类预算启用状态
      toggleCategoryBudget: () => set(state => ({
        enableCategoryBudget: !state.enableCategoryBudget
      })),

      // 设置分类列表
      setCategories: (categories) => set({ categories }),

      // 设置选中的分类
      setSelectedCategory: (id) => set({ selectedCategoryId: id }),

      // 设置分类预算金额
      setCategoryBudgetAmount: (amount) => set({ categoryBudgetAmount: amount }),

      // 添加分类预算
      addCategoryBudget: () => {
        const {
          selectedCategoryId,
          categories,
          categoryBudgetAmount,
          categoryBudgets
        } = get();

        if (!selectedCategoryId || categoryBudgetAmount <= 0) {
          return;
        }

        const selectedCategory = categories.find(c => c.id === selectedCategoryId);
        if (!selectedCategory) {
          return;
        }

        // 检查是否已存在该分类的预算
        const existingIndex = categoryBudgets.findIndex(
          cb => cb.categoryId === selectedCategoryId
        );

        if (existingIndex >= 0) {
          // 更新已存在的分类预算
          const updatedBudgets = [...categoryBudgets];
          updatedBudgets[existingIndex] = {
            ...updatedBudgets[existingIndex],
            amount: categoryBudgetAmount
          };
          set({ categoryBudgets: updatedBudgets });
        } else {
          // 添加新的分类预算
          const newCategoryBudget: CategoryBudget = {
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
            categoryIcon: selectedCategory.icon,
            categoryColor: selectedCategory.color,
            amount: categoryBudgetAmount
          };
          set(state => ({
            categoryBudgets: [...state.categoryBudgets, newCategoryBudget]
          }));
        }

        // 重置选中的分类和金额
        set({
          selectedCategoryId: null,
          categoryBudgetAmount: 0
        });
      },

      // 移除分类预算
      removeCategoryBudget: (categoryId) => set(state => ({
        categoryBudgets: state.categoryBudgets.filter(cb => cb.categoryId !== categoryId)
      })),

      // 切换结转启用状态
      toggleRollover: () => set(state => ({
        enableRollover: !state.enableRollover
      })),

      // 设置结转数据
      setRolloverData: (data) => set({ rolloverData: data }),

      // 重置表单
      resetForm: () => {
        set({
          mode: 'create',
          budgetId: null,
          selectedAccountBookId: null,
          selectedAccountBookType: null,
          formData: {
            name: '',
            amount: 0,
            periodType: 'MONTHLY',
            startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
            endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
          },
          enableCategoryBudget: false,
          selectedCategoryId: null,
          categoryBudgetAmount: 0,
          categoryBudgets: [],
          enableRollover: false,
          rolloverData: {
            previousRollover: null,
            estimatedRollover: null,
          },
          isLoading: false,
          isSubmitting: false,
          errors: {}
        });
      },

      // 加载预算数据
      loadBudgetData: async (budgetId) => {
        try {
          set({ isLoading: true });
          const response = await apiClient.get(`/budgets/${budgetId}`);

          // 设置表单数据
          set({
            mode: 'edit',
            budgetId,
            selectedAccountBookId: response.accountBookId,
            selectedAccountBookType: response.accountBookType,
            formData: {
              name: response.name,
              amount: response.amount,
              periodType: response.period,
              startDate: dayjs(response.startDate).format('YYYY-MM-DD'),
              endDate: dayjs(response.endDate).format('YYYY-MM-DD'),
            },
            enableCategoryBudget: response.enableCategoryBudget,
            categoryBudgets: response.categoryBudgets || [],
            enableRollover: response.rollover,
            rolloverData: {
              previousRollover: response.previousRollover || null,
              estimatedRollover: response.estimatedRollover || null,
            },
            isLoading: false
          });
        } catch (error) {
          console.error('加载预算数据失败:', error);
          toast.error('加载预算数据失败');
          set({ isLoading: false });
        }
      },

      // 提交表单
      submitForm: async () => {
        const {
          mode,
          budgetId,
          selectedAccountBookId,
          formData,
          enableCategoryBudget,
          categoryBudgets,
          enableRollover
        } = get();

        if (!selectedAccountBookId) {
          toast.error('请选择账本');
          return;
        }

        if (!formData.name) {
          toast.error('请输入预算名称');
          return;
        }

        if (formData.amount <= 0) {
          toast.error('预算金额必须大于0');
          return;
        }

        if (enableCategoryBudget && categoryBudgets.length === 0) {
          toast.error('启用分类预算时，至少需要添加一个分类预算');
          return;
        }

        try {
          set({ isSubmitting: true });

          const budgetData = {
            name: formData.name,
            amount: formData.amount,
            period: formData.periodType,
            startDate: formData.startDate,
            endDate: formData.endDate,
            accountBookId: selectedAccountBookId,
            rollover: enableRollover,
            enableCategoryBudget,
            categoryBudgets: enableCategoryBudget ? categoryBudgets.map(cb => ({
              categoryId: cb.categoryId,
              amount: cb.amount
            })) : []
          };

          if (mode === 'create') {
            await apiClient.post('/budgets', budgetData);
            toast.success('预算创建成功');
          } else {
            await apiClient.put(`/budgets/${budgetId}`, budgetData);
            toast.success('预算更新成功');
          }

          // 重置表单
          get().resetForm();

          // 返回预算列表页
          window.location.href = '/budgets';
        } catch (error) {
          console.error('提交预算表单失败:', error);
          toast.error(mode === 'create' ? '创建预算失败' : '更新预算失败');
        } finally {
          set({ isSubmitting: false });
        }
      }
    })
  )
);
