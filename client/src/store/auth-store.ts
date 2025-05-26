import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthResponse, LoginCredentials, RegisterData, User } from "@/types";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.post<AuthResponse>("/auth/login", credentials);

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          // 保存token到localStorage
          localStorage.setItem("auth-token", response.token);

          // 登录成功提示
          toast.success("登录成功");
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.error?.message || "登录失败，请检查您的凭据",
          });
        }
      },

      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.post<AuthResponse>("/auth/register", data);

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          // 保存token到localStorage
          localStorage.setItem("auth-token", response.token);

          // 注册成功提示
          toast.success("注册成功");
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.error?.message || "注册失败，请稍后再试",
          });
        }
      },

      logout: () => {
        // 清除localStorage中的token
        localStorage.removeItem("auth-token");

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      initialize: () => {
        // 标记为已初始化
        set({ isInitialized: true });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          // 当从localStorage恢复完成后，立即标记为已初始化
          if (state) {
            state.initialize();
          }
        };
      },
    }
  )
);
