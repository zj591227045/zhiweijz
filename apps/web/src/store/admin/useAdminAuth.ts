import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ADMIN_API_ENDPOINTS, adminApi } from '@/lib/admin-api-config';

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
        
        if (!token) {
          set({ isAuthenticated: false, admin: null });
          return;
        }

        try {
          const response = await adminApi.get(ADMIN_API_ENDPOINTS.CHECK_AUTH, token);

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
          set({
            isAuthenticated: false,
            admin: null,
            token: null,
            error: '认证失败，请重新登录',
          });
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