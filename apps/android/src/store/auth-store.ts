import { createAuthStore } from '@zhiweijz/core';
import { Alert } from 'react-native';
import { AsyncStorageAdapter } from '../adapters/storage-adapter';
import { createApiClient } from '../api/api-client';

/**
 * 创建存储适配器实例
 */
const storage = new AsyncStorageAdapter();

/**
 * 创建API客户端实例
 */
const apiClient = createApiClient(storage);

/**
 * Android端认证状态管理
 * 使用核心包的统一状态管理，添加Android端特定的处理逻辑
 */
export const useAuthStore = createAuthStore({
  apiClient,
  storage,
  onLoginSuccess: () => {
    // Android端特定的登录成功处理
    console.log('登录成功');
    // 不显示Alert，避免打断用户体验
  },
  onLoginError: (error) => {
    // Android端特定的登录错误处理
    console.error('登录失败:', error);
    Alert.alert('登录失败', error);
  },
  onRegisterSuccess: () => {
    // Android端特定的注册成功处理
    console.log('注册成功');
    Alert.alert('注册成功', '欢迎使用只为记账！');
  },
  onRegisterError: (error) => {
    // Android端特定的注册错误处理
    console.error('注册失败:', error);
    Alert.alert('注册失败', error);
  },
  onLogout: () => {
    // Android端特定的登出处理
    console.log('登出成功');
  },
});
