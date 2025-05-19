import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Category as CategoryType } from '@/types';

// 分类类型
export type CategoryType = 'EXPENSE' | 'INCOME';

// 视图模式
export type ViewMode = 'grid' | 'list';

// 分类项
export interface Category extends Omit<CategoryType, 'type'> {
  type: CategoryType;
  order?: number;
}

// 分类列表状态
interface CategoryListState {
  // 数据状态
  categories: Category[];
  selectedType: CategoryType;
  viewMode: ViewMode;

  // UI状态
  isLoading: boolean;
  isDeleting: boolean;
  isSorting: boolean;
  error: string | null;

  // 操作方法
  setSelectedType: (type: CategoryType) => void;
  setViewMode: (mode: ViewMode) => void;
  fetchCategories: () => Promise<void>;
  updateCategoryOrder: (categoryIds: string[]) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
}

// 创建分类列表状态仓库
export const useCategoryListStore = create<CategoryListState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      categories: [],
      selectedType: 'EXPENSE',
      viewMode: 'grid',
      isLoading: false,
      isDeleting: false,
      isSorting: false,
      error: null,

      // 设置选中的分类类型
      setSelectedType: (type) => {
        set({ selectedType: type });
        // 切换类型后重新获取分类列表
        get().fetchCategories();
      },

      // 设置视图模式
      setViewMode: (mode) => {
        set({ viewMode: mode });
        // 保存用户偏好设置
        try {
          localStorage.setItem('categoryViewMode', mode);
        } catch (error) {
          console.error('保存视图模式失败:', error);
        }
      },

      // 获取分类列表
      fetchCategories: async () => {
        const { selectedType } = get();

        try {
          set({ isLoading: true, error: null });

          // 发送API请求
          const response = await apiClient.get(`/categories?type=${selectedType}`);

          // 更新状态
          set({
            categories: response,
            isLoading: false
          });

          return response;
        } catch (error) {
          console.error('获取分类列表失败:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : '获取分类列表失败'
          });
          toast.error('获取分类列表失败');
          return [];
        }
      },

      // 更新分类排序
      updateCategoryOrder: async (categoryIds) => {
        try {
          const { selectedType } = get();
          set({ isSorting: true, error: null });

          // 发送API请求，包含分类类型
          await apiClient.put('/categories/order', {
            categoryIds,
            type: selectedType
          });

          // 重新获取分类列表以确保顺序正确
          await get().fetchCategories();

          set({ isSorting: false });
          toast.success('分类排序已更新');
          return true;
        } catch (error) {
          console.error('更新分类排序失败:', error);
          set({
            isSorting: false,
            error: error instanceof Error ? error.message : '更新分类排序失败'
          });
          toast.error('更新分类排序失败');
          return false;
        }
      },

      // 删除分类
      deleteCategory: async (id) => {
        try {
          set({ isDeleting: true, error: null });

          // 发送API请求
          await apiClient.delete(`/categories/${id}`);

          // 更新本地状态
          set(state => ({
            categories: state.categories.filter(category => category.id !== id),
            isDeleting: false
          }));

          toast.success('分类已删除');
          return true;
        } catch (error) {
          console.error('删除分类失败:', error);
          set({
            isDeleting: false,
            error: error instanceof Error ? error.message : '删除分类失败'
          });
          toast.error('删除分类失败');
          return false;
        }
      }
    })
  )
);
