'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/api/api-client';
import { toast } from 'sonner';
import { LoginAttempt } from '@/types/captcha';

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
  loginAttempts: Record<string, LoginAttempt>;

  // 操作方法
  login: (credentials: { email: string; password: string; captchaToken?: string }) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string; captchaToken: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  getLoginAttempts: (email: string) => LoginAttempt;
  incrementLoginAttempts: (email: string) => void;
  resetLoginAttempts: (email: string) => void;
  verifyCaptcha: (token: string, action: 'login' | 'register') => Promise<boolean>;
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
      loginAttempts: {},

      // 登录
      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          // 如果需要验证码，先验证验证码
          if (credentials.captchaToken) {
            const captchaValid = await get().verifyCaptcha(credentials.captchaToken, 'login');
            if (!captchaValid) {
              throw new Error('验证码验证失败');
            }
          }

          const response = await apiClient.post('/auth/login', {
            email: credentials.email,
            password: credentials.password,
            captchaToken: credentials.captchaToken
          });
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

          // 登录成功，重置登录尝试次数
          get().resetLoginAttempts(credentials.email);
          toast.success('登录成功');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || '登录失败';

          // 增加登录失败次数
          get().incrementLoginAttempts(credentials.email);

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

          // 验证验证码
          const captchaValid = await get().verifyCaptcha(data.captchaToken, 'register');
          if (!captchaValid) {
            throw new Error('验证码验证失败');
          }

          const response = await apiClient.post('/auth/register', {
            name: data.name,
            email: data.email,
            password: data.password,
            captchaToken: data.captchaToken
          });
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
      },

      // 获取登录尝试信息
      getLoginAttempts: (email: string): LoginAttempt => {
        const attempts = get().loginAttempts[email];
        if (!attempts) {
          return {
            email,
            attempts: 0,
            lastAttempt: 0,
            requiresCaptcha: false
          };
        }

        // 检查是否需要重置（超过1小时）
        const now = Date.now();
        if (now - attempts.lastAttempt > 60 * 60 * 1000) {
          return {
            email,
            attempts: 0,
            lastAttempt: 0,
            requiresCaptcha: false
          };
        }

        return attempts;
      },

      // 增加登录失败次数
      incrementLoginAttempts: (email: string) => {
        const current = get().getLoginAttempts(email);
        const newAttempts = current.attempts + 1;
        const requiresCaptcha = newAttempts >= 2; // 失败2次后需要验证码



        set(state => ({
          loginAttempts: {
            ...state.loginAttempts,
            [email]: {
              email,
              attempts: newAttempts,
              lastAttempt: Date.now(),
              requiresCaptcha
            }
          }
        }));
      },

      // 重置登录尝试次数
      resetLoginAttempts: (email: string) => {
        set(state => {
          const newAttempts = { ...state.loginAttempts };
          delete newAttempts[email];
          return { loginAttempts: newAttempts };
        });
      },

      // 验证验证码
      verifyCaptcha: async (token: string, action: 'login' | 'register'): Promise<boolean> => {
        try {
          const response = await apiClient.post('/auth/verify-captcha', {
            token,
            action
          });
          return response.data.success;
        } catch (error) {
          console.error('验证码验证失败:', error);
          return false;
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loginAttempts: state.loginAttempts
      })
    }
  )
);