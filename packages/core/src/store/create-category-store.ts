import { create } from 'zustand';
import { StorageAdapter } from '../adapters/storage-adapter';
import {
  Category,
  TransactionType,
  CreateCategoryData,
  UpdateCategoryData
} from '../models/category';

// 分类状态接口
export interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  fetchCategories: (type?: TransactionType, accountBookId?: string) => Promise<void>;
  getCategory: (id: string) => Promise<Category | null>;
  createCategory: (data: CreateCategoryData) => Promise<boolean>;
  updateCategory: (id: string, data: UpdateCategoryData) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  updateCategoryOrder: (categoryIds: string[]) => Promise<boolean>;
  clearError: () => void;
}

// 分类store选项接口
export interface CategoryStoreOptions {
  apiClient: any;
  storage: StorageAdapter;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export const createCategoryStore = (options: CategoryStoreOptions) => {
  const { apiClient, storage, onSuccess, onError } = options;

  return create<CategoryState>((set, get) => ({
    categories: [],
    isLoading: false,
    error: null,

    // 获取分类列表
    fetchCategories: async (type?: TransactionType, accountBookId?: string) => {
      try {
        set({ isLoading: true, error: null });

        const params: Record<string, string> = {};
        if (type) params.type = type;
        if (accountBookId) params.accountBookId = accountBookId;

        const response = await apiClient.get('/categories', { params });

        // 处理不同的响应格式
        let categories = [];
        if (response && typeof response === 'object') {
          if ('data' in response && Array.isArray(response.data)) {
            categories = response.data;
          } else if (Array.isArray(response)) {
            categories = response;
          }
        }

        set({
          categories,
          isLoading: false
        });
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '获取分类列表失败';
        set({
          isLoading: false,
          error: errorMessage,
        });

        if (onError) {
          onError(errorMessage);
        }
      }
    },

    // 获取单个分类
    getCategory: async (id: string) => {
      try {
        const response = await apiClient.get(`/categories/${id}`);

        // 处理响应格式
        let category = null;
        if (response && typeof response === 'object') {
          if ('data' in response) {
            category = response.data;
          } else {
            category = response;
          }
        }

        return category;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '获取分类详情失败';
        set({ error: errorMessage });

        if (onError) {
          onError(errorMessage);
        }

        return null;
      }
    },

    // 创建分类
    createCategory: async (data: CreateCategoryData) => {
      try {
        set({ isLoading: true, error: null });

        await apiClient.post('/categories', data);

        set({ isLoading: false });

        if (onSuccess) {
          onSuccess('分类创建成功');
        }

        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '创建分类失败';
        set({
          isLoading: false,
          error: errorMessage,
        });

        if (onError) {
          onError(errorMessage);
        }

        return false;
      }
    },

    // 更新分类
    updateCategory: async (id: string, data: UpdateCategoryData) => {
      try {
        set({ isLoading: true, error: null });

        await apiClient.put(`/categories/${id}`, data);

        set({ isLoading: false });

        if (onSuccess) {
          onSuccess('分类更新成功');
        }

        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '更新分类失败';
        set({
          isLoading: false,
          error: errorMessage,
        });

        if (onError) {
          onError(errorMessage);
        }

        return false;
      }
    },

    // 删除分类
    deleteCategory: async (id: string) => {
      try {
        set({ isLoading: true, error: null });

        await apiClient.delete(`/categories/${id}`);

        set({ isLoading: false });

        if (onSuccess) {
          onSuccess('分类删除成功');
        }

        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '删除分类失败';
        set({
          isLoading: false,
          error: errorMessage,
        });

        if (onError) {
          onError(errorMessage);
        }

        return false;
      }
    },

    // 更新分类排序
    updateCategoryOrder: async (categoryIds: string[]) => {
      try {
        set({ isLoading: true, error: null });

        await apiClient.put('/categories/order', { categoryIds });

        set({ isLoading: false });

        if (onSuccess) {
          onSuccess('分类排序更新成功');
        }

        return true;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '更新分类排序失败';
        set({
          isLoading: false,
          error: errorMessage,
        });

        if (onError) {
          onError(errorMessage);
        }

        return false;
      }
    },

    // 清除错误
    clearError: () => {
      set({ error: null });
    },
  }));
};
