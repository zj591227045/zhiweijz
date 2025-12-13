/**
 * 账本全局状态访问器
 * 
 * 为非React上下文提供账本状态访问
 */

import { AccountBook } from '@/types';

// 全局状态存储
let globalCurrentAccountBook: AccountBook | null = null;

/**
 * 设置当前账本（由React组件调用）
 */
export function setGlobalCurrentAccountBook(accountBook: AccountBook | null) {
  globalCurrentAccountBook = accountBook;
}

/**
 * 获取当前账本（供非React上下文使用）
 */
export function getCurrentAccountBook(): AccountBook | null {
  return globalCurrentAccountBook;
}

/**
 * 获取当前账本ID（供非React上下文使用）
 */
export function getCurrentAccountBookId(): string | null {
  return globalCurrentAccountBook?.id || null;
}