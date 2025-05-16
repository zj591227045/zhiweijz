import { apiClient } from "@/lib/api";
import { Category, Transaction, AccountBook, Family, FamilyMember } from "@/types";

// 获取分类列表
export async function getCategories(type?: "EXPENSE" | "INCOME", familyId?: string) {
  try {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (familyId) params.familyId = familyId;

    const response = await apiClient.get<Category[] | { data: Category[] }>("/categories", { params });

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
    // 出错时返回空数组而不是undefined
    return [];
  }
}

// 获取账本列表
export async function getAccountBooks() {
  try {
    const response = await apiClient.get<{
      total: number;
      page: number;
      limit: number;
      data: AccountBook[];
    }>("/account-books");

    // 处理分页响应格式，返回data数组
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }

    // 如果响应本身是数组（兼容旧格式）
    if (Array.isArray(response)) {
      return response;
    }

    // 默认返回空数组
    return [];
  } catch (error) {
    console.error("获取账本列表失败:", error);
    // 出错时返回空数组而不是undefined
    return [];
  }
}

// 获取默认账本
export async function getDefaultAccountBook() {
  try {
    const response = await apiClient.get<AccountBook>("/account-books/default");
    return response;
  } catch (error) {
    console.error("获取默认账本失败:", error);
    return null;
  }
}

// 获取家庭列表
export async function getFamilies() {
  try {
    const response = await apiClient.get<Family[]>("/families");
    // 确保返回一个数组，即使是空数组
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error("获取家庭列表失败:", error);
    // 出错时返回空数组而不是undefined
    return [];
  }
}

// 获取家庭成员列表
export async function getFamilyMembers(familyId: string) {
  try {
    const response = await apiClient.get<{members: FamilyMember[]}>(`/families/${familyId}`);
    // 确保返回一个数组，即使是空数组
    return Array.isArray(response.members) ? response.members : [];
  } catch (error) {
    console.error("获取家庭成员列表失败:", error);
    // 出错时返回空数组而不是undefined
    return [];
  }
}

// 创建交易记录
export async function createTransaction(data: {
  amount: number;
  type: "EXPENSE" | "INCOME";
  categoryId: string;
  description?: string;
  date: string; // ISO格式日期时间
  accountBookId: string;
  familyId?: string;
  familyMemberId?: string;
}) {
  try {
    const response = await apiClient.post<Transaction | { data: Transaction }>("/transactions", data);

    // 处理可能的包装响应格式
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }

    return response;
  } catch (error) {
    console.error("创建交易记录失败:", error);
    throw error;
  }
}
