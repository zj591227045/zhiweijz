import { create } from "zustand";
import { Transaction } from "@/types";

interface TransactionDetailState {
  // 交易详情数据
  transaction: Transaction | null;
  
  // 加载状态
  isLoading: boolean;
  isDeleting: boolean;
  isUpdatingNotes: boolean;
  
  // 错误状态
  error: string | null;
  
  // 确认对话框状态
  isDeleteConfirmOpen: boolean;
  
  // 备注编辑状态
  isEditingNotes: boolean;
  notesValue: string;
  
  // 操作方法
  setTransaction: (transaction: Transaction | null) => void;
  setLoading: (isLoading: boolean) => void;
  setDeleting: (isDeleting: boolean) => void;
  setUpdatingNotes: (isUpdating: boolean) => void;
  setError: (error: string | null) => void;
  openDeleteConfirm: () => void;
  closeDeleteConfirm: () => void;
  startEditingNotes: () => void;
  cancelEditingNotes: () => void;
  setNotesValue: (value: string) => void;
  resetState: () => void;
}

export const useTransactionDetailStore = create<TransactionDetailState>((set) => ({
  // 初始状态
  transaction: null,
  isLoading: true,
  isDeleting: false,
  isUpdatingNotes: false,
  error: null,
  isDeleteConfirmOpen: false,
  isEditingNotes: false,
  notesValue: "",
  
  // 设置交易详情
  setTransaction: (transaction) => set({ 
    transaction,
    notesValue: transaction?.notes || "",
    isLoading: false 
  }),
  
  // 设置加载状态
  setLoading: (isLoading) => set({ isLoading }),
  
  // 设置删除状态
  setDeleting: (isDeleting) => set({ isDeleting }),
  
  // 设置更新备注状态
  setUpdatingNotes: (isUpdatingNotes) => set({ isUpdatingNotes }),
  
  // 设置错误状态
  setError: (error) => set({ error, isLoading: false }),
  
  // 打开删除确认对话框
  openDeleteConfirm: () => set({ isDeleteConfirmOpen: true }),
  
  // 关闭删除确认对话框
  closeDeleteConfirm: () => set({ isDeleteConfirmOpen: false }),
  
  // 开始编辑备注
  startEditingNotes: () => set({ isEditingNotes: true }),
  
  // 取消编辑备注
  cancelEditingNotes: () => set((state) => ({ 
    isEditingNotes: false,
    notesValue: state.transaction?.notes || "" 
  })),
  
  // 设置备注值
  setNotesValue: (notesValue) => set({ notesValue }),
  
  // 重置状态
  resetState: () => set({
    transaction: null,
    isLoading: true,
    isDeleting: false,
    isUpdatingNotes: false,
    error: null,
    isDeleteConfirmOpen: false,
    isEditingNotes: false,
    notesValue: ""
  })
}));
