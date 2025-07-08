'use client';

import { memo } from 'react';
import { formatCurrency, getCategoryIconClass } from '../../lib/utils';
import { TagDisplay } from '../tags/tag-display';
import { SwipeableTransactionItem } from '../transactions/swipeable-transaction-item';
import { AttachmentThumbnail } from '../transactions/attachment-preview';
import { TagResponseDto } from '@/lib/api/types/tag.types';

// Paperclip图标组件
const Paperclip = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
    />
  </svg>
);

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
  attachments?: Array<{
    id: string;
    attachmentType: string;
    description?: string;
    file?: {
      id: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      url?: string;
    };
  }>;
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
  // 滑动操作相关
  enableSwipeActions?: boolean;
  onAttachmentClick?: (transactionId: string) => void;
  onDeleteClick?: (transactionId: string) => void;
  onDataRefresh?: () => void; // 数据刷新回调
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
    totalCount = 0,
    enableSwipeActions = false,
    onAttachmentClick,
    onDeleteClick,
    onDataRefresh
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
                enableSwipeActions ? (
                  <SwipeableTransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onTransactionClick={onTransactionClick}
                    onAttachmentClick={onAttachmentClick}
                    onDeleteClick={onDeleteClick}
                    onDataRefresh={onDataRefresh}
                    isMultiSelectMode={isMultiSelectMode}
                    isSelected={selectedTransactions.has(transaction.id)}
                    onTransactionSelect={onTransactionSelect}
                  />
                ) : (
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
                      {(() => {
                        // 获取第一张图片附件作为缩略图
                        const firstImageAttachment = transaction.attachments?.find(
                          attachment => attachment.file?.mimeType.startsWith('image/')
                        );

                        if (firstImageAttachment?.file) {
                          return (
                            <AttachmentThumbnail
                              file={firstImageAttachment.file}
                              size="medium"
                              className="w-full h-full"
                            />
                          );
                        } else {
                          return (
                            <i
                              className={`fas ${getIconClass(transaction.categoryIcon || transaction.category?.icon || '', transaction.type)}`}
                            ></i>
                          );
                        }
                      })()}
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{transaction.description || transaction.title || transaction.categoryName}</span>
                        {transaction.attachments && transaction.attachments.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Paperclip className="w-3 h-3 text-gray-500" />
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                              {transaction.attachments.length}
                            </span>
                          </div>
                        )}
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
                )
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
