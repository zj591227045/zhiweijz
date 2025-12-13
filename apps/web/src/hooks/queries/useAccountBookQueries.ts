/**
 * 账本相关的React Query hooks
 * 
 * 用于替换account-book-store中的手动fetch，消除重复请求
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { createLogger } from '@/lib/logger';

const accountBookLogger = createLogger('AccountBook');

// 账本接口定义
export interface AccountBook {
  id: string;
  name: string;
  description?: string;
  type: 'PERSONAL' | 'FAMILY';
  isDefault: boolean;
  userId: string;
  familyId?: string;
  createdAt: string;
  updatedAt: string;
}

// 查询键常量
export const ACCOUNT_BOOK_KEYS = {
  all: ['accountBooks'] as const,
  list: () => [...ACCOUNT_BOOK_KEYS.all, 'list'] as const,
  family: (familyId: string) => [...ACCOUNT_BOOK_KEYS.all, 'family', familyId] as const,
} as const;

/**
 * 获取账本列表
 */
export function useAccountBooks() {
  return useQuery({
    queryKey: ACCOUNT_BOOK_KEYS.list(),
    queryFn: async (): Promise<AccountBook[]> => {
      accountBookLogger.debug('获取账本列表');
      
      const response = await apiClient.get('/account-books');
      
      // 处理后端分页响应格式
      let accountBooks: AccountBook[] = [];
      
      if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          // 分页格式 {data: [...], total: number, ...}
          accountBooks = response.data;
          accountBookLogger.debug('使用分页格式，账本数量', { count: accountBooks.length });
        } else if (Array.isArray(response)) {
          // 直接数组格式（兼容旧格式）
          accountBooks = response;
          accountBookLogger.debug('使用数组格式，账本数量', { count: accountBooks.length });
        } else {
          accountBookLogger.warn('未知的响应格式', response);
        }
      } else {
        accountBookLogger.warn('响应数据不是对象', response);
      }

      accountBookLogger.debug('账本列表获取成功', { 
        count: accountBooks.length,
        defaultBook: accountBooks.find(book => book.isDefault)?.name 
      });
      
      return accountBooks;
    },
    staleTime: 5 * 60 * 1000, // 5分钟内认为数据是新鲜的
    gcTime: 10 * 60 * 1000,   // 10分钟后清理缓存
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 获取家庭账本列表
 */
export function useFamilyAccountBooks(familyId: string | null) {
  return useQuery({
    queryKey: ACCOUNT_BOOK_KEYS.family(familyId || ''),
    queryFn: async (): Promise<AccountBook[]> => {
      if (!familyId) throw new Error('家庭ID不能为空');
      
      accountBookLogger.debug('获取家庭账本列表', { familyId });
      
      const response = await apiClient.get(`/account-books/family/${familyId}`);
      
      // 处理后端响应格式
      let accountBooks: AccountBook[] = [];
      if (response?.data && Array.isArray(response.data)) {
        accountBooks = response.data;
      } else if (Array.isArray(response)) {
        accountBooks = response;
      }

      accountBookLogger.debug('家庭账本列表获取成功', { 
        familyId,
        count: accountBooks.length 
      });
      
      return accountBooks;
    },
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000, // 5分钟内认为数据是新鲜的
    gcTime: 10 * 60 * 1000,   // 10分钟后清理缓存
    retry: 2,
    retryDelay: 1000,
  });
}