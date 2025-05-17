import { apiClient } from '@/lib/api';
import { Category } from '@/store/budget-form-store';

// 分类查询参数类型
interface CategoryQueryParams {
  type?: 'EXPENSE' | 'INCOME';
  accountBookId?: string;
  familyId?: string;
}

// 分类服务
export const categoryService = {
  /**
   * 获取分类列表
   */
  async getCategories(params: CategoryQueryParams = {}): Promise<Category[]> {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();

      if (params.type) {
        queryParams.append('type', params.type);
      }

      if (params.accountBookId) {
        queryParams.append('accountBookId', params.accountBookId);
      }

      if (params.familyId) {
        queryParams.append('familyId', params.familyId);
      }

      // 发送请求
      const response = await apiClient.get<Category[]>(`/categories?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('获取分类列表失败:', error);
      return [];
    }
  }
};
