import { useState } from 'react';
import { Announcement, Pagination } from '@/store/admin/useAnnouncementManagement';
import { 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ArchiveBoxIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface AnnouncementListProps {
  announcements: Announcement[];
  isLoading: boolean;
  pagination: Pagination | null;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onPageChange: (page: number) => void;
  onEdit: (announcement: Announcement) => void;
  onPublish: (id: string) => Promise<boolean>;
  onUnpublish: (id: string) => Promise<boolean>;
  onArchive: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function AnnouncementList({
  announcements,
  isLoading,
  pagination,
  selectedIds,
  onSelectionChange,
  onPageChange,
  onEdit,
  onPublish,
  onUnpublish,
  onArchive,
  onDelete
}: AnnouncementListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(announcements.map(a => a.id));
    } else {
      onSelectionChange([]);
    }
  };

  // 处理单选
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  // 获取状态样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'ARCHIVED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取优先级样式
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return '已发布';
      case 'DRAFT': return '草稿';
      case 'ARCHIVED': return '已归档';
      default: return status;
    }
  };

  // 获取优先级文本
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '紧急';
      case 'HIGH': return '高';
      case 'NORMAL': return '普通';
      case 'LOW': return '低';
      default: return priority;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* 表格头部 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedIds.length === announcements.length && announcements.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-3 text-sm font-medium text-gray-900">
            公告列表 ({pagination?.total || 0})
          </span>
        </div>
      </div>

      {/* 公告列表 */}
      <div className="divide-y divide-gray-200">
        {announcements.length === 0 ? (
          <div className="p-12 text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无公告</h3>
            <p className="mt-1 text-sm text-gray-500">开始创建第一个公告吧</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start space-x-4">
                {/* 选择框 */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(announcement.id)}
                  onChange={(e) => handleSelectOne(announcement.id, e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />

                {/* 公告内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {announcement.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(announcement.status)}`}>
                        {getStatusText(announcement.status)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(announcement.priority)}`}>
                        {getPriorityText(announcement.priority)}
                      </span>
                    </div>
                  </div>

                  {/* 公告摘要 */}
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {announcement.content.length > 100 
                        ? `${announcement.content.substring(0, 100)}...`
                        : announcement.content
                      }
                    </p>
                  </div>

                  {/* 展开的内容 */}
                  {expandedId === announcement.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: announcement.content.replace(/\n/g, '<br>') }} />
                      </div>
                    </div>
                  )}

                  {/* 元信息 */}
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>创建者: {announcement.creator?.username || '未知'}</span>
                      <span>
                        创建时间: {formatDistanceToNow(new Date(announcement.createdAt), { 
                          addSuffix: true, 
                          locale: zhCN 
                        })}
                      </span>
                      {announcement.publishedAt && (
                        <span>
                          发布时间: {formatDistanceToNow(new Date(announcement.publishedAt), { 
                            addSuffix: true, 
                            locale: zhCN 
                          })}
                        </span>
                      )}
                      {announcement.expiresAt && (
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          过期时间: {new Date(announcement.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span>阅读率: {announcement.readRate.toFixed(1)}%</span>
                      <span>({announcement.readCount}/{announcement.totalUsers})</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="mt-4 flex items-center space-x-2">
                    <button
                      onClick={() => setExpandedId(expandedId === announcement.id ? null : announcement.id)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      {expandedId === announcement.id ? '收起' : '查看'}
                    </button>

                    <button
                      onClick={() => onEdit(announcement)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      编辑
                    </button>

                    {announcement.status === 'DRAFT' && (
                      <button
                        onClick={() => onPublish(announcement.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        发布
                      </button>
                    )}

                    {announcement.status === 'PUBLISHED' && (
                      <button
                        onClick={() => onUnpublish(announcement.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        撤回
                      </button>
                    )}

                    {announcement.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => onArchive(announcement.id)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <ArchiveBoxIcon className="h-4 w-4 mr-1" />
                        归档
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm('确定要删除这个公告吗？此操作不可恢复。')) {
                          onDelete(announcement.id);
                        }
                      }}
                      className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                显示第 <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> 到{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                条，共 <span className="font-medium">{pagination.total}</span> 条记录
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                
                {/* 页码按钮 */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 