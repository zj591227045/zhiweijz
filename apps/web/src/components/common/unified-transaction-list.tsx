'use client';

import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, getCategoryIconClass } from '../../lib/utils';
import { TagDisplay } from '../tags/tag-display';
import { SwipeableTransactionItem } from '../transactions/swipeable-transaction-item';
import { AttachmentThumbnail } from '../transactions/attachment-preview';
import { EnhancedAttachmentPreview } from '../transactions/attachment-preview';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import { hapticPresets } from '@/lib/haptic-feedback';

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

// 记账类型枚举
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
export const UnifiedTransactionList = memo(function UnifiedTransactionList({
  groupedTransactions,
  onTransactionClick,
  showDateHeaders = true,
  className = '',
  emptyMessage = '暂无记账记录',
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
  onDataRefresh,
}: UnifiedTransactionListProps) {
  // 图片预览状态
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewFiles, setPreviewFiles] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // 获取图标类名
  const getIconClass = (iconName: string, type: TransactionType) => {
    // 如果是收入类型且没有图标名称，使用默认收入图标
    if (type === TransactionType.INCOME && !iconName) {
      return 'fa-money-bill-wave';
    }

    return getCategoryIconClass(iconName);
  };

  // 处理记账项点击
  const handleTransactionClick = (transactionId: string) => {
    // 添加交易点击的振动反馈
    hapticPresets.transactionTap();

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

  // 处理缩略图点击，显示图片预览
  const handleThumbnailClick = (transaction: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();

    // 获取所有图片附件
    const imageAttachments =
      transaction.attachments?.filter((attachment) =>
        attachment.file?.mimeType?.startsWith('image/'),
      ) || [];

    if (imageAttachments.length > 0) {
      const files = imageAttachments.map((att) => att.file).filter(Boolean);
      setPreviewFiles(files);
      setPreviewIndex(0);
      setPreviewFile(files[0]);
      setShowPreview(true);
    }
  };

  // 处理图片预览导航
  const handlePreviewNavigate = (index: number) => {
    setPreviewIndex(index);
    setPreviewFile(previewFiles[index]);
  };

  // 处理图片预览下载
  const handlePreviewDownload = async (file: any) => {
    try {
      // 使用fetch下载文件，携带认证信息
      const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage')!)?.state?.token
        : null;

      if (!token) {
        throw new Error('未找到认证令牌');
      }

      const apiBaseUrl =
        typeof window !== 'undefined' && localStorage.getItem('server-config-storage')
          ? JSON.parse(localStorage.getItem('server-config-storage')!)?.state?.config?.currentUrl ||
            '/api'
          : '/api';

      const downloadUrl = `${apiBaseUrl}/file-storage/${file.id}/download`;

      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      // 创建blob URL
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载文件失败:', error);
      // 回退到直接URL下载
      if (file.url) {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.originalName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  // 关闭图片预览
  const handlePreviewClose = () => {
    setShowPreview(false);
    setPreviewFile(null);
    setPreviewFiles([]);
    setPreviewIndex(0);
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
    <>
      <div className={`unified-transaction-list ${className}`}>
        {groupedTransactions.map((group) => (
          <div key={group.date} className="transaction-group">
            {showDateHeaders && <div className="transaction-date">{group.date}</div>}
            <div className="transaction-list">
              {group.transactions.map((transaction) =>
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
                    style={{
                      cursor: onTransactionClick || isMultiSelectMode ? 'pointer' : 'default',
                    }}
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
                        const firstImageAttachment = transaction.attachments?.find((attachment) =>
                          attachment.file?.mimeType.startsWith('image/'),
                        );

                        if (firstImageAttachment?.file) {
                          return (
                            <div
                              onClick={(e) => handleThumbnailClick(transaction, e)}
                              style={{
                                cursor: 'pointer',
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                overflow: 'hidden',
                              }}
                            >
                              <AttachmentThumbnail
                                file={firstImageAttachment.file}
                                size="medium"
                                className="w-full h-full"
                              />
                            </div>
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
                      <div
                        className="transaction-title"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span>
                          {transaction.description || transaction.title || transaction.categoryName}
                        </span>
                        {transaction.attachments && transaction.attachments.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Paperclip className="w-3 h-3 text-gray-500" />
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                              {transaction.attachments.length}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="transaction-category">
                        {transaction.categoryName || transaction.category?.name}
                      </div>
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
                ),
              )}
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

      {/* 图片预览模态框 - 使用 Portal 渲染到 body */}
      {showPreview &&
        previewFile &&
        typeof window !== 'undefined' &&
        createPortal(
          <EnhancedAttachmentPreview
            files={previewFiles}
            currentIndex={previewIndex}
            isOpen={showPreview}
            onClose={handlePreviewClose}
            onNavigate={handlePreviewNavigate}
            onDownload={handlePreviewDownload}
          />,
          document.body,
        )}
    </>
  );
});

export default UnifiedTransactionList;
