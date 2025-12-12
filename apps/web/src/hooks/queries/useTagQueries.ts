/**
 * 标签相关的React Query hooks
 * 统一管理所有标签数据的获取、缓存和更新
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagApi } from '@/lib/api/tag-api';
import { TagResponseDto } from '@/lib/api/types/tag.types';

// ==================== Query Keys ====================
export const tagKeys = {
  all: ['tags'] as const,
  list: (accountBookId: string, filters?: any) => 
    [...tagKeys.all, 'list', accountBookId, filters] as const,
  suggestions: (accountBookId: string, params: any) => 
    [...tagKeys.all, 'suggestions', accountBookId, params] as const,
  transaction: (transactionId: string) => 
    [...tagKeys.all, 'transaction', transactionId] as const,
};

// ==================== API 函数 ====================
async function fetchTags(
  accountBookId: string,
  filters?: {
    isActive?: boolean;
    sortBy?: 'usage' | 'name' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  }
): Promise<TagResponseDto[]> {
  const response = await tagApi.getTags({
    accountBookId,
    ...filters,
  });
  if (!response.success) {
    throw new Error('获取标签列表失败');
  }
  return response.data.tags;
}

async function fetchTagSuggestions(
  params: {
    accountBookId: string;
    categoryId?: string;
    description?: string;
    limit?: number;
  }
): Promise<Array<{ tag: TagResponseDto; confidence: number; reason: string }>> {
  const response = await tagApi.getTagSuggestions(params);
  if (!response.success) {
    throw new Error('获取标签建议失败');
  }
  return response.data;
}

async function fetchTransactionTags(transactionId: string): Promise<TagResponseDto[]> {
  const response = await tagApi.getTransactionTags(transactionId);
  if (!response.success) {
    throw new Error('获取交易标签失败');
  }
  return response.data;
}

// ==================== Hooks ====================

/**
 * 获取标签列表
 * @param accountBookId 账本ID
 * @param filters 过滤条件
 * @param enabled 是否启用查询
 */
export function useTags(
  accountBookId: string | null,
  filters?: {
    isActive?: boolean;
    sortBy?: 'usage' | 'name' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  },
  enabled = true
) {
  return useQuery({
    queryKey: tagKeys.list(accountBookId || '', filters),
    queryFn: () => fetchTags(accountBookId!, filters),
    enabled: enabled && !!accountBookId,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    gcTime: 10 * 60 * 1000, // 10分钟后清除缓存
  });
}

/**
 * 获取标签建议
 * @param accountBookId 账本ID
 * @param params 查询参数
 * @param enabled 是否启用查询
 */
export function useTagSuggestions(
  accountBookId: string | null,
  params: {
    categoryId?: string;
    description?: string;
    limit?: number;
  },
  enabled = true
) {
  return useQuery({
    queryKey: tagKeys.suggestions(accountBookId || '', params),
    queryFn: () => fetchTagSuggestions({ accountBookId: accountBookId!, ...params }),
    enabled: enabled && !!accountBookId && (!!params.categoryId || !!params.description),
    staleTime: 2 * 60 * 1000, // 标签建议2分钟过期
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * 获取交易的标签列表
 * @param transactionId 交易ID
 * @param enabled 是否启用查询
 */
export function useTransactionTags(
  transactionId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: tagKeys.transaction(transactionId || ''),
    queryFn: () => fetchTransactionTags(transactionId!),
    enabled: enabled && !!transactionId && transactionId !== 'placeholder',
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 添加交易标签 mutation
 */
export function useAddTransactionTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, tagIds }: { transactionId: string; tagIds: string[] }) => {
      const response = await tagApi.addTransactionTags(transactionId, { tagIds });
      if (!response.success) {
        throw new Error('添加标签失败');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      // 使交易标签查询失效
      queryClient.invalidateQueries({ 
        queryKey: tagKeys.transaction(variables.transactionId) 
      });
    },
  });
}

/**
 * 移除交易标签 mutation
 */
export function useRemoveTransactionTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, tagId }: { transactionId: string; tagId: string }) => {
      const response = await tagApi.removeTransactionTag(transactionId, tagId);
      if (!response.success) {
        throw new Error('移除标签失败');
      }
      return response;
    },
    onSuccess: (_, variables) => {
      // 使交易标签查询失效
      queryClient.invalidateQueries({ 
        queryKey: tagKeys.transaction(variables.transactionId) 
      });
    },
  });
}

/**
 * 批量更新交易标签
 * 智能计算需要添加和移除的标签，减少API调用
 */
export function useUpdateTransactionTags() {
  const addTags = useAddTransactionTags();
  const removeTag = useRemoveTransactionTag();

  return {
    mutateAsync: async (
      transactionId: string,
      newTagIds: string[],
      currentTagIds: string[]
    ): Promise<void> => {
      // 计算需要添加和移除的标签
      const tagsToAdd = newTagIds.filter(id => !currentTagIds.includes(id));
      const tagsToRemove = currentTagIds.filter(id => !newTagIds.includes(id));

      // 并行执行添加和移除操作
      const promises: Promise<any>[] = [];

      if (tagsToAdd.length > 0) {
        promises.push(addTags.mutateAsync({ transactionId, tagIds: tagsToAdd }));
      }

      for (const tagId of tagsToRemove) {
        promises.push(removeTag.mutateAsync({ transactionId, tagId }));
      }

      await Promise.all(promises);
    },
    isLoading: addTags.isPending || removeTag.isPending,
  };
}
