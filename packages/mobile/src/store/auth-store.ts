import { createAuthStore } from '@zhiweijz/core';
import { apiClient, setAuthToken, clearAuthToken } from '../api/api-client';
import { AsyncStorageAdapter } from '../adapters/storage-adapter';
import { Alert } from 'react-native';

/**
 * 移动端存储适配器实例
 */
const storage = new AsyncStorageAdapter();

/**
 * 移动端认证状态管理
 * 基于核心包的认证store，添加移动端特定的处理逻辑
 */
export const useAuthStore = createAuthStore({
  apiClient,
  storage,
  onLoginSuccess: () => {
    // 移动端特定的登录成功处理
    console.log('登录成功');
    // 不显示Alert，避免打断用户体验
  },
  onLoginError: (error) => {
    // 移动端特定的登录错误处理
    console.error('登录失败:', error);
    // 错误处理在组件中进行
  },
  onLogout: async () => {
    // 移动端特定的登出处理
    console.log('登出成功');
    await clearAuthToken();
  },
  onRegisterSuccess: () => {
    // 移动端特定的注册成功处理
    console.log('注册成功');
    // 不显示Alert，避免打断用户体验
  },
  onRegisterError: (error) => {
    // 移动端特定的注册错误处理
    console.error('注册失败:', error);
    // 错误处理在组件中进行
  },
});
