import { Category, CreateCategoryData, TransactionType, UpdateCategoryData } from "../models";

export interface CategoryServiceOptions {
  apiClient: any;
  debug?: boolean;
}

export class CategoryService {
  private apiClient: any;
  private debug: boolean;

  constructor(options: CategoryServiceOptions) {
    this.apiClient = options.apiClient;
    this.debug = options.debug || false;
  }

  /**
   * 获取分类列表
   */
  async getCategories(params: {
    type?: TransactionType;
    accountBookId?: string;
    familyId?: string;
  } = {}): Promise<Category[]> {
    try {
      if (this.debug) {
        console.log('获取分类列表, 参数:', params);
      }

      // 发送请求
      const response = await this.apiClient.get('/categories', { params }) as any;

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
      if (this.debug) {
        console.warn('分类API返回了意外的格式:', response);
      }
      return [];
    } catch (error) {
      console.error('获取分类列表失败:', error);
      return [];
    }
  }

  /**
   * 获取单个分类
   */
  async getCategory(id: string): Promise<Category | null> {
    try {
      const response = await this.apiClient.get(`/categories/${id}`) as Category;
      return response;
    } catch (error) {
      console.error(`获取分类 ${id} 失败:`, error);
      return null;
    }
  }

  /**
   * 创建分类
   */
  async createCategory(data: CreateCategoryData): Promise<Category | null> {
    try {
      const response = await this.apiClient.post('/categories', data) as Category;
      return response;
    } catch (error) {
      console.error('创建分类失败:', error);
      throw error;
    }
  }

  /**
   * 更新分类
   */
  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category | null> {
    try {
      const response = await this.apiClient.put(`/categories/${id}`, data) as Category;
      return response;
    } catch (error) {
      console.error(`更新分类 ${id} 失败:`, error);
      throw error;
    }
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/categories/${id}`);
      return true;
    } catch (error) {
      console.error(`删除分类 ${id} 失败:`, error);
      throw error;
    }
  }
}
