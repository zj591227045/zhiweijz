import { create } from 'zustand';

/**
 * 文件存储状态接口
 */
export interface FileStorageStatus {
  enabled: boolean;
  configured: boolean;
  healthy: boolean;
  message: string;
}

/**
 * 文件存储Store状态接口
 */
interface FileStorageState {
  status: FileStorageStatus | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setStatus: (status: FileStorageStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isStorageAvailable: () => boolean;
}

/**
 * 简化版文件存储状态Store
 */
export const useFileStorageStore = create<FileStorageState>((set, get) => ({
  // 初始状态
  status: null,
  isLoading: false,
  error: null,

  // Actions
  setStatus: (status) => set({ status, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // 检查存储是否可用
  isStorageAvailable: () => {
    const { status } = get();
    return status?.enabled && status?.configured && status?.healthy;
  },
}));

/**
 * 简化版文件存储状态Hook
 */
export const useFileStorageStatus = () => {
  const {
    status,
    isLoading,
    error,
    isStorageAvailable,
  } = useFileStorageStore();

  return {
    status,
    isLoading,
    error,
    isAvailable: isStorageAvailable(),
  };
};
