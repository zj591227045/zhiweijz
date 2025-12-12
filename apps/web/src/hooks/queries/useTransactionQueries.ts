/**
 * 交易相关的React Query hooks
 * 统一管理所有交易数据的获取、缓存和更新
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { tagApi } from '@/lib/api/tag-api';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import { TransactionAttachment } from '@/components/transactions/transaction-attachment-upload';

// ==================== Query Keys ====================
// 统一管理所有查询键，避免重复和冲突
export const transactionKeys = {
  all: ['transactions'] as const,
  detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
  tags: (id: string) => [...transactionKeys.all, 'tags', id] as const,
  attachments: (id: string) => [...transactionKeys.all, 'attachments', id] as const,
  // 完整数据：包含交易详情、标签、附件
  full: (id: string) => [...transactionKeys.all, 'full', id] as const,
};

// ==================== 类型定义 ====================
interface TransactionDetail {
  id: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  categoryId: string;
  date: string;
  description?: string;
  budgetId?: string;
  isMultiBudget?: boolean;
  budgetAllocation?: any[];
  [key: string]: any;
}

interface FullTransactionData {
  transaction: TransactionDetail;
  tags: TagResponseDto[];
  attachments: TransactionAttachment[];
}

// ==================== API 函数 ====================
// 获取交易详情
async function fetchTransactionDetail(id: string): Promise<TransactionDetail> {
  const response = await apiClient.get(`/transactions/${id}`);
  if (!response.success) {
    throw new Error(response.message || '获取交易详情失败');
  }
  return response.data;
}

// 获取交易标签
async function fetchTransactionTags(id: string): Promise<TagResponseDto[]> {
  const response = await tagApi.getTransactionTags(id);
  if (!response.success) {
    throw new Error('获取交易标签失败');
  }
  return response.data;
}

// 获取交易附件
async function fetchTransactionAttachments(id: string): Promise<TransactionAttachment[]> {
  const response = await apiClient.get(`/transactions/${id}/attachments`);
  if (!response.success) {
    throw new Error('获取交易附件失败');
  }
  return response.data || [];
}

// 获取完整交易数据（并行请求）
async function fetchFullTransaction(id: string): Promise<FullTransactionData> {
  const [transaction, tags, attachments] = await Promise.all([
    fetchTransactionDetail(id),
    fetchTransactionTags(id),
    fetchTransactionAttachments(id),
  ]);

  return { transaction, tags, attachments };
}

// ==================== Hooks ====================

/**
 * 获取交易详情
 * @param id 交易ID
 * @param enabled 是否启用查询
 */
export function useTransactionDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: transactionKeys.detail(id || ''),
    queryFn: () => fetchTransactionDetail(id!),
    enabled: enabled && !!id && id !== 'placeholder',
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    gcTime: 10 * 60 * 1000, // 10分钟后清除缓存
  });
}

/**
 * 获取交易标签
 * @param id 交易ID
 * @param enabled 是否启用查询
 */
export function useTransactionTags(id: string | null, enabled = true) {
  return useQuery({
    queryKey: transactionKeys.tags(id || ''),
    queryFn: () => fetchTransactionTags(id!),
    enabled: enabled && !!id && id !== 'placeholder',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 获取交易附件
 * @param id 交易ID
 * @param enabled 是否启用查询
 */
export function useTransactionAttachments(id: string | null, enabled = true) {
  return useQuery({
    queryKey: transactionKeys.attachments(id || ''),
    queryFn: () => fetchTransactionAttachments(id!),
    enabled: enabled && !!id && id !== 'placeholder',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 获取完整交易数据（推荐使用）
 * 一次性并行获取交易详情、标签、附件，避免多次请求
 * 
 * @param id 交易ID
 * @param initialData 初始数据（可选，用于避免不必要的请求）
 * @param enabled 是否启用查询
 */
export function useFullTransaction(
  id: string | null,
  initialData?: Partial<FullTransactionData>,
  enabled = true
) {
  return useQuery({
    queryKey: transactionKeys.full(id || ''),
    queryFn: () => fetchFullTransaction(id!),
    enabled: enabled && !!id && id !== 'placeholder',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // 如果有初始数据，使用它避免首次请求
    initialData: initialData?.transaction ? (initialData as FullTransactionData) : undefined,
    // 如果提供了完整的初始数据，标记为已过期但不立即重新获取
    refetchOnMount: !initialData?.transaction,
  });
}

/**
 * 更新交易 mutation
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/transactions/${id}`, data);
      if (!response.success) {
        throw new Error(response.message || '更新交易失败');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      // 更新成功后，使相关查询失效
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: transactionKeys.full(variables.id) });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

/**
 * 删除交易 mutation
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/transactions/${id}`);
      if (!response.success) {
        throw new Error(response.message || '删除交易失败');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      // 删除成功后，移除相关缓存
      queryClient.removeQueries({ queryKey: transactionKeys.detail(id) });
      queryClient.removeQueries({ queryKey: transactionKeys.full(id) });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
