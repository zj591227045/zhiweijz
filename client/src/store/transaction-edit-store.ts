import { create } from "zustand";
import { Transaction, TransactionType } from "@/types";

// 交易编辑表单状态类型
interface TransactionEditState {
  // 原始交易数据
  originalTransaction: Transaction | null;
  
  // 表单数据
  amount: string;
  type: TransactionType;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  description: string;
  date: Date;
  time: string;
  accountBookId: string | null;
  familyId: string | null;
  familyMemberId: string | null;
  notes: string;
  
  // 步骤状态
  currentStep: 1 | 2;
  
  // 表单提交状态
  isSubmitting: boolean;
  submitError: string | null;
  
  // 操作方法
  setOriginalTransaction: (transaction: Transaction) => void;
  setAmount: (amount: string) => void;
  setType: (type: TransactionType) => void;
  setCategory: (id: string, name: string, icon: string | null) => void;
  setDescription: (description: string) => void;
  setDate: (date: Date) => void;
  setTime: (time: string) => void;
  setAccountBookId: (id: string | null) => void;
  setFamilyId: (id: string | null) => void;
  setFamilyMemberId: (id: string | null) => void;
  setNotes: (notes: string) => void;
  
  // 步骤控制
  goToStep: (step: 1 | 2) => void;
  
  // 表单状态控制
  setSubmitting: (isSubmitting: boolean) => void;
  setSubmitError: (error: string | null) => void;
  
  // 重置表单
  resetForm: () => void;
}

// 创建交易编辑表单状态存储
export const useTransactionEditStore = create<TransactionEditState>((set) => {
  // 获取当前日期和时间
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  return {
    // 初始状态
    originalTransaction: null,
    amount: '',
    type: 'EXPENSE',
    categoryId: null,
    categoryName: null,
    categoryIcon: null,
    description: '',
    date: now,
    time: `${hours}:${minutes}`,
    accountBookId: null,
    familyId: null,
    familyMemberId: null,
    notes: '',
    
    currentStep: 1,
    isSubmitting: false,
    submitError: null,
    
    // 设置原始交易数据
    setOriginalTransaction: (transaction) => {
      // 解析日期和时间
      const transactionDate = new Date(transaction.date);
      const hours = transactionDate.getHours().toString().padStart(2, '0');
      const minutes = transactionDate.getMinutes().toString().padStart(2, '0');
      
      set({
        originalTransaction: transaction,
        amount: transaction.amount.toString(),
        type: transaction.type,
        categoryId: transaction.categoryId,
        categoryName: transaction.category?.name || null,
        categoryIcon: transaction.category?.icon || null,
        description: transaction.description || '',
        date: transactionDate,
        time: `${hours}:${minutes}`,
        accountBookId: transaction.accountBookId,
        familyId: transaction.familyId || null,
        familyMemberId: transaction.familyMemberId || null,
        notes: transaction.notes || '',
        currentStep: 2, // 默认显示详情步骤
      });
    },
    
    // 设置金额
    setAmount: (amount) => set({ amount }),
    
    // 设置交易类型
    setType: (type) => set({ 
      type,
      // 切换类型时重置分类
      categoryId: null,
      categoryName: null,
      categoryIcon: null
    }),
    
    // 设置分类
    setCategory: (id, name, icon) => set({ 
      categoryId: id, 
      categoryName: name,
      categoryIcon: icon
    }),
    
    // 设置描述
    setDescription: (description) => set({ description }),
    
    // 设置日期
    setDate: (date) => set({ date }),
    
    // 设置时间
    setTime: (time) => set({ time }),
    
    // 设置账本ID
    setAccountBookId: (accountBookId) => set({ accountBookId }),
    
    // 设置家庭ID
    setFamilyId: (familyId) => set({ 
      familyId,
      // 切换家庭时重置成员
      familyMemberId: null
    }),
    
    // 设置家庭成员ID
    setFamilyMemberId: (familyMemberId) => set({ familyMemberId }),
    
    // 设置备注
    setNotes: (notes) => set({ notes }),
    
    // 切换步骤
    goToStep: (step) => set({ currentStep: step }),
    
    // 设置提交状态
    setSubmitting: (isSubmitting) => set({ isSubmitting }),
    
    // 设置提交错误
    setSubmitError: (submitError) => set({ submitError }),
    
    // 重置表单
    resetForm: () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      
      set({
        originalTransaction: null,
        amount: '',
        type: 'EXPENSE',
        categoryId: null,
        categoryName: null,
        categoryIcon: null,
        description: '',
        date: now,
        time: `${hours}:${minutes}`,
        accountBookId: null,
        familyId: null,
        familyMemberId: null,
        notes: '',
        currentStep: 1,
        isSubmitting: false,
        submitError: null
      });
    }
  };
});
