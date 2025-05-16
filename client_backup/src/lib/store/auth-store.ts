import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api/client';

// 用户类型
export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

// 认证状态类型
type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 登录
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  // 注册
  register: (email: string, password: string, name: string) => Promise<void>;
  // 登出
  logout: () => void;
  // 获取当前用户信息
  fetchUser: () => Promise<void>;
  // 重置密码
  resetPassword: (email: string) => Promise<void>;
  // 设置新密码
  setNewPassword: (token: string, password: string) => Promise<void>;
};

// 创建认证状态存储
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // 登录
      login: async (email: string, password: string, remember = false) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await api.post<{ token: string; user: User }>('/auth/login', {
            email,
            password,
          });
          
          const { token, user } = response;
          
          // 保存token到localStorage
          if (remember) {
            localStorage.setItem('token', token);
          }
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: '登录失败，请检查您的邮箱和密码',
          });
          throw error;
        }
      },
      
      // 注册
      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await api.post('/auth/register', {
            email,
            password,
            name,
          });
          
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: '注册失败，请稍后再试',
          });
          throw error;
        }
      },
      
      // 登出
      logout: () => {
        // 清除localStorage中的token
        localStorage.removeItem('token');
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
      
      // 获取当前用户信息
      fetchUser: async () => {
        const { token } = get();
        
        if (!token) return;
        
        set({ isLoading: true });
        
        try {
          const user = await api.get<User>('/auth/me');
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
      
      // 重置密码
      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await api.post('/auth/reset-password', { email });
          
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: '重置密码失败，请稍后再试',
          });
          throw error;
        }
      },
      
      // 设置新密码
      setNewPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await api.post('/auth/set-password', { token, password });
          
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: '设置新密码失败，请稍后再试',
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
);
