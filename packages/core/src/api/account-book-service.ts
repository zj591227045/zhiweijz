import { AccountBook, CreateAccountBookData, UpdateAccountBookData } from "../models";

export interface AccountBookServiceOptions {
  apiClient: any;
  debug?: boolean;
}

export class AccountBookService {
  private apiClient: any;
  private debug: boolean;

  constructor(options: AccountBookServiceOptions) {
    this.apiClient = options.apiClient;
    this.debug = options.debug || false;
  }

  /**
   * 获取账本列表
   */
  async getAccountBooks(): Promise<AccountBook[]> {
    try {
      if (this.debug) {
        console.log('获取账本列表');
      }

      const response = await this.apiClient.get('/account-books') as any;

      // 处理不同的响应格式
      if (response && typeof response === 'object') {
        // 如果响应是对象且有data字段，且data是数组
        if ('data' in response && Array.isArray(response.data)) {
          if (this.debug) {
            console.log('账本数据格式为分页格式，提取data字段');
          }
          return response.data;
        }
      }

      // 如果响应本身是数组
      if (Array.isArray(response)) {
        if (this.debug) {
          console.log('账本数据格式为数组');
        }
        return response;
      }

      // 默认返回空数组
      return [];
    } catch (error) {
      console.error('获取账本列表失败:', error);
      return [];
    }
  }

  /**
   * 获取默认账本
   */
  async getDefaultAccountBook(): Promise<AccountBook | null> {
    try {
      if (this.debug) {
        console.log('获取默认账本');
      }
      const response = await this.apiClient.get('/account-books/default') as AccountBook;
      return response;
    } catch (error) {
      console.error('获取默认账本失败:', error);
      return null;
    }
  }

  /**
   * 获取单个账本
   */
  async getAccountBook(id: string): Promise<AccountBook | null> {
    try {
      if (this.debug) {
        console.log(`获取账本, ID: ${id}`);
      }
      const response = await this.apiClient.get(`/account-books/${id}`) as AccountBook;
      return response;
    } catch (error) {
      console.error(`获取账本 ${id} 失败:`, error);
      return null;
    }
  }

  /**
   * 创建账本
   */
  async createAccountBook(data: CreateAccountBookData): Promise<AccountBook | null> {
    try {
      if (this.debug) {
        console.log('创建账本, 数据:', data);
      }
      const response = await this.apiClient.post('/account-books', data) as AccountBook;
      return response;
    } catch (error) {
      console.error('创建账本失败:', error);
      throw error;
    }
  }

  /**
   * 更新账本
   */
  async updateAccountBook(id: string, data: UpdateAccountBookData): Promise<AccountBook | null> {
    try {
      if (this.debug) {
        console.log(`更新账本, ID: ${id}, 数据:`, data);
      }
      const response = await this.apiClient.put(`/account-books/${id}`, data) as AccountBook;
      return response;
    } catch (error) {
      console.error(`更新账本 ${id} 失败:`, error);
      throw error;
    }
  }

  /**
   * 删除账本
   */
  async deleteAccountBook(id: string): Promise<boolean> {
    try {
      if (this.debug) {
        console.log(`删除账本, ID: ${id}`);
      }
      await this.apiClient.delete(`/account-books/${id}`);
      return true;
    } catch (error) {
      console.error(`删除账本 ${id} 失败:`, error);
      throw error;
    }
  }

  /**
   * 设置默认账本
   */
  async setDefaultAccountBook(id: string): Promise<AccountBook | null> {
    try {
      if (this.debug) {
        console.log(`设置默认账本, ID: ${id}`);
      }
      const response = await this.apiClient.put(`/account-books/${id}/default`) as AccountBook;
      return response;
    } catch (error) {
      console.error(`设置默认账本 ${id} 失败:`, error);
      throw error;
    }
  }

  /**
   * 绑定AI服务
   */
  async bindAIService(accountBookId: string, userLLMSettingId: string): Promise<AccountBook | null> {
    try {
      if (this.debug) {
        console.log(`绑定AI服务, 账本ID: ${accountBookId}, AI服务ID: ${userLLMSettingId}`);
      }
      const response = await this.apiClient.put(`/account-books/${accountBookId}/ai-service`, {
        userLLMSettingId
      }) as AccountBook;
      return response;
    } catch (error) {
      console.error(`绑定AI服务失败, 账本ID: ${accountBookId}:`, error);
      throw error;
    }
  }

  /**
   * 解绑AI服务
   */
  async unbindAIService(accountBookId: string): Promise<AccountBook | null> {
    try {
      if (this.debug) {
        console.log(`解绑AI服务, 账本ID: ${accountBookId}`);
      }
      const response = await this.apiClient.delete(`/account-books/${accountBookId}/ai-service`) as AccountBook;
      return response;
    } catch (error) {
      console.error(`解绑AI服务失败, 账本ID: ${accountBookId}:`, error);
      throw error;
    }
  }
}
