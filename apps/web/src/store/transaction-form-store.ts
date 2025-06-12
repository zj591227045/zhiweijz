import { create } from 'zustand';
import { TransactionType } from '@/types';

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
  setShowKeyboardInitially: (show: boolean) => void;
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
  showKeyboardInitially: true,
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

  setShowKeyboardInitially: (show) => set({ showKeyboardInitially: show }),

  goToStep: (step) => set({ currentStep: step }),

  resetForm: () =>
    set({
      ...initialState,
      date: getCurrentDate(),
      time: getCurrentTime(),
      showKeyboardInitially: false, // 重置时不自动显示键盘
    }),

  fillSmartAccountingResult: (result) => {
    const updates: Partial<TransactionFormState> = {};

    // 填充金额
    if (result.amount) {
      updates.amount = result.amount.toString();
    }

    // 填充交易类型
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
