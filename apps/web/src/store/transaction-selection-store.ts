import { create } from 'zustand';

interface TransactionRecord {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
  note?: string;
  date: string;
  categoryId: string;
  categoryName?: string;
  budgetId?: string;
  duplicateDetection?: {
    isDuplicate: boolean;
    confidence: number;
    matchedTransactions: Array<{
      id: string;
      amount: number;
      description: string;
      date: Date;
      categoryName: string;
      similarity: number;
    }>;
    reason?: string;
  };
}

interface ImageFileInfo {
  id: string;
  url: string;
  size: number;
  filename: string;
  mimeType: string;
}

interface TransactionSelectionState {
  // 状态
  isOpen: boolean;
  records: TransactionRecord[];
  isLoading: boolean;
  accountBookId?: string;
  imageFileInfo?: ImageFileInfo; // 添加图片文件信息

  // 回调函数
  onConfirm?: (selectedRecords: TransactionRecord[], imageFileInfo?: ImageFileInfo) => Promise<void>;

  // 操作方法
  showSelectionModal: (
    records: TransactionRecord[],
    accountBookId: string,
    onConfirm: (selectedRecords: TransactionRecord[], imageFileInfo?: ImageFileInfo) => Promise<void>,
    imageFileInfo?: ImageFileInfo
  ) => void;
  hideSelectionModal: () => void;
  setLoading: (loading: boolean) => void;
}

export const useTransactionSelectionStore = create<TransactionSelectionState>((set, get) => ({
  // 初始状态
  isOpen: false,
  records: [],
  isLoading: false,
  accountBookId: undefined,
  imageFileInfo: undefined,
  onConfirm: undefined,

  // 显示记录选择模态框
  showSelectionModal: (records, accountBookId, onConfirm, imageFileInfo) => {
    console.log('🔄 [TransactionSelectionStore] 显示记录选择模态框:', {
      recordsCount: records.length,
      accountBookId,
      hasImageFile: !!imageFileInfo,
    });

    set({
      isOpen: true,
      records,
      accountBookId,
      onConfirm,
      imageFileInfo,
      isLoading: false,
    });
  },

  // 隐藏记录选择模态框
  hideSelectionModal: () => {
    console.log('🔄 [TransactionSelectionStore] 隐藏记录选择模态框');

    set({
      isOpen: false,
      records: [],
      accountBookId: undefined,
      imageFileInfo: undefined,
      onConfirm: undefined,
      isLoading: false,
    });
  },

  // 设置加载状态
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));
