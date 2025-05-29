import { createTransactionStore } from '@zhiweijz/core';
import { apiClient } from '../api/api-client';
import { AsyncStorageAdapter } from '../adapters/storage-adapter';
import { Alert } from 'react-native';

/**
 * 移动端存储适配器实例
 */
const storage = new AsyncStorageAdapter();

/**
 * 移动端交易状态管理
 * 基于核心包的交易store，添加移动端特定的处理逻辑
 */
export const useTransactionStore = createTransactionStore({
  apiClient,
  storage,
  onCreateSuccess: (transaction) => {
    // 移动端特定的创建成功处理
    console.log('交易创建成功:', transaction);
    // 不显示Alert，避免打断用户体验
  },
  onCreateError: (error) => {
    // 移动端特定的创建错误处理
    console.error('交易创建失败:', error);
    // 错误处理在组件中进行
  },
  onUpdateSuccess: (transaction) => {
    // 移动端特定的更新成功处理
    console.log('交易更新成功:', transaction);
    // 不显示Alert，避免打断用户体验
  },
  onUpdateError: (error) => {
    // 移动端特定的更新错误处理
    console.error('交易更新失败:', error);
    // 错误处理在组件中进行
  },
  onDeleteSuccess: () => {
    // 移动端特定的删除成功处理
    console.log('交易删除成功');
    // 不显示Alert，避免打断用户体验
  },
  onDeleteError: (error) => {
    // 移动端特定的删除错误处理
    console.error('交易删除失败:', error);
    // 错误处理在组件中进行
  },
});
