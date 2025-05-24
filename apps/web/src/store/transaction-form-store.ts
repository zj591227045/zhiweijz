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

  // 操作方法
  setAmount: (amount: string) => void;
  setType: (type: TransactionType) => void;
  setCategory: (id: string, name: string, icon: string | null) => void;
  setDescription: (description: string) => void;
  setDate: (date: string) => void;
  setTime: (time: string) => void;
  setBudgetId: (id: string) => void;
  goToStep: (step: number) => void;
  resetForm: () => void;
}

// 获取当前时间的HH:MM格式
const getCurrentTime = () => {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
};

const initialState = {
  currentStep: 1,
  amount: '',
  type: TransactionType.EXPENSE,
  categoryId: '',
  categoryName: '',
  categoryIcon: null,
  description: '',
  date: new Date().toISOString().split('T')[0],
  time: getCurrentTime(),
  budgetId: '',
};

export const useTransactionFormStore = create<TransactionFormState>((set) => ({
  ...initialState,

  setAmount: (amount) => set({ amount }),

  setType: (type) => set({
    type,
    categoryId: '',
    categoryName: '',
    categoryIcon: null,
    budgetId: ''
  }),

  setCategory: (id, name, icon) => set({
    categoryId: id,
    categoryName: name,
    categoryIcon: icon
  }),

  setDescription: (description) => set({ description }),

  setDate: (date) => set({ date }),

  setTime: (time) => set({ time }),

  setBudgetId: (id) => set({ budgetId: id }),

  goToStep: (step) => set({ currentStep: step }),

  resetForm: () => set({
    ...initialState,
    date: new Date().toISOString().split('T')[0],
    time: getCurrentTime(),
  }),
}));
