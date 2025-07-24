import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthResponse, LoginCredentials, RegisterData, User } from "../models";
import { StorageAdapter } from "../models/common";

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

export interface AuthStoreOptions {
  apiClient: any;
  storage: StorageAdapter;
  onLoginSuccess?: (user?: User) => void | Promise<void>;
  onLoginError?: (error: string) => void;
  onRegisterSuccess?: (user?: User) => void | Promise<void>;
  onRegisterError?: (error: string) => void;
  onLogout?: () => void;
  onResetPasswordSuccess?: () => void;
  onResetPasswordError?: (error: string) => void;
}

export const createAuthStore = (options: AuthStoreOptions) => {
  const {
    apiClient,
    storage,
    onLoginSuccess,
    onLoginError,
    onRegisterSuccess,
    onRegisterError,
    onLogout,
    onResetPasswordSuccess,
    onResetPasswordError
  } = options;

  return create<AuthState>()(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (credentials: LoginCredentials) => {
          try {
            set({ isLoading: true, error: null });
            const response = await apiClient.post("/auth/login", credentials) as AuthResponse;

            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
            });

            // 保存token到存储
            await storage.setItem("auth-token", response.token);

            // 登录成功回调
            if (onLoginSuccess) {
              await onLoginSuccess(response.user);
            }
          } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || "登录失败，请检查您的凭据";
            set({
              isLoading: false,
              error: errorMessage,
            });

            // 登录失败回调
            if (onLoginError) {
              onLoginError(errorMessage);
            }
          }
        },

        register: async (data: RegisterData) => {
          try {
            set({ isLoading: true, error: null });
            const response = await apiClient.post("/auth/register", data) as AuthResponse;

            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
            });

            // 保存token到存储
            await storage.setItem("auth-token", response.token);

            // 注册成功回调
            if (onRegisterSuccess) {
              await onRegisterSuccess(response.user);
            }
          } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || "注册失败，请稍后再试";
            set({
              isLoading: false,
              error: errorMessage,
            });

            // 注册失败回调
            if (onRegisterError) {
              onRegisterError(errorMessage);
            }
          }
        },

        logout: async () => {
          // 清除存储中的token
          await storage.removeItem("auth-token");

          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });

          // 登出回调
          if (onLogout) {
            onLogout();
          }
        },

        resetPassword: async (email: string) => {
          try {
            set({ isLoading: true, error: null });
            await apiClient.post("/auth/forgot-password", { email });
            set({ isLoading: false });

            // 重置密码成功回调
            if (onResetPasswordSuccess) {
              onResetPasswordSuccess();
            }
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || "发送重置密码邮件失败，请稍后再试";
            set({
              isLoading: false,
              error: errorMessage,
            });

            // 重置密码失败回调
            if (onResetPasswordError) {
              onResetPasswordError(errorMessage);
            }
          }
        },

        initializeAuth: async () => {
          try {
            set({ isLoading: true });

            // 从存储中获取token
            const token = await storage.getItem("auth-token");

            if (token) {
              // 验证token是否有效
              try {
                const response = await apiClient.get("/auth/check");
                // 如果验证成功，恢复认证状态
                set({
                  token,
                  isAuthenticated: true,
                  isLoading: false,
                });
              } catch (error) {
                // token无效，清除存储
                await storage.removeItem("auth-token");
                set({
                  user: null,
                  token: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
              }
            } else {
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          } catch (error) {
            console.error("初始化认证状态失败:", error);
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: "auth-storage",
        storage: {
          getItem: async (name) => {
            const value = await storage.getItem(name);
            return value ? JSON.parse(value) : null;
          },
          setItem: async (name, value) => {
            await storage.setItem(name, JSON.stringify(value));
          },
          removeItem: async (name) => {
            await storage.removeItem(name);
          },
        },
        partialize: (state) => {
          return {
            user: state.user,
            token: state.token,
            isAuthenticated: state.isAuthenticated,
          } as any;
        },
      }
    )
  );
};
