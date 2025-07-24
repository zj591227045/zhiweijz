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
  onLoginSuccess: async (user) => {
    // 移动端特定的登录成功处理
    console.log('登录成功');

    // 设置RevenueCat用户ID
    try {
      // 动态导入移动端支付服务
      const { setPaymentUserId } = await import('../lib/mobile-payment-init');
      await setPaymentUserId(user?.id || '');
      console.log('💰 [Auth] RevenueCat用户ID设置成功');
    } catch (error) {
      console.warn('💰 [Auth] 设置RevenueCat用户ID失败:', error);
      // 不影响登录流程，继续执行
    }

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

    // 清理RevenueCat用户状态
    try {
      const { clearPaymentUser } = await import('../lib/mobile-payment-init');
      await clearPaymentUser();
      console.log('💰 [Auth] RevenueCat用户状态已清理');
    } catch (error) {
      console.warn('💰 [Auth] 清理RevenueCat用户状态失败:', error);
    }

    await clearAuthToken();
  },
  onRegisterSuccess: async (user) => {
    // 移动端特定的注册成功处理
    console.log('注册成功');

    // 设置RevenueCat用户ID
    try {
      // 动态导入移动端支付服务
      const { setPaymentUserId } = await import('../lib/mobile-payment-init');
      await setPaymentUserId(user?.id || '');
      console.log('💰 [Auth] RevenueCat用户ID设置成功');
    } catch (error) {
      console.warn('💰 [Auth] 设置RevenueCat用户ID失败:', error);
      // 不影响注册流程，继续执行
    }

    // 不显示Alert，避免打断用户体验
  },
  onRegisterError: (error) => {
    // 移动端特定的注册错误处理
    console.error('注册失败:', error);
    // 错误处理在组件中进行
  },
});
