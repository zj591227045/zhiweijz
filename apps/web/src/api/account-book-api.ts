import { apiClient } from '@/lib/api-client';

export interface AccountBookResponse {
  id: string;
  name: string;
  description?: string;
  userId: string;
  type: 'PERSONAL' | 'FAMILY';
  familyId?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  transactionCount: number;
  categoryCount: number;
  budgetCount: number;
}

export interface CreateAccountBookRequest {
  name: string;
  description?: string;
  isDefault?: boolean;
}

/**
 * 账本API服务
 */
export class AccountBookApiService {
  /**
   * 获取账本列表
   */
  static async getAccountBooks(): Promise<AccountBookResponse[]> {
    try {
      const response = await apiClient.get('/account-books');
      
      // 处理不同的响应格式
      if (response && typeof response === 'object') {
        // 如果响应是对象且有data字段，且data是数组
        if ('data' in response && Array.isArray(response.data)) {
          return response.data;
        }
      }

      // 如果响应本身是数组
      if (Array.isArray(response)) {
        return response;
      }

      // 默认返回空数组
      return [];
    } catch (error: any) {
      console.error('获取账本列表失败:', error);
      throw new Error(error.response?.data?.message || '获取账本列表失败');
    }
  }

  /**
   * 获取默认账本
   */
  static async getDefaultAccountBook(): Promise<AccountBookResponse | null> {
    try {
      const response = await apiClient.get('/account-books/default');
      return response;
    } catch (error: any) {
      console.error('获取默认账本失败:', error);
      // 如果是404错误，返回null而不是抛出错误
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || '获取默认账本失败');
    }
  }

  /**
   * 获取账本详情
   */
  static async getAccountBookById(id: string): Promise<AccountBookResponse> {
    try {
      const response = await apiClient.get(`/account-books/${id}`);
      return response;
    } catch (error: any) {
      console.error('获取账本详情失败:', error);
      throw new Error(error.response?.data?.message || '获取账本详情失败');
    }
  }

  /**
   * 创建账本
   */
  static async createAccountBook(data: CreateAccountBookRequest): Promise<AccountBookResponse> {
    try {
      const response = await apiClient.post('/account-books', data);
      return response;
    } catch (error: any) {
      console.error('创建账本失败:', error);
      throw new Error(error.response?.data?.message || '创建账本失败');
    }
  }

  /**
   * 更新账本
   */
  static async updateAccountBook(id: string, data: Partial<CreateAccountBookRequest>): Promise<AccountBookResponse> {
    try {
      const response = await apiClient.put(`/account-books/${id}`, data);
      return response;
    } catch (error: any) {
      console.error('更新账本失败:', error);
      throw new Error(error.response?.data?.message || '更新账本失败');
    }
  }

  /**
   * 删除账本
   */
  static async deleteAccountBook(id: string): Promise<void> {
    try {
      await apiClient.delete(`/account-books/${id}`);
    } catch (error: any) {
      console.error('删除账本失败:', error);
      throw new Error(error.response?.data?.message || '删除账本失败');
    }
  }

  /**
   * 设置默认账本
   */
  static async setDefaultAccountBook(id: string): Promise<AccountBookResponse> {
    try {
      const response = await apiClient.post(`/account-books/${id}/set-default`);
      return response;
    } catch (error: any) {
      console.error('设置默认账本失败:', error);
      throw new Error(error.response?.data?.message || '设置默认账本失败');
    }
  }

  /**
   * 创建家庭账本
   */
  static async createFamilyAccountBook(familyId: string, data: CreateAccountBookRequest): Promise<AccountBookResponse> {
    try {
      const response = await apiClient.post(`/account-books/family/${familyId}`, data);
      return response;
    } catch (error: any) {
      console.error('创建家庭账本失败:', error);
      throw new Error(error.response?.data?.message || '创建家庭账本失败');
    }
  }
}
