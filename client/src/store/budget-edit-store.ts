import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Category } from '@/types';

// 预算类型
export type BudgetType = 'PERSONAL' | 'GENERAL';

// 分类预算类型
export interface CategoryBudget {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  isOther?: boolean;
}

// 预算编辑状态类型
interface BudgetEditState {
  // 预算基本信息
  budgetId: string | null;
  budgetType: BudgetType;
  name: string;
  amount: number;

  // 个人预算特有字段
  refreshDay: number;
  enableRollover: boolean;
  rolloverAmount: number | null;
  previousRollover: number | null;
  estimatedRollover: number | null;

  // 通用预算特有字段
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
  accountBookId: string | null;
  accountBookType: 'PERSONAL' | 'FAMILY' | null;

  // UI状态
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // 操作方法
  setBudgetType: (type: BudgetType) => void;
  setName: (name: string) => void;
  setAmount: (amount: number) => void;
  setRefreshDay: (day: number) => void;
  toggleRollover: () => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  toggleUnlimited: () => void;
  toggleCategoryBudget: () => void;
  setSelectedCategory: (id: string | null) => void;
  setCategoryBudgetAmount: (amount: number) => void;
  addCategoryBudget: () => void;
  removeCategoryBudget: (categoryId: string) => void;
  loadBudgetData: (budgetId: string) => Promise<void>;
  submitForm: () => Promise<void>;
  resetForm: () => void;
}

// 创建预算编辑状态存储
export const useBudgetEditStore = create<BudgetEditState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      budgetId: null,
      budgetType: 'PERSONAL',
      name: '',
      amount: 0,

      // 个人预算特有字段
      refreshDay: 1,
      enableRollover: false,
      rolloverAmount: null,
      previousRollover: null,
      estimatedRollover: null,

      // 通用预算特有字段
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
      accountBookId: null,
      accountBookType: null,

      // UI状态
      isLoading: false,
      isSubmitting: false,
      error: null,

      // 设置预算类型
      setBudgetType: (type) => set({ budgetType: type }),

      // 设置预算名称
      setName: (name) => set({ name }),

      // 设置预算金额
      setAmount: (amount) => {
        const { enableCategoryBudget, categoryBudgets } = get();

        // 如果启用了分类预算，更新"其他"分类预算金额
        if (enableCategoryBudget) {
          const otherBudgetIndex = categoryBudgets.findIndex(cb => cb.isOther === true);

          // 计算已分配金额（排除"其他"分类）
          const allocatedAmount = categoryBudgets
            .filter(budget => !budget.isOther)
            .reduce((sum, budget) => sum + budget.amount, 0);

          // 计算剩余可分配金额
          const remainingAmount = amount - allocatedAmount;

          if (otherBudgetIndex >= 0 && remainingAmount > 0) {
            // 更新"其他"分类预算金额
            const updatedBudgets = [...categoryBudgets];
            updatedBudgets[otherBudgetIndex] = {
              ...updatedBudgets[otherBudgetIndex],
              amount: remainingAmount
            };

            set({ amount, categoryBudgets: updatedBudgets });
            return;
          } else if (otherBudgetIndex >= 0 && remainingAmount <= 0) {
            // 如果没有剩余金额，移除"其他"分类预算
            set({
              amount,
              categoryBudgets: categoryBudgets.filter(cb => !cb.isOther)
            });
            return;
          } else if (remainingAmount > 0) {
            // 如果没有"其他"分类预算但有剩余金额，添加"其他"分类预算
            set({
              amount,
              categoryBudgets: [
                ...categoryBudgets,
                {
                  categoryId: 'other',
                  categoryName: '其他',
                  categoryIcon: 'fa-ellipsis',
                  amount: remainingAmount,
                  isOther: true
                }
              ]
            });
            return;
          }
        }

        // 如果没有启用分类预算，直接更新金额
        set({ amount });
      },

      // 设置刷新日期
      setRefreshDay: (day) => set({ refreshDay: day }),

      // 切换结转功能
      toggleRollover: () => set((state) => ({ enableRollover: !state.enableRollover })),

      // 设置开始日期
      setStartDate: (date) => set({ startDate: date }),

      // 设置结束日期
      setEndDate: (date) => set({ endDate: date }),

      // 切换无期限预算
      toggleUnlimited: () => set((state) => ({ isUnlimited: !state.isUnlimited })),

      // 切换分类预算
      toggleCategoryBudget: () => {
        const { enableCategoryBudget, amount, categoryBudgets } = get();

        // 如果是从禁用切换到启用，自动添加"其他"分类预算
        if (!enableCategoryBudget) {
          set((state) => ({
            enableCategoryBudget: true,
            categoryBudgets: [
              {
                categoryId: 'other',
                categoryName: '其他',
                categoryIcon: 'fa-ellipsis',
                amount: amount,
                isOther: true
              }
            ]
          }));
        } else {
          // 如果是从启用切换到禁用，清空所有分类预算
          set((state) => ({
            enableCategoryBudget: false,
            categoryBudgets: []
          }));
        }
      },

      // 设置选中的分类
      setSelectedCategory: (id) => set({ selectedCategoryId: id }),

      // 设置分类预算金额
      setCategoryBudgetAmount: (amount) => set({ categoryBudgetAmount: amount }),

      // 添加分类预算
      addCategoryBudget: () => {
        const { selectedCategoryId, categoryBudgetAmount, categories, categoryBudgets, amount } = get();

        if (!selectedCategoryId || categoryBudgetAmount <= 0) {
          toast.error('请选择分类并输入有效的预算金额');
          return;
        }

        const selectedCategory = categories.find(c => c.id === selectedCategoryId);
        if (!selectedCategory) {
          toast.error('所选分类不存在');
          return;
        }

        // 计算已分配金额
        const allocatedAmount = categoryBudgets.reduce(
          (sum, budget) => sum + budget.amount,
          0
        );

        // 检查是否超出总预算
        if (allocatedAmount + categoryBudgetAmount > amount) {
          toast.error('分类预算总和不能超过总预算金额');
          return;
        }

        // 检查是否已存在该分类的预算
        const existingIndex = categoryBudgets.findIndex(
          cb => cb.categoryId === selectedCategoryId
        );

        // 检查是否存在"其他"分类预算
        const otherBudgetIndex = categoryBudgets.findIndex(cb => cb.isOther === true);

        if (existingIndex >= 0) {
          // 更新现有分类预算
          const updatedBudgets = [...categoryBudgets];
          updatedBudgets[existingIndex] = {
            ...updatedBudgets[existingIndex],
            amount: categoryBudgetAmount
          };

          set({
            categoryBudgets: updatedBudgets,
            selectedCategoryId: null,
            categoryBudgetAmount: 0
          });

          toast.success('分类预算已更新');
        } else {
          // 添加新的分类预算
          set((state) => ({
            categoryBudgets: [
              ...state.categoryBudgets,
              {
                categoryId: selectedCategoryId,
                categoryName: selectedCategory.name,
                categoryIcon: selectedCategory.icon,
                amount: categoryBudgetAmount,
                isOther: false
              }
            ],
            selectedCategoryId: null,
            categoryBudgetAmount: 0
          }));

          toast.success('分类预算已添加');
        }

        // 如果没有"其他"分类预算，自动添加一个
        if (otherBudgetIndex === -1) {
          const newAllocatedAmount = allocatedAmount + categoryBudgetAmount;
          const remainingAmount = amount - newAllocatedAmount;

          if (remainingAmount > 0) {
            set((state) => ({
              categoryBudgets: [
                ...state.categoryBudgets,
                {
                  categoryId: 'other',
                  categoryName: '其他',
                  categoryIcon: 'fa-ellipsis',
                  amount: remainingAmount,
                  isOther: true
                }
              ]
            }));
          }
        } else {
          // 更新"其他"分类预算金额
          const newAllocatedAmount = allocatedAmount + categoryBudgetAmount -
            (existingIndex >= 0 ? categoryBudgets[existingIndex].amount : 0);
          const remainingAmount = amount - newAllocatedAmount;

          if (remainingAmount > 0) {
            const updatedBudgets = [...categoryBudgets];
            updatedBudgets[otherBudgetIndex] = {
              ...updatedBudgets[otherBudgetIndex],
              amount: remainingAmount
            };

            set({ categoryBudgets: updatedBudgets });
          } else {
            // 如果没有剩余金额，移除"其他"分类预算
            set((state) => ({
              categoryBudgets: state.categoryBudgets.filter(cb => !cb.isOther)
            }));
          }
        }
      },

      // 移除分类预算
      removeCategoryBudget: (categoryId) => {
        const { categoryBudgets, amount } = get();

        // 不允许移除"其他"分类预算
        if (categoryId === 'other') {
          toast.error('不能移除"其他"分类预算');
          return;
        }

        // 找到要移除的预算
        const budgetToRemove = categoryBudgets.find(cb => cb.categoryId === categoryId);
        if (!budgetToRemove) return;

        // 移除预算
        const updatedBudgets = categoryBudgets.filter(cb => cb.categoryId !== categoryId);

        // 计算新的已分配金额
        const newAllocatedAmount = updatedBudgets.reduce(
          (sum, budget) => sum + budget.amount,
          0
        );

        // 检查是否存在"其他"分类预算
        const otherBudgetIndex = updatedBudgets.findIndex(cb => cb.isOther === true);

        // 如果存在"其他"分类预算，更新其金额
        if (otherBudgetIndex >= 0) {
          const remainingAmount = amount - newAllocatedAmount;
          updatedBudgets[otherBudgetIndex] = {
            ...updatedBudgets[otherBudgetIndex],
            amount: remainingAmount
          };
        } else if (updatedBudgets.length > 0) {
          // 如果没有"其他"分类预算但有其他预算，添加"其他"分类预算
          const remainingAmount = amount - newAllocatedAmount;
          if (remainingAmount > 0) {
            updatedBudgets.push({
              categoryId: 'other',
              categoryName: '其他',
              categoryIcon: 'fa-ellipsis',
              amount: remainingAmount,
              isOther: true
            });
          }
        }

        set({ categoryBudgets: updatedBudgets });
        toast.success('分类预算已移除');
      },

      // 加载预算数据
      loadBudgetData: async (budgetId) => {
        try {
          set({ isLoading: true, error: null });

          const response = await apiClient.get(`/budgets/${budgetId}`);

          // 处理分类预算数据，确保有"其他"分类
          let categoryBudgets = response.categoryBudgets || [];
          const enableCategoryBudget = response.enableCategoryBudget || false;

          if (enableCategoryBudget) {
            // 检查是否存在"其他"分类预算
            const hasOtherBudget = categoryBudgets.some(cb => cb.categoryId === 'other' || cb.isOther);

            // 计算已分配金额（排除"其他"分类）
            const allocatedAmount = categoryBudgets
              .filter(cb => cb.categoryId !== 'other' && !cb.isOther)
              .reduce((sum, cb) => sum + cb.amount, 0);

            // 计算剩余可分配金额
            const remainingAmount = response.amount - allocatedAmount;

            // 如果没有"其他"分类预算且有剩余金额，添加"其他"分类预算
            if (!hasOtherBudget && remainingAmount > 0) {
              categoryBudgets = [
                ...categoryBudgets,
                {
                  categoryId: 'other',
                  categoryName: '其他',
                  categoryIcon: 'fa-ellipsis',
                  amount: remainingAmount,
                  isOther: true
                }
              ];
            }

            // 如果有"其他"分类预算，确保金额正确
            if (hasOtherBudget) {
              categoryBudgets = categoryBudgets.map(cb => {
                if (cb.categoryId === 'other' || cb.isOther) {
                  return {
                    ...cb,
                    amount: remainingAmount > 0 ? remainingAmount : 0,
                    isOther: true
                  };
                }
                return cb;
              });
            }
          }

          // 根据预算类型设置不同的字段
          if (response.budgetType === 'PERSONAL') {
            set({
              budgetId,
              budgetType: 'PERSONAL',
              name: response.name,
              amount: response.amount,
              refreshDay: response.refreshDay || 1,
              enableRollover: response.rollover || false,
              rolloverAmount: response.rolloverAmount || null,
              previousRollover: response.previousRollover || null,
              estimatedRollover: response.estimatedRollover || null,
              enableCategoryBudget,
              categoryBudgets,
              accountBookId: response.accountBookId,
              accountBookType: response.accountBookType,
              isLoading: false
            });
          } else {
            set({
              budgetId,
              budgetType: 'GENERAL',
              name: response.name,
              amount: response.amount,
              startDate: dayjs(response.startDate).format('YYYY-MM-DD'),
              endDate: response.endDate ? dayjs(response.endDate).format('YYYY-MM-DD') : '',
              isUnlimited: !response.endDate,
              enableCategoryBudget,
              categoryBudgets,
              accountBookId: response.accountBookId,
              accountBookType: response.accountBookType,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('加载预算数据失败:', error);
          set({
            isLoading: false,
            error: '加载预算数据失败，请重试'
          });
          toast.error('加载预算数据失败');
        }
      },

      // 提交表单
      submitForm: async () => {
        const {
          budgetId,
          budgetType,
          name,
          amount,
          refreshDay,
          enableRollover,
          startDate,
          endDate,
          isUnlimited,
          enableCategoryBudget,
          categoryBudgets,
          accountBookId
        } = get();

        if (!name) {
          toast.error('请输入预算名称');
          return;
        }

        if (amount <= 0) {
          toast.error('预算金额必须大于0');
          return;
        }

        if (enableCategoryBudget && categoryBudgets.length === 0) {
          toast.error('启用分类预算时，至少需要添加一个分类预算');
          return;
        }

        try {
          set({ isSubmitting: true, error: null });

          // 构建请求数据
          const budgetData: any = {
            name,
            amount,
            enableCategoryBudget,
            categoryBudgets: enableCategoryBudget
              ? categoryBudgets
                  .filter(cb => !cb.isOther) // 过滤掉"其他"分类预算
                  .map(cb => ({
                    categoryId: cb.categoryId,
                    amount: cb.amount
                  }))
              : []
          };

          // 根据预算类型添加不同的字段
          if (budgetType === 'PERSONAL') {
            budgetData.refreshDay = refreshDay;
            budgetData.rollover = enableRollover;
          } else {
            budgetData.startDate = startDate;
            budgetData.endDate = isUnlimited ? null : endDate;
            budgetData.unlimited = isUnlimited;
          }

          // 发送更新请求
          await apiClient.put(`/budgets/${budgetId}`, budgetData);

          set({ isSubmitting: false });
          toast.success('预算更新成功');

          // 返回预算详情页
          window.location.href = `/budgets/${budgetId}`;
        } catch (error) {
          console.error('更新预算失败:', error);
          set({
            isSubmitting: false,
            error: '更新预算失败，请重试'
          });
          toast.error('更新预算失败');
        }
      },

      // 重置表单
      resetForm: () => {
        set({
          budgetId: null,
          budgetType: 'PERSONAL',
          name: '',
          amount: 0,
          refreshDay: 1,
          enableRollover: false,
          rolloverAmount: null,
          previousRollover: null,
          estimatedRollover: null,
          startDate: dayjs().format('YYYY-MM-DD'),
          endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
          isUnlimited: false,
          enableCategoryBudget: false,
          selectedCategoryId: null,
          categoryBudgetAmount: 0,
          categoryBudgets: [],
          accountBookId: null,
          accountBookType: null,
          isLoading: false,
          isSubmitting: false,
          error: null
        });
      }
    })
  )
);
