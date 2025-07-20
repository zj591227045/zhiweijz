'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Paperclip } from 'lucide-react';
import { formatCurrency, getCategoryIconClass } from '@/lib/utils';
import { TagDisplay } from '../tags/tag-display';
import { AttachmentThumbnail, EnhancedAttachmentPreview } from './attachment-preview';
import { QuickUploadModal } from './quick-upload-modal';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import { hapticPresets } from '@/lib/haptic-feedback';

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

interface AttachmentFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
}

interface TransactionAttachment {
  id: string;
  attachmentType: string;
  description?: string;
  file?: AttachmentFile;
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
  attachments?: TransactionAttachment[];
}

interface SwipeableTransactionItemProps {
  transaction: Transaction;
  onTransactionClick?: (transactionId: string) => void;
  onAttachmentClick?: (transactionId: string) => void;
  onDeleteClick?: (transactionId: string) => void;
  onDataRefresh?: () => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onTransactionSelect?: (transactionId: string) => void;
  className?: string;
}

export function SwipeableTransactionItem({
  transaction,
  onTransactionClick,
  onAttachmentClick,
  onDeleteClick,
  onDataRefresh,
  isMultiSelectMode = false,
  isSelected = false,
  onTransactionSelect,
  className = '',
}: SwipeableTransactionItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // 图片预览状态
  const [previewFiles, setPreviewFiles] = useState<AttachmentFile[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80; // 滑动阈值
  const MAX_SWIPE = 120; // 最大滑动距离

  // 获取第一张图片附件作为缩略图
  const getFirstImageAttachment = () => {
    return transaction.attachments?.find((attachment) =>
      attachment.file?.mimeType.startsWith('image/'),
    );
  };

  // 获取图标类名
  const getIconClass = (iconName: string, type: TransactionType) => {
    if (type === TransactionType.INCOME && !iconName) {
      return 'fa-money-bill-wave';
    }
    return getCategoryIconClass(iconName);
  };

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMultiSelectMode) return;

    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  // 处理触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isMultiSelectMode) return;

    const currentX = e.touches[0].clientX;
    const deltaX = startX - currentX;

    // 只允许向左滑动
    if (deltaX > 0) {
      const newOffset = Math.min(deltaX, MAX_SWIPE);
      setSwipeOffset(newOffset);
    }
  };

  // 处理触摸结束
  const handleTouchEnd = () => {
    if (!isDragging || isMultiSelectMode) return;

    setIsDragging(false);

    // 根据滑动距离决定是否显示操作按钮
    if (swipeOffset > SWIPE_THRESHOLD) {
      setSwipeOffset(MAX_SWIPE);
    } else {
      setSwipeOffset(0);
    }
  };

  // 处理鼠标事件（桌面端支持）
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMultiSelectMode) return;

    setStartX(e.clientX);
    setIsDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = startX - e.clientX;
      if (deltaX > 0) {
        const newOffset = Math.min(deltaX, MAX_SWIPE);
        setSwipeOffset(newOffset);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);

      if (swipeOffset > SWIPE_THRESHOLD) {
        setSwipeOffset(MAX_SWIPE);
      } else {
        setSwipeOffset(0);
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 点击外部区域时收起滑动
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(event.target as Node)) {
        setSwipeOffset(0);
      }
    };

    if (swipeOffset > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [swipeOffset]);

  // 处理记账项点击
  const handleTransactionClick = () => {
    if (swipeOffset > 0) {
      setSwipeOffset(0);
      return;
    }

    if (isMultiSelectMode && onTransactionSelect) {
      // 多选模式下的项目选择振动
      hapticPresets.itemSelect();
      onTransactionSelect(transaction.id);
    } else if (onTransactionClick) {
      // 正常点击记账项的振动反馈
      hapticPresets.transactionTap();
      onTransactionClick(transaction.id);
    }
  };

  // 处理多选复选框点击
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTransactionSelect) {
      onTransactionSelect(transaction.id);
    }
  };

  // 处理附件按钮点击
  const handleAttachmentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);

    // 无论是否已有附件，都打开快速上传模态框
    // 这样用户可以继续添加更多附件
    setShowUploadModal(true);
  };

  // 处理删除按钮点击
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    if (onDeleteClick) {
      onDeleteClick(transaction.id);
    }
  };

  // 处理缩略图点击
  const handleThumbnailClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 获取所有图片附件
    const imageAttachments =
      transaction.attachments?.filter((attachment) =>
        attachment.file?.mimeType?.startsWith('image/'),
      ) || [];

    if (imageAttachments.length > 0) {
      const files = imageAttachments.map((att) => att.file).filter(Boolean) as AttachmentFile[];
      setPreviewFiles(files);
      setPreviewIndex(0);
      setShowPreview(true);
    }
  };

  // 处理图片预览导航
  const handlePreviewNavigate = (index: number) => {
    setPreviewIndex(index);
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
    setPreviewFiles([]);
    setPreviewIndex(0);
  };
  const handleAttachmentUploaded = () => {
    setShowUploadModal(false);
    // 触发父组件刷新数据
    if (onDataRefresh) {
      onDataRefresh();
    }
    console.log('附件上传成功，记账ID:', transaction.id);
  };

  const firstImageAttachment = getFirstImageAttachment();

  return (
    <div
      ref={itemRef}
      className={`swipeable-transaction-item ${className} ${isMultiSelectMode ? 'multi-select-mode' : ''} ${isSelected ? 'selected' : ''}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        marginBottom: '4px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 背景操作按钮 */}
      <div
        ref={actionsRef}
        className="swipe-actions"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${MAX_SWIPE}px`,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--background-secondary, #f3f4f6)',
          zIndex: 1,
        }}
      >
        <button
          className="swipe-action-button attachment-button"
          onClick={handleAttachmentClick}
          style={{
            width: '60px',
            height: '100%',
            backgroundColor:
              transaction.attachments && transaction.attachments.length > 0 ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexDirection: 'column',
            fontSize: '10px',
            gap: '2px',
          }}
          title={
            transaction.attachments && transaction.attachments.length > 0
              ? `添加更多附件 (当前${transaction.attachments.length}个)`
              : '上传附件'
          }
        >
          <Paperclip size={16} />
          {transaction.attachments && transaction.attachments.length > 0 ? (
            <span>{transaction.attachments.length}</span>
          ) : (
            <span>上传</span>
          )}
        </button>
        <button
          className="swipe-action-button delete-button"
          onClick={handleDeleteClick}
          style={{
            width: '60px',
            height: '100%',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* 记账项内容 */}
      <div
        className="transaction-content"
        style={{
          position: 'relative',
          zIndex: 2,
          transform: `translateX(-${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
          backgroundColor: 'var(--card-background, #ffffff)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e5e7eb)',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleTransactionClick}
      >
        {/* 多选复选框 */}
        {isMultiSelectMode && (
          <div className="transaction-checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={handleCheckboxClick}
              style={{ margin: 0 }}
            />
          </div>
        )}

        {/* 记账图标或附件缩略图 */}
        <div className="transaction-icon" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
          {firstImageAttachment?.file ? (
            <div
              onClick={handleThumbnailClick}
              style={{ cursor: 'pointer', width: '100%', height: '100%' }}
            >
              <AttachmentThumbnail
                file={firstImageAttachment.file}
                size="medium"
                className="w-full h-full"
              />
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-color-light, rgba(59, 130, 246, 0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-color, #3b82f6)',
              }}
            >
              <i
                className={`fas ${getIconClass(transaction.categoryIcon || transaction.category?.icon || '', transaction.type)}`}
              />
            </div>
          )}
        </div>

        {/* 记账详情 */}
        <div className="transaction-details" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text-primary, #1f2937)' }}
            >
              {transaction.description || transaction.title || transaction.categoryName}
            </span>
            {transaction.attachments && transaction.attachments.length > 0 && (
              <Paperclip size={14} style={{ color: 'var(--text-secondary, #6b7280)' }} />
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #6b7280)' }}>
            {transaction.categoryName}
          </div>
          {transaction.tags && transaction.tags.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <TagDisplay tags={transaction.tags} maxDisplay={2} size="small" />
            </div>
          )}
        </div>

        {/* 记账金额 */}
        <div
          className="transaction-amount"
          style={{
            fontWeight: '600',
            fontSize: '16px',
            color:
              transaction.type === TransactionType.EXPENSE
                ? 'var(--error-color, #ef4444)'
                : 'var(--success-color, #10b981)',
          }}
        >
          {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
          {formatCurrency(transaction.amount)}
        </div>
      </div>

      {/* 快速上传模态框 */}
      <QuickUploadModal
        isOpen={showUploadModal}
        transactionId={transaction.id}
        transactionName={transaction.description || transaction.categoryName || '未知记账'}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleAttachmentUploaded}
      />

      {/* 图片预览模态框 - 使用 Portal 渲染到 body */}
      {showPreview &&
        previewFiles.length > 0 &&
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
    </div>
  );
}
