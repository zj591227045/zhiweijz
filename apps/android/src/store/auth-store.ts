import { create } from 'zustand';
import { Alert } from 'react-native';

// 用户类型定义
interface User {
  id: string;
  name: string;
  email: string;
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
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// API基础URL - 使用配置的服务器地址
const API_BASE_URL = 'http://10.255.0.97/api';

// 简单的API客户端
const apiClient = {
  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '请求失败');
    }

    return response.json();
  },
};

// 创建认证状态管理（临时不使用持久化）
export const useAuthStore = create<AuthState>()((set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录方法
      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          console.log('尝试登录:', credentials.email);
          const response = await apiClient.post('/auth/login', credentials);

          console.log('登录响应:', response);

          if (response.token && response.user) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
            });

            // TODO: 保存token到存储（暂时跳过）
            console.log('Token saved:', response.token);

            console.log('登录成功');
            return true;
          } else {
            throw new Error('登录响应格式错误');
          }
        } catch (error: any) {
          console.error('登录失败:', error);
          const errorMessage = error.message || '登录失败，请检查您的凭据';
          set({
            isLoading: false,
            error: errorMessage,
          });

          Alert.alert('登录失败', errorMessage);
          return false;
        }
      },

      // 注册方法
      register: async (data) => {
        try {
          set({ isLoading: true, error: null });

          console.log('尝试注册:', data.email);
          const response = await apiClient.post('/auth/register', data);

          console.log('注册响应:', response);

          if (response.token && response.user) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
            });

            // TODO: 保存token到存储（暂时跳过）
            console.log('Token saved:', response.token);

            console.log('注册成功');
            Alert.alert('注册成功', '欢迎使用只为记账！');
            return true;
          } else {
            throw new Error('注册响应格式错误');
          }
        } catch (error: any) {
          console.error('注册失败:', error);
          const errorMessage = error.message || '注册失败，请稍后重试';
          set({
            isLoading: false,
            error: errorMessage,
          });

          Alert.alert('注册失败', errorMessage);
          return false;
        }
      },

      // 登出方法
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });

        console.log('登出成功');
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 设置加载状态
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }));
