import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Transaction, TransactionType } from "@/types";
import { toast } from "sonner";

// 获取交易详情
export function useTransactionDetail(id: string) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: async () => {
      try {
        const response = await apiClient.get<Transaction>(`/transactions/${id}`);
        return response;
      } catch (error) {
        console.error("获取交易详情失败:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

// 删除交易
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      // 删除成功后刷新交易列表和统计数据
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["infinite-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-statistics"] });
      toast.success("交易已删除");
    },
    onError: (error) => {
      console.error("删除交易失败:", error);
      toast.error("删除交易失败，请重试");
    }
  });
}

// 更新交易备注
export function useUpdateTransactionNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await apiClient.patch(`/transactions/${id}`, { notes });
    },
    onSuccess: (_, variables) => {
      // 更新成功后刷新交易详情
      queryClient.invalidateQueries({ queryKey: ["transaction", variables.id] });
      toast.success("备注已更新");
    },
    onError: (error) => {
      console.error("更新备注失败:", error);
      toast.error("更新备注失败，请重试");
    }
  });
}

// 更新交易
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: {
        amount: number;
        type: TransactionType;
        categoryId: string;
        description?: string;
        date: string; // ISO格式日期时间
        accountBookId: string;
        familyId?: string;
        familyMemberId?: string;
        notes?: string;
      }
    }) => {
      await apiClient.put(`/transactions/${id}`, data);
    },
    onSuccess: (_, variables) => {
      // 更新成功后刷新交易详情和相关数据
      queryClient.invalidateQueries({ queryKey: ["transaction", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["infinite-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-statistics"] });
      toast.success("交易已更新");
    },
    onError: (error) => {
      console.error("更新交易失败:", error);
      toast.error("更新交易失败，请重试");
    }
  });
}
