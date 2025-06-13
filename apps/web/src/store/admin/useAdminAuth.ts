import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ADMIN_API_ENDPOINTS, adminApi } from '@/lib/admin-api-client';

interface AdminInfo {
  id: string;
  username: string;
  email: string | null;
  role: string;
  lastLoginAt: string | null;
}

interface AdminAuthState {
  isAuthenticated: boolean;
  admin: AdminInfo | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      admin: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await adminApi.post(ADMIN_API_ENDPOINTS.LOGIN, { username, password });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || '登录失败');
          }

          if (!data.success) {
            throw new Error(data.message || '登录失败');
          }

          // 将token存储到localStorage供API客户端使用
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-token', data.data.token);
          }

          set({
            isAuthenticated: true,
            admin: data.data.admin,
            token: data.data.token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isAuthenticated: false,
            admin: null,
            token: null,
            isLoading: false,
            error: error instanceof Error ? error.message : '登录失败',
          });
          throw error;
        }
      },

      logout: () => {
        // 清除localStorage中的token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
        }
        
        set({
          isAuthenticated: false,
          admin: null,
          token: null,
          error: null,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isAuthenticated: false, admin: null });
          return;
        }

        try {
          const response = await adminApi.get(ADMIN_API_ENDPOINTS.CHECK_AUTH);

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error('认证失败');
          }

          set({
            isAuthenticated: true,
            admin: data.data.admin,
            error: null,
          });
        } catch (error) {
          // 清除localStorage中的token
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-token');
          }
          
          set({
            isAuthenticated: false,
            admin: null,
            token: null,
            error: '认证失败，请重新登录',
          });
        }
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await adminApi.post(ADMIN_API_ENDPOINTS.CHANGE_PASSWORD, {
            oldPassword,
            newPassword
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || '修改密码失败');
          }

          if (!data.success) {
            throw new Error(data.message || '修改密码失败');
          }

          set({ isLoading: false, error: null });
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : '修改密码失败',
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
); 