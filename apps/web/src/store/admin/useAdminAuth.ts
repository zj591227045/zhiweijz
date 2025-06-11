import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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
          const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          });

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
          const response = await fetch(`${API_BASE_URL}/api/admin/auth/check`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

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