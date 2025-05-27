'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/api/api-client';
import { toast } from 'sonner';

// 用户类型定义
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  birthDate?: string;
  createdAt: string;
}

// 认证状态类型
interface AuthState {
  // 状态
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 操作方法
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// 创建认证状态管理
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录
      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          const response = await apiClient.post('/auth/login', credentials);
          const { user, token } = response.data;

          // 保存token和用户信息到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-token', token);
            localStorage.setItem('user', JSON.stringify(user));
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          toast.success('登录成功');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || '登录失败';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null
          });
          toast.error(errorMessage);
          return false;
        }
      },

      // 注册
      register: async (data) => {
        try {
          set({ isLoading: true, error: null });

          const response = await apiClient.post('/auth/register', data);
          const { user, token } = response.data;

          // 保存token到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-token', token);
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          toast.success('注册成功');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || '注册失败';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null
          });
          toast.error(errorMessage);
          return false;
        }
      },

      // 登出
      logout: () => {
        // 清除localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
          localStorage.removeItem('user');
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });

        toast.success('已退出登录');
      },

      // 更新用户资料
      updateProfile: async (data) => {
        try {
          set({ isLoading: true, error: null });

          const response = await apiClient.put('/users/profile', data);
          const updatedUser = response.data;

          set({
            user: updatedUser,
            isLoading: false,
            error: null
          });

          toast.success('资料更新成功');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || '更新失败';
          set({
            isLoading: false,
            error: errorMessage
          });
          toast.error(errorMessage);
          return false;
        }
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 设置加载状态
      setLoading: (loading) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);