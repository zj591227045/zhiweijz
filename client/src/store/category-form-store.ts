import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { CategoryType } from './category-list-store';

// 分类表单状态
interface CategoryFormState {
  // 表单模式
  mode: 'create' | 'edit';
  categoryId: string | null;

  // 表单数据
  name: string;
  type: CategoryType;
  icon: string;
  color: string;

  // 原始数据（用于编辑模式）
  originalCategory: {
    id: string;
    name: string;
    type: CategoryType;
    icon: string;
    color: string;
    isDefault: boolean;
  } | null;

  // UI状态
  isLoading: boolean;
  isSubmitting: boolean;
  errors: {
    name?: string;
    icon?: string;
  };

  // 操作方法
  setMode: (mode: 'create' | 'edit') => void;
  setCategoryId: (id: string | null) => void;
  setName: (name: string) => void;
  setType: (type: CategoryType) => void;
  setIcon: (icon: string) => void;
  setColor: (color: string) => void;
  resetForm: () => void;
  validateForm: () => boolean;
  fetchCategory: (id: string) => Promise<void>;
  submitForm: () => Promise<boolean>;
}

// 创建分类表单状态仓库
export const useCategoryFormStore = create<CategoryFormState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      mode: 'create',
      categoryId: null,
      name: '',
      type: 'EXPENSE',
      icon: 'tag',
      color: '#3b82f6', // 默认蓝色
      originalCategory: null,
      isLoading: false,
      isSubmitting: false,
      errors: {},

      // 设置模式
      setMode: (mode) => set({ mode }),

      // 设置分类ID
      setCategoryId: (id) => set({ categoryId: id }),

      // 设置名称
      setName: (name) => set({
        name,
        errors: { ...get().errors, name: undefined }
      }),

      // 设置类型
      setType: (type) => set({ type }),

      // 设置图标
      setIcon: (icon) => set({
        icon,
        errors: { ...get().errors, icon: undefined }
      }),

      // 设置颜色
      setColor: (color) => set({ color }),

      // 重置表单
      resetForm: () => {
        const { mode, originalCategory } = get();

        if (mode === 'edit' && originalCategory) {
          // 编辑模式：重置为原始数据
          set({
            name: originalCategory.name,
            type: originalCategory.type,
            icon: originalCategory.icon,
            color: originalCategory.color || '#3b82f6',
            errors: {}
          });
        } else {
          // 创建模式：重置为默认值
          set({
            name: '',
            type: 'EXPENSE',
            icon: 'tag',
            color: '#3b82f6',
            errors: {}
          });
        }
      },

      // 验证表单
      validateForm: () => {
        const { name, icon, mode, originalCategory } = get();
        const errors: {name?: string; icon?: string} = {};
        let isValid = true;

        // 验证名称（仅在创建模式或编辑非默认分类时验证）
        if (mode === 'create' || (mode === 'edit' && !originalCategory?.isDefault)) {
          if (!name.trim()) {
            errors.name = '请输入分类名称';
            isValid = false;
          } else if (name.length > 10) {
            errors.name = '分类名称不能超过10个字符';
            isValid = false;
          }
        }

        // 验证图标
        if (!icon) {
          errors.icon = '请选择分类图标';
          isValid = false;
        }

        set({ errors });
        return isValid;
      },

      // 获取分类详情
      fetchCategory: async (id) => {
        try {
          set({ isLoading: true, errors: {} });

          // 发送API请求
          const response = await apiClient.get(`/categories/${id}`);

          // 更新状态
          set({
            originalCategory: response,
            name: response.name,
            type: response.type,
            icon: response.icon || 'tag',
            color: response.color || '#3b82f6',
            isLoading: false
          });
        } catch (error) {
          console.error('获取分类详情失败:', error);
          set({
            isLoading: false,
            errors: { ...get().errors, general: '获取分类详情失败' }
          });
          toast.error('获取分类详情失败');
        }
      },

      // 提交表单
      submitForm: async () => {
        const { mode, categoryId, name, type, icon, color, validateForm, originalCategory } = get();

        // 验证表单
        if (!validateForm()) {
          return false;
        }

        try {
          set({ isSubmitting: true });

          // 准备请求数据
          let categoryData: any = {};

          if (mode === 'create' || (mode === 'edit' && !originalCategory?.isDefault)) {
            // 创建模式或编辑非默认分类：可以修改所有字段
            categoryData = {
              name: name.trim(),
              type,
              icon,
              color
            };
          } else {
            // 编辑默认分类：只能修改图标和颜色
            categoryData = {
              icon,
              color
            };
          }

          // 发送API请求
          if (mode === 'create') {
            // 创建分类
            await apiClient.post('/categories', categoryData);
            toast.success('分类创建成功');
          } else if (mode === 'edit' && categoryId) {
            // 更新分类
            await apiClient.put(`/categories/${categoryId}`, categoryData);
            toast.success('分类更新成功');
          }

          set({ isSubmitting: false });
          return true;
        } catch (error) {
          console.error('提交分类表单失败:', error);
          set({
            isSubmitting: false,
            errors: { ...get().errors, general: '提交失败，请重试' }
          });
          toast.error('提交失败，请重试');
          return false;
        }
      }
    })
  )
);
