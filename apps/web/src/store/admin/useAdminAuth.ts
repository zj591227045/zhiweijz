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
      token: null, // token将通过persist中间件自动恢复
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

          // token会通过persist自动存储

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
        set({
          isAuthenticated: false,
          admin: null,
          token: null,
          error: null,
        });
      },

      checkAuth: async () => {
        const { token } = get();

        console.log('🔍 [useAdminAuth] checkAuth called:', { hasToken: !!token });

        if (!token) {
          console.log('🔍 [useAdminAuth] No token, setting unauthenticated');
          set({ isAuthenticated: false, admin: null });
          return;
        }

        try {
          console.log('🔍 [useAdminAuth] Making auth check request');
          const response = await adminApi.get(ADMIN_API_ENDPOINTS.CHECK_AUTH);

          const data = await response.json();
          console.log('🔍 [useAdminAuth] Auth check response:', {
            ok: response.ok,
            status: response.status,
            success: data.success,
          });

          if (!response.ok || !data.success) {
            throw new Error('认证失败');
          }

          console.log('🔍 [useAdminAuth] Auth check successful, setting authenticated');
          set({
            isAuthenticated: true,
            admin: data.data.admin,
            error: null,
          });
        } catch (error) {
          console.log('🔍 [useAdminAuth] Auth check failed:', error);
          // token会通过persist自动清除

          set({
            isAuthenticated: false,
            admin: null,
            token: null,
            error: '认证失败，请重新登录',
          });
          throw error; // 重新抛出错误以便上层处理
        }
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await adminApi.post(ADMIN_API_ENDPOINTS.CHANGE_PASSWORD, {
            oldPassword,
            newPassword,
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
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
