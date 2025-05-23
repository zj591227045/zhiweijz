'use client';

import { createAccountBookStore } from '@zhiweijz/core';
import { apiClient } from '../api/api-client';
import { LocalStorageAdapter } from '../adapters/storage-adapter';
import { toast } from 'sonner';

// 创建存储适配器
const storage = new LocalStorageAdapter();

// 创建账本状态管理
export const useAccountBookStore = createAccountBookStore({
  apiClient,
  storage,
  onSuccess: (message) => {
    toast.success(message);
  },
  onError: (error) => {
    toast.error(error);
  }
});
