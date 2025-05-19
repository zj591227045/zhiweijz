import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useAccountBookStore } from './account-book-store';

// 分类类型
export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
  type: 'EXPENSE' | 'INCOME';
}

// 账本类型
export interface AccountBook {
  id: string;
  name: string;
  type: 'PERSONAL' | 'FAMILY';
  isDefault: boolean;
}

// 分类预算类型
export interface CategoryBudget {
  categoryId: string;
  amount: number;
  category?: Category;
}

// 预算添加状态类型
interface BudgetAddState {
  // 基本信息
  name: string;
  amount: number;
  startDate: string;
  endDate: string;
  isUnlimited: boolean;

  // 分类预算
  enableCategoryBudget: boolean;
  categories: Category[];
  selectedCategoryId: string | null;
  categoryBudgetAmount: number;
  categoryBudgets: CategoryBudget[];

  // 账本信息
  activeAccountBook: AccountBook | null;

  // UI状态
  isLoading: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;

  // 操作方法
  setName: (name: string) => void;
  setAmount: (amount: number) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  toggleUnlimited: () => void;
  toggleCategoryBudget: () => void;
  setSelectedCategoryId: (id: string | null) => void;
  setCategoryBudgetAmount: (amount: number) => void;
  addCategoryBudget: () => void;
  removeCategoryBudget: (categoryId: string) => void;
  setCategories: (categories: Category[]) => void;
  setActiveAccountBook: (accountBook: AccountBook) => void;
  validateForm: () => boolean;
  submitForm: () => Promise<boolean>;
  resetForm: () => void;
}

// 创建预算添加状态仓库
export const useBudgetAddStore = create<BudgetAddState>()(
  devtools(
    (set, get) => ({
      // 基本信息
      name: '',
      amount: 0,
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
      isUnlimited: false,

      // 分类预算
      enableCategoryBudget: false,
      categories: [],
      selectedCategoryId: null,
      categoryBudgetAmount: 0,
      categoryBudgets: [],

      // 账本信息
      activeAccountBook: null,

      // UI状态
      isLoading: false,
      isSubmitting: false,
      errors: {},

      // 设置预算名称
      setName: (name) => set({ name, errors: { ...get().errors, name: '' } }),

      // 设置预算金额
      setAmount: (amount) => set({ amount, errors: { ...get().errors, amount: '' } }),

      // 设置开始日期
      setStartDate: (date) => set({ startDate: date, errors: { ...get().errors, startDate: '' } }),

      // 设置结束日期
      setEndDate: (date) => set({ endDate: date, errors: { ...get().errors, endDate: '' } }),

      // 切换无期限预算
      toggleUnlimited: () => set((state) => ({
        isUnlimited: !state.isUnlimited,
        errors: { ...state.errors, endDate: '' }
      })),

      // 切换分类预算
      toggleCategoryBudget: () => set((state) => ({
        enableCategoryBudget: !state.enableCategoryBudget,
        errors: { ...state.errors, categoryBudgets: '' }
      })),

      // 设置选中的分类
      setSelectedCategoryId: (id) => set({
        selectedCategoryId: id,
        errors: { ...get().errors, selectedCategoryId: '' }
      }),

      // 设置分类预算金额
      setCategoryBudgetAmount: (amount) => set({
        categoryBudgetAmount: amount,
        errors: { ...get().errors, categoryBudgetAmount: '' }
      }),

      // 添加分类预算
      addCategoryBudget: () => {
        const {
          selectedCategoryId,
          categoryBudgetAmount,
          categoryBudgets,
          categories,
          errors
        } = get();

        // 验证
        if (!selectedCategoryId) {
          set({ errors: { ...errors, selectedCategoryId: '请选择分类' } });
          return;
        }

        if (categoryBudgetAmount <= 0) {
          set({ errors: { ...errors, categoryBudgetAmount: '金额必须大于0' } });
          return;
        }

        // 检查是否已存在该分类的预算
        const existingIndex = categoryBudgets.findIndex(
          (item) => item.categoryId === selectedCategoryId
        );

        if (existingIndex !== -1) {
          set({ errors: { ...errors, selectedCategoryId: '该分类已存在预算' } });
          return;
        }

        // 获取分类信息
        const category = categories.find((c) => c.id === selectedCategoryId);

        // 添加分类预算
        const newCategoryBudget: CategoryBudget = {
          categoryId: selectedCategoryId,
          amount: categoryBudgetAmount,
          category
        };

        set({
          categoryBudgets: [...categoryBudgets, newCategoryBudget],
          selectedCategoryId: null,
          categoryBudgetAmount: 0,
          errors: { ...errors, categoryBudgets: '', selectedCategoryId: '', categoryBudgetAmount: '' }
        });
      },

      // 移除分类预算
      removeCategoryBudget: (categoryId) => {
        const { categoryBudgets } = get();
        set({
          categoryBudgets: categoryBudgets.filter((item) => item.categoryId !== categoryId)
        });
      },

      // 设置分类列表
      setCategories: (categories) => set({ categories }),

      // 设置当前激活账本
      setActiveAccountBook: (accountBook) => set({ activeAccountBook: accountBook }),

      // 验证表单
      validateForm: () => {
        const {
          name,
          amount,
          startDate,
          endDate,
          isUnlimited,
          enableCategoryBudget,
          categoryBudgets,
          activeAccountBook
        } = get();

        const errors: Record<string, string> = {};
        let isValid = true;

        // 验证预算名称
        if (!name.trim()) {
          errors.name = '请输入预算名称';
          isValid = false;
        } else if (name.length > 50) {
          errors.name = '预算名称不能超过50个字符';
          isValid = false;
        }

        // 验证预算金额
        if (amount <= 0) {
          errors.amount = '预算金额必须大于0';
          isValid = false;
        }

        // 验证开始日期
        if (!startDate) {
          errors.startDate = '请选择开始日期';
          isValid = false;
        }

        // 验证结束日期（如果不是无期限预算）
        if (!isUnlimited && !endDate) {
          errors.endDate = '请选择结束日期';
          isValid = false;
        } else if (!isUnlimited && dayjs(endDate).isBefore(dayjs(startDate))) {
          errors.endDate = '结束日期不能早于开始日期';
          isValid = false;
        }

        // 验证账本
        if (!activeAccountBook) {
          errors.accountBook = '请选择账本';
          isValid = false;
        }

        // 验证分类预算（如果启用）
        if (enableCategoryBudget && categoryBudgets.length === 0) {
          errors.categoryBudgets = '请添加至少一个分类预算';
          isValid = false;
        }

        // 验证分类预算总额不超过预算总额
        if (enableCategoryBudget && categoryBudgets.length > 0) {
          const totalCategoryAmount = categoryBudgets.reduce(
            (sum, item) => sum + item.amount,
            0
          );

          if (totalCategoryAmount > amount) {
            errors.categoryBudgets = '分类预算总额不能超过预算总额';
            isValid = false;
          }
        }

        set({ errors });
        return isValid;
      },

      // 提交表单
      submitForm: async () => {
        const {
          name,
          amount,
          startDate,
          endDate,
          isUnlimited,
          enableCategoryBudget,
          categoryBudgets,
          activeAccountBook,
          validateForm
        } = get();

        // 验证表单
        if (!validateForm()) {
          return false;
        }

        try {
          set({ isSubmitting: true });

          // 构建请求数据
          const budgetData = {
            name,
            amount,
            budgetType: 'GENERAL',
            period: 'YEARLY', // 添加必需的 period 字段，通用预算使用 YEARLY 周期
            startDate,
            endDate: isUnlimited ? undefined : endDate,
            unlimited: isUnlimited,
            enableCategoryBudget,
            categoryBudgets: enableCategoryBudget
              ? categoryBudgets.map(item => ({
                  categoryId: item.categoryId,
                  amount: item.amount
                }))
              : [],
            accountBookId: activeAccountBook?.id
          };

          // 发送请求
          await apiClient.post('/budgets', budgetData);

          toast.success('预算创建成功');
          set({ isSubmitting: false });

          // 重置表单
          get().resetForm();

          return true;
        } catch (error) {
          console.error('创建预算失败:', error);
          toast.error('创建预算失败，请重试');
          set({ isSubmitting: false });
          return false;
        }
      },

      // 重置表单
      resetForm: () => {
        set({
          name: '',
          amount: 0,
          startDate: dayjs().format('YYYY-MM-DD'),
          endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
          isUnlimited: false,
          enableCategoryBudget: false,
          selectedCategoryId: null,
          categoryBudgetAmount: 0,
          categoryBudgets: [],
          errors: {}
        });
      }
    })
  )
);
