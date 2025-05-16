import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Transaction, TransactionType } from "@/types";
import { groupTransactionsByDate } from "@/lib/api-services";

// 分页响应接口
interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  data: T[];
}

// 交易查询参数接口
interface TransactionQueryParams {
  page?: number;
  limit?: number;
  type?: TransactionType;
  categoryIds?: string[];
  startDate?: string;
  endDate?: string;
  accountBookId?: string;
}

// 获取交易列表
export function useTransactions(params?: TransactionQueryParams) {
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: async () => {
      // 构建查询参数
      const queryParams: Record<string, any> = {
        page: params?.page || 1,
        limit: params?.limit || 20,
      };

      if (params?.type && params.type !== "ALL") {
        queryParams.type = params.type;
      }

      if (params?.categoryIds && params.categoryIds.length > 0) {
        queryParams.categoryIds = params.categoryIds.join(",");
      }

      if (params?.startDate) {
        queryParams.startDate = params.startDate;
      }

      if (params?.endDate) {
        queryParams.endDate = params.endDate;
      }

      if (params?.accountBookId) {
        queryParams.accountBookId = params.accountBookId;
      }

      // 发送请求
      const response = await apiClient.get<PaginatedResponse<Transaction>>("/transactions", {
        params: queryParams,
      });

      return response;
    },
  });
}

// 使用无限查询获取交易列表（用于无限滚动）
export function useInfiniteTransactions(params?: Omit<TransactionQueryParams, "page">) {
  const limit = params?.limit || 20;

  return useInfiniteQuery({
    queryKey: ["infinite-transactions", params],
    queryFn: async ({ pageParam = 1 }) => {
      // 构建查询参数
      const queryParams: Record<string, any> = {
        page: pageParam,
        limit,
      };

      if (params?.type && params.type !== "ALL") {
        queryParams.type = params.type;
      }

      if (params?.categoryIds && params.categoryIds.length > 0) {
        queryParams.categoryIds = params.categoryIds.join(",");
      }

      if (params?.startDate) {
        queryParams.startDate = params.startDate;
      }

      if (params?.endDate) {
        queryParams.endDate = params.endDate;
      }

      if (params?.accountBookId) {
        queryParams.accountBookId = params.accountBookId;
      }

      // 发送请求
      const response = await apiClient.get<PaginatedResponse<Transaction>>("/transactions", {
        params: queryParams,
      });

      return response;
    },
    getNextPageParam: (lastPage) => {
      // 如果当前页小于总页数，返回下一页的页码
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      if (lastPage.page < totalPages) {
        return lastPage.page + 1;
      }
      // 否则返回undefined，表示没有更多页
      return undefined;
    },
    initialPageParam: 1,
  });
}

// 统计数据接口
export interface TransactionStatistics {
  totalIncome: number;
  totalExpense: number;
  incomeByCategory?: any[];
  expenseByCategory?: any[];
  dailyStatistics?: any[];
}

// 获取交易统计
export function useTransactionStatistics(params?: {
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  accountBookId?: string;
}) {
  return useQuery({
    queryKey: ["transaction-statistics", params],
    queryFn: async () => {
      try {
        // 构建查询参数
        const queryParams: Record<string, any> = {};

        if (params?.type) {
          queryParams.type = params.type;
        }

        if (params?.startDate) {
          queryParams.startDate = params.startDate;
        }

        if (params?.endDate) {
          queryParams.endDate = params.endDate;
        }

        if (params?.accountBookId) {
          queryParams.accountBookId = params.accountBookId;
        }

        // 发送请求
        const response = await apiClient.get<TransactionStatistics>("/statistics/overview", {
          params: queryParams,
        });

        return response;
      } catch (error) {
        console.error("获取交易统计数据失败:", error);
        // 返回默认数据，避免UI崩溃
        return {
          totalIncome: 0,
          totalExpense: 0,
          incomeByCategory: [],
          expenseByCategory: [],
          dailyStatistics: []
        } as TransactionStatistics;
      }
    },
    // 添加重试选项
    retry: 1,
    // 即使发生错误也不要抛出
    useErrorBoundary: false,
  });
}

// 将无限查询结果转换为按日期分组的交易记录
export function useGroupedTransactions(infiniteData: any) {
  if (!infiniteData || !infiniteData.pages) {
    return [];
  }

  // 将所有页面的数据合并为一个数组
  const allTransactions = infiniteData.pages.flatMap((page: any) => page.data || []);

  // 按日期分组
  return groupTransactionsByDate(allTransactions);
}
