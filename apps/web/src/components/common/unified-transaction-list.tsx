'use client';

import { memo } from 'react';
import { formatCurrency, getCategoryIconClass } from '../../lib/utils';
import { TagDisplay } from '../tags/tag-display';
import { TagResponseDto } from '@/lib/api/types/tag.types';

// 交易类型枚举
export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  categoryIcon?: string;
  description?: string;
  date: string;
  title?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    icon: string;
  };
  tags?: TagResponseDto[];
}

interface GroupedTransactions {
  date: string;
  transactions: Transaction[];
}

interface UnifiedTransactionListProps {
  groupedTransactions: GroupedTransactions[];
  onTransactionClick?: (transactionId: string) => void;
  showDateHeaders?: boolean;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  error?: string | null;
  // 多选功能相关
  isMultiSelectMode?: boolean;
  selectedTransactions?: Set<string>;
  onTransactionSelect?: (transactionId: string) => void;
  // 加载更多功能
  isLoadingMore?: boolean;
  hasMore?: boolean;
  totalCount?: number;
}

// 使用React.memo优化渲染性能
export const UnifiedTransactionList = memo(
  function UnifiedTransactionList({
    groupedTransactions,
    onTransactionClick,
    showDateHeaders = true,
    className = '',
    emptyMessage = '暂无交易记录',
    isLoading = false,
    error = null,
    isMultiSelectMode = false,
    selectedTransactions = new Set(),
    onTransactionSelect,
    isLoadingMore = false,
    hasMore = false,
    totalCount = 0
  }: UnifiedTransactionListProps) {

    // 获取图标类名
    const getIconClass = (iconName: string, type: TransactionType) => {
      // 如果是收入类型且没有图标名称，使用默认收入图标
      if (type === TransactionType.INCOME && !iconName) {
        return 'fa-money-bill-wave';
      }

      return getCategoryIconClass(iconName);
    };

    // 处理交易项点击
    const handleTransactionClick = (transactionId: string) => {
      if (isMultiSelectMode && onTransactionSelect) {
        onTransactionSelect(transactionId);
      } else if (onTransactionClick) {
        onTransactionClick(transactionId);
      }
    };

    // 处理多选复选框点击
    const handleCheckboxClick = (transactionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (onTransactionSelect) {
        onTransactionSelect(transactionId);
      }
    };

    // 加载状态
    if (isLoading) {
      return (
        <div className={`unified-transaction-list ${className}`}>
          <div className="loading-state">加载中...</div>
        </div>
      );
    }

    // 错误状态
    if (error) {
      return (
        <div className={`unified-transaction-list ${className}`}>
          <div className="error-state">{error}</div>
        </div>
      );
    }

    // 空状态
    if (groupedTransactions.length === 0) {
      return (
        <div className={`unified-transaction-list ${className}`}>
          <div className="empty-state">{emptyMessage}</div>
        </div>
      );
    }

    return (
      <div className={`unified-transaction-list ${className}`}>
        {groupedTransactions.map((group) => (
          <div key={group.date} className="transaction-group">
            {showDateHeaders && (
              <div className="transaction-date">{group.date}</div>
            )}
            <div className="transaction-list">
              {group.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`transaction-item ${isMultiSelectMode ? 'multi-select-mode' : ''} ${selectedTransactions.has(transaction.id) ? 'selected' : ''}`}
                  onClick={() => handleTransactionClick(transaction.id)}
                  style={{ cursor: (onTransactionClick || isMultiSelectMode) ? 'pointer' : 'default' }}
                >
                  {isMultiSelectMode && (
                    <div className="transaction-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={() => {}}
                        onClick={(e) => handleCheckboxClick(transaction.id, e)}
                      />
                    </div>
                  )}
                  <div className="transaction-icon">
                    <i
                      className={`fas ${getIconClass(transaction.categoryIcon || transaction.category?.icon || '', transaction.type)}`}
                    ></i>
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-title">
                      {transaction.description || transaction.title || transaction.categoryName}
                    </div>
                    <div className="transaction-category">{transaction.categoryName || transaction.category?.name}</div>
                    {transaction.tags && transaction.tags.length > 0 && (
                      <div className="transaction-tags">
                        <TagDisplay
                          tags={transaction.tags}
                          size="small"
                          maxDisplay={2}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                  <div
                    className={`transaction-amount ${transaction.type === TransactionType.EXPENSE ? 'expense' : 'income'}`}
                  >
                    {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 加载更多指示器 */}
        {isLoadingMore && (
          <div className="loading-more">
            <div className="loading-spinner"></div>
            <span>加载更多...</span>
          </div>
        )}

        {/* 没有更多数据提示 */}
        {!hasMore && totalCount > 0 && (
          <div className="no-more-data">
            <span>已加载全部 {totalCount} 条记录</span>
          </div>
        )}
      </div>
    );
  }
);

export default UnifiedTransactionList;
