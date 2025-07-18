import {
  AccountBook,
  Category,
  CreateTransactionData,
  Family,
  FamilyMember,
  Transaction,
  TransactionType,
  UpdateTransactionData
} from "../models";

export interface TransactionServiceOptions {
  apiClient: any;
}

export class TransactionService {
  private apiClient: any;

  constructor(options: TransactionServiceOptions) {
    this.apiClient = options.apiClient;
  }

  // 获取记账列表
  async getTransactions(params?: {
    accountBookId?: string;
    startDate?: string;
    endDate?: string;
    type?: TransactionType;
    categoryIds?: string[];
    page?: number;
    limit?: number;
  }) {
    try {
      const response = await this.apiClient.get("/transactions", { params }) as any;

      // 处理分页响应格式
      if (response && response.data && Array.isArray(response.data)) {
        return {
          total: response.total || 0,
          page: response.page || 1,
          limit: response.limit || 10,
          data: response.data
        };
      }

      // 如果响应本身是数组
      if (Array.isArray(response)) {
        return {
          total: response.length,
          page: 1,
          limit: response.length,
          data: response
        };
      }

      // 默认返回空数组
      return {
        total: 0,
        page: 1,
        limit: 10,
        data: []
      };
    } catch (error) {
      console.error("获取记账列表失败:", error);
      // 出错时返回空数组
      return {
        total: 0,
        page: 1,
        limit: 10,
        data: []
      };
    }
  }

  // 获取单个记账
  async getTransaction(id: string) {
    try {
      const response = await this.apiClient.get(`/transactions/${id}`) as Transaction;
      return response;
    } catch (error) {
      console.error(`获取记账 ${id} 失败:`, error);
      return null;
    }
  }

  // 创建记账
  async createTransaction(data: CreateTransactionData) {
    try {
      const response = await this.apiClient.post("/transactions", data) as Transaction;
      return response;
    } catch (error) {
      console.error("创建记账失败:", error);
      throw error;
    }
  }

  // 更新记账
  async updateTransaction(id: string, data: UpdateTransactionData) {
    try {
      const response = await this.apiClient.put(`/transactions/${id}`, data) as Transaction;
      return response;
    } catch (error) {
      console.error(`更新记账 ${id} 失败:`, error);
      throw error;
    }
  }

  // 删除记账
  async deleteTransaction(id: string) {
    try {
      await this.apiClient.delete(`/transactions/${id}`);
      return true;
    } catch (error) {
      console.error(`删除记账 ${id} 失败:`, error);
      throw error;
    }
  }

  // 获取分类列表
  async getCategories(type?: TransactionType, accountBookId?: string) {
    try {
      const params: Record<string, string> = {};
      if (type) params.type = type;
      if (accountBookId) params.accountBookId = accountBookId;

      const response = await this.apiClient.get("/categories", { params }) as any;

      // 处理可能的分页响应格式
      if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        return response.data;
      }

      // 如果响应本身是数组
      if (Array.isArray(response)) {
        return response;
      }

      // 默认返回空数组
      return [];
    } catch (error) {
      console.error("获取分类列表失败:", error);
      // 出错时返回空数组
      return [];
    }
  }

  // 获取账本列表
  async getAccountBooks() {
    try {
      const response = await this.apiClient.get("/account-books") as any;

      // 处理分页响应格式
      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }

      // 如果响应本身是数组
      if (Array.isArray(response)) {
        return response;
      }

      // 默认返回空数组
      return [];
    } catch (error) {
      console.error("获取账本列表失败:", error);
      // 出错时返回空数组
      return [];
    }
  }

  // 获取默认账本
  async getDefaultAccountBook() {
    try {
      const response = await this.apiClient.get("/account-books/default") as AccountBook;
      return response;
    } catch (error) {
      console.error("获取默认账本失败:", error);
      return null;
    }
  }

  // 获取家庭列表
  async getFamilies() {
    try {
      const response = await this.apiClient.get("/families") as Family[];
      // 确保返回一个数组，即使是空数组
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error("获取家庭列表失败:", error);
      // 出错时返回空数组
      return [];
    }
  }

  // 获取家庭成员列表
  async getFamilyMembers(familyId: string) {
    try {
      const response = await this.apiClient.get(`/families/${familyId}`) as {members: FamilyMember[]};
      // 确保返回一个数组，即使是空数组
      return Array.isArray(response.members) ? response.members : [];
    } catch (error) {
      console.error("获取家庭成员列表失败:", error);
      // 出错时返回空数组
      return [];
    }
  }
}
