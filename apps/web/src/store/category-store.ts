'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Category, TransactionType } from '@/types';

// 分类状态类型
interface CategoryState {
  // 数据状态
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  // 操作方法
  fetchCategories: (
    type?: TransactionType,
    accountBookId?: string,
    includeHidden?: boolean,
  ) => Promise<void>;
  getCategory: (id: string) => Promise<Category | null>;
  createCategory: (data: {
    name: string;
    type: TransactionType;
    icon?: string;
    color?: string;
    accountBookId: string;
  }) => Promise<boolean>;
  updateCategory: (
    id: string,
    data: {
      name?: string;
      icon?: string;
      color?: string;
      isHidden?: boolean;
    },
  ) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  updateCategoryOrder: (categoryIds: string[]) => Promise<boolean>;
}

// 创建分类状态管理
export const useCategoryStore = create<CategoryState>((set, get) => ({
  // 初始状态
  categories: [],
  isLoading: false,
  error: null,

  // 获取分类列表
  fetchCategories: async (type, accountBookId, includeHidden) => {
    try {
      set({ isLoading: true, error: null });

      const params: Record<string, string> = {};
      if (type) params.type = type;
      if (accountBookId) params.accountBookId = accountBookId;
      if (includeHidden) params.includeHidden = 'true';

      console.log('CategoryStore.fetchCategories 参数:', {
        type,
        accountBookId,
        includeHidden,
        params,
      });

      const response = await apiClient.get('/categories', { params });

      // 处理不同的响应格式
      if (response && typeof response === 'object') {
        // 如果响应是对象且有data字段，且data是数组
        if ('data' in response && Array.isArray(response.data)) {
          set({
            categories: response.data,
            isLoading: false,
          });
          return;
        }
      }

      // 如果响应本身是数组
      if (Array.isArray(response)) {
        set({
          categories: response,
          isLoading: false,
        });
        return;
      }

      // 默认设置为空数组
      set({
        categories: [],
        isLoading: false,
      });
    } catch (error) {
      console.error('获取分类列表失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取分类列表失败',
      });
      toast.error('获取分类列表失败');
    }
  },

  // 获取单个分类
  getCategory: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.get(`/categories/${id}`);

      set({ isLoading: false });

      return response as Category;
    } catch (error) {
      console.error(`获取分类 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `获取分类 ${id} 失败`,
      });
      toast.error(`获取分类详情失败`);
      return null;
    }
  },

  // 创建分类
  createCategory: async (data) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.post('/categories', data);

      // 清除缓存
      const { categoryCacheService } = await import('../services/category-cache.service');
      const { useAuthStore } = await import('./auth-store');
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        categoryCacheService.clearAllUserCache(userId);
        console.log('创建分类后清除缓存');
      }

      // 重新获取分类列表
      await get().fetchCategories();

      set({ isLoading: false });

      toast.success('分类创建成功');
      return true;
    } catch (error) {
      console.error('创建分类失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '创建分类失败',
      });
      toast.error('创建分类失败');
      return false;
    }
  },

  // 更新分类
  updateCategory: async (id, data) => {
    try {
      set({ isLoading: true, error: null });

      // 如果是隐藏/显示分类，使用用户分类配置API
      if ('isHidden' in data && Object.keys(data).length === 1) {
        await apiClient.put(`/user-category-configs/${id}`, {
          isHidden: data.isHidden,
        });
      } else {
        // 其他属性更新使用分类API
        const updateData = { ...data };
        delete updateData.isHidden; // 移除isHidden，因为分类API不处理这个字段

        if (Object.keys(updateData).length > 0) {
          await apiClient.put(`/categories/${id}`, updateData);
        }

        // 如果同时有isHidden更新，单独处理
        if ('isHidden' in data) {
          await apiClient.put(`/user-category-configs/${id}`, {
            isHidden: data.isHidden,
          });
        }
      }

      // 清除缓存
      const { categoryCacheService } = await import('../services/category-cache.service');
      const { useAuthStore } = await import('./auth-store');
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        categoryCacheService.clearAllUserCache(userId);
        console.log('更新分类后清除缓存');
      }

      // 重新获取分类列表
      await get().fetchCategories();

      set({ isLoading: false });

      toast.success('分类更新成功');
      return true;
    } catch (error) {
      console.error(`更新分类 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `更新分类 ${id} 失败`,
      });
      toast.error('更新分类失败');
      return false;
    }
  },

  // 删除分类
  deleteCategory: async (id) => {
    try {
      set({ isLoading: true, error: null });

      await apiClient.delete(`/categories/${id}`);

      // 清除缓存
      const { categoryCacheService } = await import('../services/category-cache.service');
      const { useAuthStore } = await import('./auth-store');
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        categoryCacheService.clearAllUserCache(userId);
        console.log('删除分类后清除缓存');
      }

      // 重新获取分类列表
      await get().fetchCategories();

      set({ isLoading: false });

      toast.success('分类删除成功');
      return true;
    } catch (error) {
      console.error(`删除分类 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `删除分类 ${id} 失败`,
      });
      toast.error('删除分类失败');
      return false;
    }
  },

  // 更新分类排序
  updateCategoryOrder: async (categoryIds) => {
    try {
      set({ isLoading: true, error: null });

      // 获取当前分类列表以确定类型
      const { categories } = get();
      if (categoryIds.length === 0) {
        throw new Error('分类ID列表不能为空');
      }

      // 从第一个分类ID获取类型
      const firstCategory = categories.find((cat) => cat.id === categoryIds[0]);
      if (!firstCategory) {
        throw new Error('找不到对应的分类');
      }

      const type = firstCategory.type;
      console.log('更新分类排序:', { categoryIds, type });

      await apiClient.put('/categories/order', { categoryIds, type });

      // 清除缓存
      const { categoryCacheService } = await import('../services/category-cache.service');
      const { useAuthStore } = await import('./auth-store');
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        categoryCacheService.clearAllUserCache(userId);
        console.log('分类排序更新后清除缓存');
      }

      // 重新获取分类列表
      await get().fetchCategories();

      set({ isLoading: false });

      return true;
    } catch (error) {
      console.error('更新分类排序失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '更新分类排序失败',
      });
      toast.error('更新分类排序失败');
      return false;
    }
  },
}));
