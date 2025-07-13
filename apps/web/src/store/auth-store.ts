'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { LoginAttempt } from '@/types/captcha';
import { performLogoutCleanup, clearApiCache } from '@/utils/cache-utils';

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
  isDeletionRequested: boolean;
  deletionScheduledAt: string | null;
  remainingHours: number;

  // 操作方法
  login: (credentials: {
    email: string;
    password: string;
    captchaToken?: string;
  }) => Promise<boolean>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    captchaToken: string;
  }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  updateAvatar: (avatarUrl: string) => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  getLoginAttempts: (email: string) => LoginAttempt;
  incrementLoginAttempts: (email: string) => void;
  resetLoginAttempts: (email: string) => void;
  verifyCaptcha: (token: string, action: 'login' | 'register') => Promise<boolean>;
  syncUserToLocalStorage: (updatedUser: User) => boolean;
  checkDeletionStatus: () => Promise<void>;
  setDeletionStatus: (isDeletionRequested: boolean, deletionScheduledAt?: string, remainingHours?: number) => void;
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
      isDeletionRequested: false,
      deletionScheduledAt: null,
      remainingHours: 0,

      // 登录
      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          // 直接传递给后端验证，不在前端重复验证
          const response = await apiClient.post('/auth/login', {
            email: credentials.email,
            password: credentials.password,
            captchaToken: credentials.captchaToken,
          });
          
          // 调试：打印完整的响应数据
          console.log('🔍 登录响应调试:', {
            response: response,
            responseData: response.data,
            dataType: typeof response.data,
            dataKeys: response.data ? Object.keys(response.data) : 'null'
          });
          
          // 修复：根据实际响应结构获取数据
          // 如果response.data存在就使用response.data，否则使用response本身
          const responseData = response.data || response;
          const { user, token } = responseData;

          // 验证必要的数据
          if (!token) {
            throw new Error('服务器响应中缺少token');
          }
          if (!user) {
            throw new Error('服务器响应中缺少用户信息');
          }

          console.log('🔍 登录数据验证通过:', { user, token: token ? '存在' : '不存在' });

          // 清除旧的API缓存，确保新用户不会看到旧数据
          clearApiCache();

          // 保存token和用户信息到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-token', token);
            localStorage.setItem('user', JSON.stringify(user));
            console.log('🔍 token和用户信息已保存到localStorage');
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // 登录成功，重置登录尝试次数
          get().resetLoginAttempts(credentials.email);

          // 检查用户注销状态
          await get().checkDeletionStatus();

          toast.success('登录成功');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || '登录失败';

          // 检查是否是注销冷静期错误
          if (error.response?.status === 423) {
            const data = error.response.data;
            if (data.isDeletionRequested) {
              set({
                isDeletionRequested: true,
                deletionScheduledAt: data.deletionScheduledAt,
                remainingHours: data.remainingHours,
                isLoading: false,
                error: errorMessage,
              });
              toast.error(`账户正在注销中，剩余 ${data.remainingHours} 小时`);
              return false;
            }
          }

          // 增加登录失败次数
          get().incrementLoginAttempts(credentials.email);

          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
          });
          toast.error(errorMessage);
          return false;
        }
      },

      // 注册
      register: async (data) => {
        try {
          set({ isLoading: true, error: null });

          // 直接传递给后端验证，不在前端重复验证
          const response = await apiClient.post('/auth/register', {
            name: data.name,
            email: data.email,
            password: data.password,
            captchaToken: data.captchaToken,
          });
          
          // 修复：根据实际响应结构获取数据
          const responseData = response.data || response;
          const { user, token } = responseData;

          // 清除旧的API缓存，确保新用户不会看到旧数据
          clearApiCache();

          // 保存token到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-token', token);
            localStorage.setItem('user', JSON.stringify(user));
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
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
            token: null,
          });
          toast.error(errorMessage);
          return false;
        }
      },

      // 登出
      logout: () => {
        // 重置认证状态
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          loginAttempts: {}, // 也清除登录尝试记录
          isDeletionRequested: false,
          deletionScheduledAt: null,
          remainingHours: 0,
        });

        toast.success('已退出登录');

        // 执行完整的登出清理流程（包括缓存清理和页面跳转）
        performLogoutCleanup();
      },

      // 更新用户资料
      updateProfile: async (data) => {
        try {
          set({ isLoading: true, error: null });

          const response = await apiClient.put('/users/me/profile', data);
          const updatedUser = response.data || response;

          // 更新 zustand store 中的用户信息
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });

          // 同步更新 localStorage 中的用户信息
          if (typeof window !== 'undefined' && updatedUser) {
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('🔍 用户信息已同步更新到localStorage:', updatedUser);
          }

          toast.success('资料更新成功');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || '更新失败';
          set({
            isLoading: false,
            error: errorMessage,
          });
          toast.error(errorMessage);
          return false;
        }
      },

      // 同步用户信息到本地存储（不执行API调用）
      syncUserToLocalStorage: (updatedUser: User) => {
        try {
          // 更新 zustand store 中的用户信息
          set({
            user: updatedUser,
          });

          // 同步更新 localStorage 中的用户信息
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('🔍 用户信息已同步更新到localStorage:', updatedUser);
            
            // 触发全局用户信息更新事件，通知所有订阅的组件
            window.dispatchEvent(new CustomEvent('userProfileUpdated', {
              detail: { user: updatedUser }
            }));
          }

          return true;
        } catch (error: any) {
          console.error('同步用户信息到localStorage失败:', error);
          return false;
        }
      },

      // 更新头像
      updateAvatar: async (avatarUrl: string) => {
        try {
          const currentUser = get().user;
          if (!currentUser) {
            throw new Error('用户未登录');
          }

          const updatedUser = { ...currentUser, avatar: avatarUrl };

          // 更新 zustand store 中的用户信息
          set({
            user: updatedUser,
          });

          // 同步更新 localStorage 中的用户信息
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('🔍 头像信息已同步更新到localStorage:', updatedUser);
            
            // 触发全局头像更新事件，通知所有订阅的组件
            window.dispatchEvent(new CustomEvent('avatarUpdated', {
              detail: { user: updatedUser, avatarUrl }
            }));
          }

          return true;
        } catch (error: any) {
          console.error('更新头像失败:', error);
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
            requiresCaptcha: false,
          };
        }

        // 检查是否需要重置（超过1小时）
        const now = Date.now();
        if (now - attempts.lastAttempt > 60 * 60 * 1000) {
          return {
            email,
            attempts: 0,
            lastAttempt: 0,
            requiresCaptcha: false,
          };
        }

        return attempts;
      },

      // 增加登录失败次数
      incrementLoginAttempts: (email: string) => {
        const current = get().getLoginAttempts(email);
        const newAttempts = current.attempts + 1;
        const requiresCaptcha = newAttempts >= 2; // 失败2次后需要验证码

        set((state) => ({
          loginAttempts: {
            ...state.loginAttempts,
            [email]: {
              email,
              attempts: newAttempts,
              lastAttempt: Date.now(),
              requiresCaptcha,
            },
          },
        }));
      },

      // 重置登录尝试次数
      resetLoginAttempts: (email: string) => {
        set((state) => {
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
            action,
          });
          return response.data.success;
        } catch (error) {
          console.error('验证码验证失败:', error);
          return false;
        }
      },

      // 检查用户注销状态
      checkDeletionStatus: async () => {
        try {
          const response = await apiClient.get('/users/me/deletion-status');
          const data = response.data || response;

          set({
            isDeletionRequested: data.isDeletionRequested || false,
            deletionScheduledAt: data.deletionScheduledAt || null,
            remainingHours: data.remainingHours || 0,
          });
        } catch (error: any) {
          console.error('检查注销状态失败:', error);

          // 如果是423错误，说明用户在冷静期
          if (error.response?.status === 423) {
            const data = error.response.data;
            set({
              isDeletionRequested: true,
              deletionScheduledAt: data.deletionScheduledAt || null,
              remainingHours: data.remainingHours || 0,
            });
          } else {
            // 其他错误，重置状态
            set({
              isDeletionRequested: false,
              deletionScheduledAt: null,
              remainingHours: 0,
            });
          }
        }
      },

      // 设置注销状态
      setDeletionStatus: (isDeletionRequested: boolean, deletionScheduledAt?: string, remainingHours?: number) => {
        set({
          isDeletionRequested,
          deletionScheduledAt: deletionScheduledAt || null,
          remainingHours: remainingHours || 0,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loginAttempts: state.loginAttempts,
        isDeletionRequested: state.isDeletionRequested,
        deletionScheduledAt: state.deletionScheduledAt,
        remainingHours: state.remainingHours,
      }),
    },
  ),
);
