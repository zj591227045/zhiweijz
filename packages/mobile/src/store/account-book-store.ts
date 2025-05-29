import { createAccountBookStore } from '@zhiweijz/core';
import { apiClient } from '../api/api-client';
import { AsyncStorageAdapter } from '../adapters/storage-adapter';
import { Alert } from 'react-native';

/**
 * 移动端存储适配器实例
 */
const storage = new AsyncStorageAdapter();

/**
 * 移动端账本状态管理
 * 基于核心包的账本store，添加移动端特定的处理逻辑
 */
export const useAccountBookStore = createAccountBookStore({
  apiClient,
  storage,
  onSuccess: (message) => {
    // 移动端特定的成功处理
    console.log('账本操作成功:', message);
    // 不显示Alert，避免打断用户体验
  },
  onError: (error) => {
    // 移动端特定的错误处理
    console.error('账本操作失败:', error);
    // 错误处理在组件中进行
  },
});
