import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AccountBook } from "@/types";

// 根据ID获取账本信息
export function useAccountBook(id: string | null | undefined) {
  return useQuery({
    queryKey: ["account-book", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const response = await apiClient.get<AccountBook>(`/account-books/${id}`);
        return response;
      } catch (error) {
        console.error("获取账本信息失败:", error);
        return null;
      }
    },
    enabled: !!id,
  });
}

// 根据ID获取预算信息
export function useBudget(id: string | null | undefined) {
  return useQuery({
    queryKey: ["budget", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const response = await apiClient.get<any>(`/budgets/${id}`);
        return response;
      } catch (error) {
        console.error("获取预算信息失败:", error);
        return null;
      }
    },
    enabled: !!id,
  });
}
