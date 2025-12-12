/**
 * 预算相关的React Query hooks
 * 统一管理所有预算数据的获取、缓存和更新
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '@/lib/api-services';

// ==================== Query Keys ====================
export const budgetKeys = {
  all: ['budgets'] as const,
  active: (accountBookId: string) => [...budgetKeys.all, 'active', accountBookId] as const,
  byDate: (date: string, accountBookId: string) => 
    [...budgetKeys.all, 'by-date', date, accountBookId] as const,
};

// ==================== 类型定义 ====================
export interface BudgetDisplay {
  id: string;
  name: string;
  amount: number;
  spent: number;
  rolloverAmount?: number;
  budgetType?: 'PERSONAL' | 'GENERAL';
  familyMemberName?: string;
  familyMemberId?: string;
  userId?: string;
  userName?: string;
  startDate?: string;
  endDate?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  period?: string;
}

// ==================== API 函数 ====================
async function fetchActiveBudgets(accountBookId: string): Promise<BudgetDisplay[]> {
  const response = await budgetService.getActiveBudgets(accountBookId);
  if (!Array.isArray(response)) {
    console.warn('预算API响应格式不正确:', response);
    return [];
  }
  return response.map((budget: any) => ({
    id: budget.id,
    name: budget.name || budget.category?.name || '未知分类',
    amount: budget.amount,
    spent: budget.spent || 0,
    rolloverAmount: budget.rolloverAmount || 0,
    budgetType: budget.budgetType || 'PERSONAL',
    familyMemberName: budget.familyMemberName || budget.userName,
    familyMemberId: budget.familyMemberId,
    userId: budget.userId,
    userName: budget.userName,
    startDate: budget.startDate,
    endDate: budget.endDate,
    category: budget.category,
    period: budget.period,
  }));
}

async function fetchBudgetsByDate(
  date: string,
  accountBookId: string
): Promise<BudgetDisplay[]> {
  const response = await budgetService.getBudgetsByDate(date, accountBookId);
  if (!Array.isArray(response)) {
    console.warn('预算API响应格式不正确:', response);
    return [];
  }
  return response.map((budget: any) => ({
    id: budget.id,
    name: budget.name || budget.category?.name || '未知分类',
    amount: budget.amount,
    spent: budget.spent || 0,
    rolloverAmount: budget.rolloverAmount || 0,
    budgetType: budget.budgetType || 'PERSONAL',
    familyMemberName: budget.familyMemberName || budget.userName,
    familyMemberId: budget.familyMemberId,
    userId: budget.userId,
    userName: budget.userName,
    startDate: budget.startDate,
    endDate: budget.endDate,
    category: budget.category,
    period: budget.period,
  }));
}

// ==================== Hooks ====================

/**
 * 获取活跃预算列表
 * @param accountBookId 账本ID
 * @param enabled 是否启用查询
 */
export function useActiveBudgets(accountBookId: string | null, enabled = true) {
  return useQuery({
    queryKey: budgetKeys.active(accountBookId || ''),
    queryFn: () => fetchActiveBudgets(accountBookId!),
    enabled: enabled && !!accountBookId,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    gcTime: 10 * 60 * 1000, // 10分钟后清除缓存
  });
}

/**
 * 根据日期获取预算列表
 * @param date 日期 (YYYY-MM-DD)
 * @param accountBookId 账本ID
 * @param enabled 是否启用查询
 */
export function useBudgetsByDate(
  date: string | null,
  accountBookId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: budgetKeys.byDate(date || '', accountBookId || ''),
    queryFn: () => fetchBudgetsByDate(date!, accountBookId!),
    enabled: enabled && !!date && !!accountBookId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 预加载预算数据
 * 用于在用户可能需要之前提前加载数据
 */
export function usePrefetchBudgets() {
  const queryClient = useQueryClient();

  return {
    prefetchActive: (accountBookId: string) => {
      return queryClient.prefetchQuery({
        queryKey: budgetKeys.active(accountBookId),
        queryFn: () => fetchActiveBudgets(accountBookId),
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchByDate: (date: string, accountBookId: string) => {
      return queryClient.prefetchQuery({
        queryKey: budgetKeys.byDate(date, accountBookId),
        queryFn: () => fetchBudgetsByDate(date, accountBookId),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
}
