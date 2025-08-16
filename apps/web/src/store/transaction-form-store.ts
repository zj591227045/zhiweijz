import { create } from 'zustand';
import { TransactionType } from '@/types';

export interface TransactionAttachment {
  id: string;
  fileId: string;
  attachmentType: 'RECEIPT' | 'INVOICE' | 'CONTRACT' | 'PHOTO' | 'DOCUMENT' | 'OTHER';
  description?: string;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url?: string;
  };
}

// 多人预算分摊项
export interface BudgetAllocationItem {
  budgetId: string;
  budgetName: string;
  memberName: string;
  memberId?: string;
  amount: number;
  isSelected: boolean;
}

interface TransactionFormState {
  // 当前步骤
  currentStep: number;

  // 表单数据
  amount: string;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  description: string;
  date: string;
  time: string;
  budgetId?: string;
  tagIds: string[];
  attachments: TransactionAttachment[];

  // 多人预算分摊相关
  isMultiBudget: boolean;
  budgetAllocation: BudgetAllocationItem[];

  // 编辑模式标识
  isEditMode: boolean;

  // 虚拟键盘控制
  showKeyboardInitially: boolean;

  // 操作方法
  setAmount: (amount: string) => void;
  setType: (type: TransactionType) => void;
  setCategory: (id: string, name: string, icon: string | null) => void;
  setDescription: (description: string) => void;
  setDate: (date: string) => void;
  setTime: (time: string) => void;
  setBudgetId: (id: string) => void;
  setTagIds: (tagIds: string[]) => void;
  setAttachments: (attachments: TransactionAttachment[]) => void;
  setIsEditMode: (isEditMode: boolean) => void;
  setShowKeyboardInitially: (show: boolean) => void;

  // 多人预算分摊相关方法
  setIsMultiBudget: (isMulti: boolean) => void;
  setBudgetAllocation: (allocation: BudgetAllocationItem[]) => void;
  updateBudgetAllocationItem: (index: number, item: Partial<BudgetAllocationItem>) => void;
  addBudgetAllocationItem: (item: BudgetAllocationItem) => void;
  removeBudgetAllocationItem: (index: number) => void;

  goToStep: (step: number) => void;
  resetForm: () => void;
  fillSmartAccountingResult: (result: any) => void;
}

// 获取当前时间的HH:MM格式
const getCurrentTime = () => {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
};

// 获取当前本地日期的YYYY-MM-DD格式
const getCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialState = {
  currentStep: 1,
  amount: '',
  type: TransactionType.EXPENSE,
  categoryId: '',
  categoryName: '',
  categoryIcon: null,
  description: '',
  date: getCurrentDate(),
  time: getCurrentTime(),
  budgetId: '',
  tagIds: [],
  attachments: [],
  isMultiBudget: false,
  budgetAllocation: [],
  isEditMode: false,
  showKeyboardInitially: false,
};

export const useTransactionFormStore = create<TransactionFormState>((set) => ({
  ...initialState,

  setAmount: (amount) => set({ amount }),

  setType: (type) =>
    set({
      type,
      categoryId: '',
      categoryName: '',
      categoryIcon: null,
      budgetId: '',
      tagIds: [],
    }),

  setCategory: (id, name, icon) =>
    set({
      categoryId: id,
      categoryName: name,
      categoryIcon: icon,
    }),

  setDescription: (description) => set({ description }),

  setDate: (date) => set({ date }),

  setTime: (time) => set({ time }),

  setBudgetId: (id) => set({ budgetId: id }),

  setTagIds: (tagIds) => set({ tagIds }),

  setAttachments: (attachments) => set({ attachments }),

  setIsEditMode: (isEditMode) => set({ isEditMode }),

  setShowKeyboardInitially: (show) => set({ showKeyboardInitially: show }),

  // 多人预算分摊相关方法
  setIsMultiBudget: (isMulti) => set((state) => ({
    isMultiBudget: isMulti,
    // 切换到单人模式时清空分摊数据
    budgetAllocation: isMulti ? state.budgetAllocation : [],
    // 切换到多人模式时清空单人预算选择
    budgetId: isMulti ? '' : state.budgetId,
  })),

  setBudgetAllocation: (allocation) => set({ budgetAllocation: allocation }),

  updateBudgetAllocationItem: (index, item) => set((state) => ({
    budgetAllocation: state.budgetAllocation.map((alloc, i) =>
      i === index ? { ...alloc, ...item } : alloc
    ),
  })),

  addBudgetAllocationItem: (item) => set((state) => ({
    budgetAllocation: [...state.budgetAllocation, item],
  })),

  removeBudgetAllocationItem: (index) => set((state) => ({
    budgetAllocation: state.budgetAllocation.filter((_, i) => i !== index),
  })),

  goToStep: (step) => set({ currentStep: step }),

  resetForm: () =>
    set({
      ...initialState,
      date: getCurrentDate(),
      time: getCurrentTime(),
      showKeyboardInitially: false, // 重置时不自动显示键盘
      isEditMode: false, // 重置时不是编辑模式
    }),

  fillSmartAccountingResult: (result) => {
    const updates: Partial<TransactionFormState> = {};

    // 填充金额
    if (result.amount) {
      updates.amount = result.amount.toString();
    }

    // 填充记账类型
    if (result.type) {
      updates.type = result.type;
    }

    // 填充分类信息
    if (result.categoryId) {
      updates.categoryId = result.categoryId;
    }
    if (result.categoryName) {
      updates.categoryName = result.categoryName;
    }
    if (result.categoryIcon) {
      updates.categoryIcon = result.categoryIcon;
    }

    // 填充描述/备注
    if (result.note) {
      updates.description = result.note;
    } else if (result.description) {
      updates.description = result.description;
    } else if (result.originalDescription) {
      updates.description = result.originalDescription;
    }

    // 填充日期和时间
    if (result.date) {
      try {
        // 解析API返回的日期，但只取日期部分，时间使用当前本地时间
        const apiDate = new Date(result.date);

        // 获取API返回的日期部分（本地时区）
        const year = apiDate.getFullYear();
        const month = (apiDate.getMonth() + 1).toString().padStart(2, '0');
        const day = apiDate.getDate().toString().padStart(2, '0');
        updates.date = `${year}-${month}-${day}`;

        // 时间使用当前本地时间，而不是API返回的时间
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        updates.time = `${hours}:${minutes}`;

        console.log('智能记账时间填充:', {
          apiDate: result.date,
          parsedDate: apiDate,
          finalDate: updates.date,
          finalTime: updates.time,
          currentTime: now.toLocaleString(),
        });
      } catch (dateError) {
        console.error('日期转换错误:', dateError);
        // 如果日期转换失败，使用当前本地日期和时间
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        updates.date = `${year}-${month}-${day}`;

        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        updates.time = `${hours}:${minutes}`;
      }
    } else {
      // 如果API没有返回日期，使用当前本地日期和时间
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      updates.date = `${year}-${month}-${day}`;

      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      updates.time = `${hours}:${minutes}`;
    }

    // 设置预算ID
    if (result.budgetId) {
      updates.budgetId = result.budgetId;
    }

    // 跳转到第二步
    updates.currentStep = 2;

    // 设置不显示虚拟键盘
    updates.showKeyboardInitially = false;

    set(updates);
  },
}));
