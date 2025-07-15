'use client';

import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNotificationStore } from '@/store/notification-store';

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnnouncementDetailModal({ isOpen, onClose }: AnnouncementDetailModalProps) {
  const { selectedAnnouncement, isDetailModalOpen, closeDetailModal } = useNotificationStore();

  // 同步外部状态
  useEffect(() => {
    if (!isOpen && isDetailModalOpen) {
      closeDetailModal();
    }
  }, [isOpen, isDetailModalOpen, closeDetailModal]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !selectedAnnouncement) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-red-500';
      case 'HIGH':
        return 'border-orange-500';
      case 'NORMAL':
        return 'border-blue-500';
      case 'LOW':
        return 'border-gray-500';
      default:
        return 'border-blue-500';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '紧急';
      case 'HIGH':
        return '重要';
      case 'NORMAL':
        return '普通';
      case 'LOW':
        return '一般';
      default:
        return '普通';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'LOW':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-2xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--background-color)',
            border: '1px solid var(--border-color)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div 
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                公告详情
              </h3>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityBadgeColor(selectedAnnouncement.priority)}`}>
                {getPriorityText(selectedAnnouncement.priority)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 transition-colors"
              style={{ 
                color: 'var(--text-secondary)',
                ':hover': {
                  backgroundColor: 'var(--hover-background)',
                  color: 'var(--text-primary)'
                }
              }}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 8rem)' }}>
            {/* 公告标题 */}
            <div className={`border-l-4 pl-4 mb-6 ${getPriorityColor(selectedAnnouncement.priority)}`}>
              <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {selectedAnnouncement.title}
              </h1>
              <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>
                  发布于 {formatDistanceToNow(new Date(selectedAnnouncement.publishedAt), {
                    addSuffix: true,
                    locale: zhCN
                  })}
                </span>
                {selectedAnnouncement.expiresAt && (
                  <>
                    <span className="mx-2">•</span>
                    <span>
                      过期时间：{formatDistanceToNow(new Date(selectedAnnouncement.expiresAt), {
                        addSuffix: true,
                        locale: zhCN
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 公告内容 */}
            <div 
              className="prose prose-sm max-w-none"
              style={{ color: 'var(--text-primary)' }}
            >
              <div 
                dangerouslySetInnerHTML={{
                  __html: selectedAnnouncement.content.replace(/\n/g, '<br>')
                }}
              />
            </div>
          </div>

          {/* 底部操作区域 */}
          <div 
            className="flex items-center justify-end px-6 py-4"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--secondary-background)',
                border: '1px solid var(--border-color)'
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
