import { apiClient } from '@/lib/api';
import { Category } from '@/types';

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
      console.log('发送分类请求:', `/categories?${queryParams.toString()}`);
      const response = await apiClient.get<Category[]>(`/categories?${queryParams.toString()}`);
      console.log('分类API响应:', response);

      // 检查响应格式
      if (Array.isArray(response)) {
        return response;
      } else if (response && typeof response === 'object') {
        // 处理可能的分页响应格式
        if ('data' in response && Array.isArray(response.data)) {
          return response.data;
        }
        // 如果响应本身是对象但不是数组，可能是单个分类
        return [response as any];
      }

      // 默认返回空数组
      console.warn('分类API返回了意外的格式:', response);
      return [];
    } catch (error) {
      console.error('获取分类列表失败:', error);
      return [];
    }
  }
};
