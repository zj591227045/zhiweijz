'use client';

import { useEffect, useState } from 'react';
import { useNotificationStore, UserAnnouncement } from '@/store/notification-store';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const {
    announcements,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    fetchAnnouncements
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');

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

  const handleAnnouncementClick = async (announcement: UserAnnouncement) => {
    if (!announcement.isRead) {
      await markAsRead(announcement.id);
    }
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
      
      {/* 模态框内容 - 居中显示，避免与底部导航栏重叠 */}
      <div className="flex items-center justify-center min-h-full p-4 pb-24">
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
            ) : (
              <div>
                {displayAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`cursor-pointer transition-colors ${
                      !announcement.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                    }`}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      ':hover': {
                        backgroundColor: 'var(--hover-background)'
                      }
                    }}
                    onClick={() => handleAnnouncementClick(announcement)}
                    onMouseEnter={(e) => {
                      if (!announcement.isRead) return;
                      e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                    }}
                    onMouseLeave={(e) => {
                      if (!announcement.isRead) return;
                      e.currentTarget.style.backgroundColor = 'transparent';
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
                          <div className="flex items-center justify-between">
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
                            {!announcement.isRead && (
                              <div className="flex-shrink-0 ml-2">
                                <div 
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: 'var(--primary-color)' }}
                                ></div>
                              </div>
                            )}
                          </div>
                          
                          <p 
                            className={`mt-1 text-sm ${
                              !announcement.isRead ? 'font-medium' : ''
                            }`}
                            style={{ 
                              color: !announcement.isRead ? 'var(--text-primary)' : 'var(--text-secondary)'
                            }}
                          >
                            {announcement.content}
                          </p>
                          
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
            )}
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
    </div>
  );
} 