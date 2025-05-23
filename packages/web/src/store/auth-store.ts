'use client';

import { createAuthStore } from '@zhiweijz/core';
import { apiClient } from '../api/api-client';
import { LocalStorageAdapter } from '../adapters/storage-adapter';
import { toast } from 'sonner';

// 创建存储适配器
const storage = new LocalStorageAdapter();

// 创建认证状态管理
export const useAuthStore = createAuthStore({
  apiClient,
  storage,
  onLoginSuccess: () => {
    toast.success("登录成功");
  },
  onLoginError: (error) => {
    toast.error(error);
  },
  onRegisterSuccess: () => {
    toast.success("注册成功");
  },
  onRegisterError: (error) => {
    toast.error(error);
  },
  onLogout: () => {
    toast.info("已退出登录");
  }
});
