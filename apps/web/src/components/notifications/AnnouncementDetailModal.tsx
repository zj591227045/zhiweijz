'use client';

import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNotificationStore } from '@/store/notification-store';
import { useRouter } from 'next/navigation';

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnnouncementDetailModal({ isOpen, onClose }: AnnouncementDetailModalProps) {
  const router = useRouter();
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

  // 解析Markdown链接为HTML
  const parseLinksToHtml = (content: string) => {
    let result = content;

    // 1. 匹配标准Markdown链接格式 [文本](URL)
    const standardLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    result = result.replace(standardLinkRegex, (match, text, url) => {
      // 判断是否为内部链接
      const isInternal = url.startsWith('/') || url.startsWith('#') ||
                        (!url.startsWith('http://') && !url.startsWith('https://'));
      const target = isInternal ? '_self' : '_blank';
      const rel = isInternal ? '' : 'noopener noreferrer';

      return `<a href="${url}" target="${target}" ${rel ? `rel="${rel}"` : ''} style="color: var(--primary-color, #3b82f6); text-decoration: underline; cursor: pointer;" data-link="true">${text}</a>`;
    });

    // 2. 匹配方括号链接格式 [文本][URL]
    const bracketLinkRegex = /\[([^\]]+)\]\[([^\]]+)\]/g;
    result = result.replace(bracketLinkRegex, (match, text, url) => {
      // 判断是否为内部链接
      const isInternal = url.startsWith('/') || url.startsWith('#') ||
                        (!url.startsWith('http://') && !url.startsWith('https://'));
      const target = isInternal ? '_self' : '_blank';
      const rel = isInternal ? '' : 'noopener noreferrer';

      return `<a href="${url}" target="${target}" ${rel ? `rel="${rel}"` : ''} style="color: var(--primary-color, #3b82f6); text-decoration: underline; cursor: pointer;" data-link="true">${text}</a>`;
    });

    // 3. 匹配纯URL格式（自动链接）
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
    result = result.replace(urlRegex, (match, url) => {
      // 检查是否已经被包装在链接标签中
      if (result.includes(`href="${url}"`)) {
        return match; // 已经是链接，不重复处理
      }

      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color, #3b82f6); text-decoration: underline; cursor: pointer;" data-link="true">${url}</a>`;
    });

    return result;
  };

  // 处理链接点击
  const handleLinkClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('data-link') === 'true') {
      e.stopPropagation(); // 阻止事件冒泡

      const href = target.getAttribute('href');
      if (href) {
        // 判断是否为内部链接
        const isInternal = href.startsWith('/') || href.startsWith('#') ||
                          (!href.startsWith('http://') && !href.startsWith('https://'));

        if (isInternal) {
          // 内部链接使用路由跳转
          router.push(href);
          onClose(); // 关闭模态框
        } else {
          // 外部链接在新窗口打开
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    }
  };

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
              onClick={handleLinkClick}
            >
              {(() => {
                const processedContent = parseLinksToHtml(selectedAnnouncement.content).replace(/\n/g, '<br>');
                console.log('原始内容:', selectedAnnouncement.content);
                console.log('处理后的HTML:', processedContent);
                return (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: processedContent
                    }}
                  />
                );
              })()}
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
