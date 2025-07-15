'use client';

import { useEffect, useState } from 'react';
import { useNotificationStore, UserAnnouncement } from '@/store/notification-store';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { AnnouncementDetailModal } from './AnnouncementDetailModal';
import { 
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BellIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const router = useRouter();
  const {
    announcements,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    fetchAnnouncements,
    openDetailModal,
    isDetailModalOpen,
    closeDetailModal
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');

  // 检测是否为原生应用环境
  const isNativeApp = typeof window !== 'undefined' && (
    window.navigator.userAgent.includes('CapacitorJS') ||
    window.navigator.userAgent.includes('Capacitor') ||
    // 检测iOS应用
    (window.navigator.userAgent.includes('iPhone') && window.navigator.standalone) ||
    // 检测Android应用
    window.navigator.userAgent.includes('wv') // WebView标识
  );

  // 计算Web移动端的padding
  const getWebMobilePadding = () => {
    if (typeof window === 'undefined') return { paddingTop: '2rem', paddingBottom: '2rem' };
    
    const viewportHeight = window.innerHeight;
    const isMobile = viewportHeight < 800; // 简单的移动端检测
    
    if (isMobile) {
      // 移动端：考虑底部导航栏，但确保居中
      const topPadding = Math.max(16, (viewportHeight * 0.1)); // 至少16px，最多10%
      const bottomPadding = Math.max(80, (viewportHeight * 0.1)); // 至少80px（底部导航栏），最多10%
      return {
        paddingTop: `${topPadding}px`,
        paddingBottom: `${bottomPadding}px`
      };
    } else {
      // 桌面端：简单居中
      return {
        paddingTop: '2rem',
        paddingBottom: '2rem'
      };
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnnouncements();
      // 如果没有未读通知，默认显示全部
      if (unreadCount === 0) {
        setActiveTab('all');
      } else {
        setActiveTab('unread');
      }
    }
  }, [isOpen, fetchAnnouncements, unreadCount]);

  if (!isOpen) return null;

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
      
      return `<a href="${url}" target="${target}" ${rel ? `rel="${rel}"` : ''} 
              style="color: var(--primary-color, #3b82f6); text-decoration: underline; cursor: pointer;"
              data-link="true">
              ${text}
              </a>`;
    });
    
    // 2. 匹配方括号链接格式 [文本][URL]
    const bracketLinkRegex = /\[([^\]]+)\]\[([^\]]+)\]/g;
    result = result.replace(bracketLinkRegex, (match, text, url) => {
      // 判断是否为内部链接
      const isInternal = url.startsWith('/') || url.startsWith('#') || 
                        (!url.startsWith('http://') && !url.startsWith('https://'));
      const target = isInternal ? '_self' : '_blank';
      const rel = isInternal ? '' : 'noopener noreferrer';
      
      return `<a href="${url}" target="${target}" ${rel ? `rel="${rel}"` : ''} 
              style="color: var(--primary-color, #3b82f6); text-decoration: underline; cursor: pointer;"
              data-link="true">
              ${text}
              </a>`;
    });
    
    // 3. 匹配纯URL格式（自动链接）
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
    result = result.replace(urlRegex, (match, url) => {
      // 检查是否已经被包装在链接标签中
      if (result.includes(`href="${url}"`)) {
        return match; // 已经是链接，不重复处理
      }
      
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" 
              style="color: var(--primary-color, #3b82f6); text-decoration: underline; cursor: pointer;"
              data-link="true">
              ${url}
              </a>`;
    });
    
    return result;
  };

  // 处理链接点击
  const handleLinkClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('data-link') === 'true') {
      e.stopPropagation(); // 阻止事件冒泡，避免触发已读逻辑
      
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'HIGH':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'NORMAL':
        return <InformationCircleIcon className="h-5 w-5" style={{ color: 'var(--primary-color)' }} />;
      case 'LOW':
        return <InformationCircleIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />;
      default:
        return <InformationCircleIcon className="h-5 w-5" style={{ color: 'var(--primary-color)' }} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
      case 'HIGH':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case 'NORMAL':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
      case 'LOW':
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-800/50';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
    }
  };

  // 单独的已读标记处理
  const handleMarkAsRead = async (e: React.MouseEvent, announcementId: string) => {
    e.stopPropagation(); // 阻止事件冒泡
    await markAsRead(announcementId);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  // 过滤通知
  const unreadAnnouncements = announcements.filter(a => !a.isRead);
  const readAnnouncements = announcements.filter(a => a.isRead);
  const displayAnnouncements = activeTab === 'unread' ? unreadAnnouncements : announcements;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      
      {/* 模态框内容 - 居中显示，适配不同平台 */}
      <div 
        className="flex items-center justify-center min-h-full p-4"
        style={isNativeApp ? {
          // 原生应用：使用安全区域，保持原有逻辑
          paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))'
        } : getWebMobilePadding()}
      >
        <div 
          className="relative w-full max-w-md transform overflow-hidden rounded-lg shadow-xl transition-all flex flex-col"
          style={{ 
            backgroundColor: 'var(--card-background)',
            maxHeight: 'calc(100vh - 8rem)' // 确保不会延伸到底部导航栏
          }}
        >
          {/* 头部 */}
          <div 
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center space-x-2">
              <BellIcon className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                系统通知
              </h3>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-300">
                  {unreadCount} 条未读
                </span>
              )}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 标签栏 */}
          <div 
            className="flex"
            style={{ borderBottom: '1px solid var(--border-color)' }}
          >
            <button
              onClick={() => setActiveTab('unread')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'unread' 
                  ? 'border-b-2 border-blue-500' 
                  : ''
              }`}
              style={{ 
                color: activeTab === 'unread' ? 'var(--primary-color)' : 'var(--text-secondary)',
                backgroundColor: activeTab === 'unread' ? 'var(--primary-color-light, rgba(59, 130, 246, 0.1))' : 'transparent'
              }}
            >
              未读 {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'all' 
                  ? 'border-b-2 border-blue-500' 
                  : ''
              }`}
              style={{ 
                color: activeTab === 'all' ? 'var(--primary-color)' : 'var(--text-secondary)',
                backgroundColor: activeTab === 'all' ? 'var(--primary-color-light, rgba(59, 130, 246, 0.1))' : 'transparent'
              }}
            >
              全部 ({announcements.length})
            </button>
          </div>

          {/* 操作栏 */}
          {activeTab === 'unread' && unreadCount > 0 && (
            <div 
              className="px-6 py-3"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center space-x-2 text-sm py-2 px-3 rounded-md transition-colors"
                style={{ 
                  color: 'var(--primary-color)',
                  ':hover': {
                    backgroundColor: 'var(--primary-color-light, rgba(59, 130, 246, 0.1))'
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary-color-light, rgba(59, 130, 246, 0.1))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <CheckIcon className="h-4 w-4" />
                <span>全部标记为已读</span>
              </button>
            </div>
          )}

          {/* 通知列表 */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 20rem)' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div 
                  className="animate-spin rounded-full h-8 w-8 border-b-2"
                  style={{ borderColor: 'var(--primary-color)' }}
                ></div>
              </div>
            ) : displayAnnouncements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--text-secondary)' }}>
                <BellIcon className="h-12 w-12 mb-2" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                <p>{activeTab === 'unread' ? '暂无未读通知' : '暂无通知'}</p>
              </div>
            ) :
              <div>
                {displayAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`transition-colors ${
                      !announcement.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                    }`}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <div className={`border-l-4 p-4 ${getPriorityColor(announcement.priority)}`}>
                      <div className="flex items-start space-x-3">
                        {/* 优先级图标 */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getPriorityIcon(announcement.priority)}
                        </div>
                        
                        {/* 通知内容 */}
                        <div className="flex-1 min-w-0">
                          <div
                            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md p-2 -m-2 transition-colors"
                            onClick={() => openDetailModal(announcement.id)}
                            title="点击查看详情"
                          >
                            <h4
                              className={`text-sm font-medium ${
                                !announcement.isRead ? 'font-semibold' : ''
                              }`}
                              style={{
                                color: !announcement.isRead ? 'var(--text-primary)' : 'var(--text-secondary)'
                              }}
                            >
                              {announcement.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              {!announcement.isRead && (
                                <div className="flex-shrink-0">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: 'var(--primary-color)' }}
                                  ></div>
                                </div>
                              )}
                              {/* 独立的已读标记按钮 */}
                              {!announcement.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // 阻止事件冒泡，避免触发详情模态框
                                    handleMarkAsRead(e, announcement.id);
                                  }}
                                  className="p-1 rounded-full transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                                  title="标记为已读"
                                >
                                  <CheckCircleIcon className="h-4 w-4" style={{ color: 'var(--primary-color)' }} />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* 移除内容显示，只保留标题和元信息 */}
                          
                          <div className="mt-2 flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span>
                              {formatDistanceToNow(new Date(announcement.publishedAt), {
                                addSuffix: true,
                                locale: zhCN
                              })}
                            </span>
                            {announcement.expiresAt && (
                              <span>
                                过期时间: {new Date(announcement.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>

          {/* 底部 */}
          <div 
            className="px-6 py-4"
            style={{ 
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--background-secondary, var(--card-background))'
            }}
          >
            <button
              onClick={onClose}
              className="w-full rounded-md px-4 py-3 text-base font-medium transition-colors shadow-sm"
              style={{ 
                backgroundColor: 'var(--card-background)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                ':hover': {
                  backgroundColor: 'var(--hover-background)'
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-background)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--card-background)';
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {/* 公告详情模态框 */}
      <AnnouncementDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
      />
    </div>
  );
}