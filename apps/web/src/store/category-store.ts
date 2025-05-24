'use client';

import { create } from 'zustand';
import { apiClient } from '../api/api-client';
import { toast } from 'sonner';
import { Category, TransactionType } from '@/types';

// 分类状态类型
interface CategoryState {
  // 数据状态
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  fetchCategories: (type?: TransactionType, accountBookId?: string) => Promise<void>;
  getCategory: (id: string) => Promise<Category | null>;
  createCategory: (data: {
    name: string;
    type: TransactionType;
    icon?: string;
    color?: string;
    accountBookId: string;
  }) => Promise<boolean>;
  updateCategory: (id: string, data: {
    name?: string;
    icon?: string;
    color?: string;
    isHidden?: boolean;
  }) => Promise<boolean>;
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
  fetchCategories: async (type, accountBookId) => {
    try {
      set({ isLoading: true, error: null });
      
      const params: Record<string, string> = {};
      if (type) params.type = type;
      if (accountBookId) params.accountBookId = accountBookId;
      
      const response = await apiClient.get('/categories', { params });
      
      // 处理不同的响应格式
      if (response && typeof response === 'object') {
        // 如果响应是对象且有data字段，且data是数组
        if ('data' in response && Array.isArray(response.data)) {
          set({
            categories: response.data,
            isLoading: false
          });
          return;
        }
      }
      
      // 如果响应本身是数组
      if (Array.isArray(response)) {
        set({
          categories: response,
          isLoading: false
        });
        return;
      }
      
      // 默认设置为空数组
      set({
        categories: [],
        isLoading: false
      });
    } catch (error) {
      console.error('获取分类列表失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取分类列表失败'
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
        error: error instanceof Error ? error.message : `获取分类 ${id} 失败`
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
      
      set({ isLoading: false });
      
      toast.success('分类创建成功');
      return true;
    } catch (error) {
      console.error('创建分类失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '创建分类失败'
      });
      toast.error('创建分类失败');
      return false;
    }
  },
  
  // 更新分类
  updateCategory: async (id, data) => {
    try {
      set({ isLoading: true, error: null });
      
      await apiClient.put(`/categories/${id}`, data);
      
      set({ isLoading: false });
      
      toast.success('分类更新成功');
      return true;
    } catch (error) {
      console.error(`更新分类 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `更新分类 ${id} 失败`
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
      
      set({ isLoading: false });
      
      toast.success('分类删除成功');
      return true;
    } catch (error) {
      console.error(`删除分类 ${id} 失败:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `删除分类 ${id} 失败`
      });
      toast.error('删除分类失败');
      return false;
    }
  },
  
  // 更新分类排序
  updateCategoryOrder: async (categoryIds) => {
    try {
      set({ isLoading: true, error: null });
      
      await apiClient.put('/categories/order', { categoryIds });
      
      set({ isLoading: false });
      
      return true;
    } catch (error) {
      console.error('更新分类排序失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '更新分类排序失败'
      });
      toast.error('更新分类排序失败');
      return false;
    }
  }
}));
