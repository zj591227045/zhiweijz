/**
 * 账本数据管理hook - React Query版本
 * 
 * 替换原有的account-book-store，保持相同的接口
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccountBooks as useAccountBooksQuery, useFamilyAccountBooks, type AccountBook } from './queries/useAccountBookQueries';
import { createLogger } from '@/lib/logger';
import { setGlobalCurrentAccountBook } from '@/lib/account-book-global';

const accountBookLogger = createLogger('AccountBook');

/**
 * 账本管理hook
 * 
 * 使用React Query替代手动状态管理，提供相同的接口
 */
export function useAccountBooks() {
  const [currentAccountBook, setCurrentAccountBook] = useState<AccountBook | null>(null);
  
  const {
    data: accountBooks = [],
    isLoading,
    error: queryError,
    refetch: refetchAccountBooks,
  } = useAccountBooksQuery();

  // 转换错误格式以保持向后兼容
  const error = queryError ? 
    (queryError instanceof Error ? queryError.message : '获取账本列表失败') : 
    null;

  // 自动设置默认账本
  useEffect(() => {
    if (accountBooks.length > 0 && !currentAccountBook) {
      const defaultBook = accountBooks.find(book => book.isDefault) || accountBooks[0];
      if (defaultBook) {
        accountBookLogger.debug('自动设置默认账本', { name: defaultBook.name });
        setCurrentAccountBook(defaultBook);
      }
    }
  }, [accountBooks, currentAccountBook]);

  // 同步到全局状态
  useEffect(() => {
    setGlobalCurrentAccountBook(currentAccountBook);
  }, [currentAccountBook]);

  // 记录状态变化
  useEffect(() => {
    if (accountBooks.length > 0) {
      accountBookLogger.debug('账本列表已加载', {
        count: accountBooks.length,
        currentBook: currentAccountBook?.name,
      });
    }
  }, [accountBooks.length, currentAccountBook?.name]);

  if (error) {
    accountBookLogger.error('账本数据加载失败', error);
  }

  return {
    // 数据状态 - 与原account-book-store保持一致的接口
    accountBooks,
    currentAccountBook,
    isLoading,
    error,
    
    // 操作方法 - 保持与原store相同的方法签名
    fetchAccountBooks: async () => {
      accountBookLogger.info('手动刷新账本列表');
      await refetchAccountBooks();
    },
    
    fetchFamilyAccountBooks: async (familyId: string) => {
      accountBookLogger.info('获取家庭账本列表', { familyId });
      // 这里需要单独处理家庭账本，因为它是独立的查询
      // 实际使用时可以通过useFamilyAccountBooks hook
    },
    
    setCurrentAccountBook: (accountBook: AccountBook | string) => {
      if (typeof accountBook === 'string') {
        // 如果传入的是账本ID，从列表中查找对应的账本
        const foundBook = accountBooks.find(book => book.id === accountBook);
        if (foundBook) {
          accountBookLogger.debug('通过ID切换账本', { 
            id: accountBook, 
            name: foundBook.name 
          });
          setCurrentAccountBook(foundBook);
        } else {
          accountBookLogger.warn('未找到指定ID的账本', { id: accountBook });
          // 如果没找到，刷新账本列表
          refetchAccountBooks();
        }
      } else {
        // 如果传入的是账本对象，直接设置
        accountBookLogger.debug('切换账本', { name: accountBook.name });
        setCurrentAccountBook(accountBook);
      }
    },
  };
}

/**
 * 家庭账本管理hook
 */
export function useFamilyAccountBooksData(familyId: string | null) {
  const {
    data: familyAccountBooks = [],
    isLoading,
    error: queryError,
    refetch,
  } = useFamilyAccountBooks(familyId);

  const error = queryError ? 
    (queryError instanceof Error ? queryError.message : '获取家庭账本列表失败') : 
    null;

  return {
    familyAccountBooks,
    isLoading,
    error,
    refetch,
  };
}