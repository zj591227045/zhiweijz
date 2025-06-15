'use client';

// 强制动态渲染，避免静态生成时的模块解析问题
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAnnouncementManagement } from '@/store/admin/useAnnouncementManagement';
import { AnnouncementList } from '@/components/admin/AnnouncementList';
import { AnnouncementEditor } from '@/components/admin/AnnouncementEditor';
import { AnnouncementStats } from '@/components/admin/AnnouncementStats';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function AnnouncementsPage() {
  const {
    announcements,
    stats,
    pagination,
    isLoading,
    searchTerm,
    statusFilter,
    priorityFilter,
    fetchAnnouncements,
    fetchStats,
    setSearchTerm,
    setStatusFilter,
    setPriorityFilter,
    createAnnouncement,
    updateAnnouncement,
    publishAnnouncement,
    unpublishAnnouncement,
    archiveAnnouncement,
    deleteAnnouncement,
    batchOperation
  } = useAnnouncementManagement();

  const [showEditor, setShowEditor] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchAnnouncements();
    fetchStats();
  }, []);

  // 搜索处理
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setTimeout(() => {
      fetchAnnouncements(1);
    }, 300);
  };

  // 筛选处理
  const handleStatusFilter = (status: any) => {
    setStatusFilter(status);
    fetchAnnouncements(1);
  };

  const handlePriorityFilter = (priority: any) => {
    setPriorityFilter(priority);
    fetchAnnouncements(1);
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    fetchAnnouncements(page);
  };

  // 创建公告
  const handleCreate = () => {
    setEditingAnnouncement(null);
    setShowEditor(true);
  };

  // 编辑公告
  const handleEdit = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setShowEditor(true);
  };

  // 保存公告
  const handleSave = async (data: any) => {
    let success = false;
    
    if (editingAnnouncement) {
      success = await updateAnnouncement(editingAnnouncement.id, data);
    } else {
      success = await createAnnouncement(data);
    }
    
    if (success) {
      setShowEditor(false);
      setEditingAnnouncement(null);
    }
  };

  // 批量操作
  const handleBatchOperation = async (operation: 'publish' | 'unpublish' | 'archive' | 'delete') => {
    if (selectedIds.length === 0) {
      return;
    }

    const success = await batchOperation(selectedIds, operation);
    if (success) {
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">公告管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理系统公告，向用户发送通知和更新信息
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            统计数据
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            新建公告
          </button>
        </div>
      </div>

      {/* 统计数据 */}
      {showStats && stats && (
        <AnnouncementStats stats={stats} />
      )}

      {/* 搜索和筛选栏 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          {/* 搜索框 */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="搜索公告标题或内容..."
              />
            </div>
          </div>

          {/* 筛选器 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="all">全部状态</option>
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
                <option value="ARCHIVED">已归档</option>
              </select>
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => handlePriorityFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="all">全部优先级</option>
              <option value="LOW">低</option>
              <option value="NORMAL">普通</option>
              <option value="HIGH">高</option>
              <option value="URGENT">紧急</option>
            </select>
          </div>
        </div>

        {/* 批量操作 */}
        {selectedIds.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">
              已选择 {selectedIds.length} 个公告
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBatchOperation('publish')}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                批量发布
              </button>
              <button
                onClick={() => handleBatchOperation('unpublish')}
                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                批量撤回
              </button>
              <button
                onClick={() => handleBatchOperation('archive')}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                批量归档
              </button>
              <button
                onClick={() => handleBatchOperation('delete')}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                批量删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 公告列表 */}
      <AnnouncementList
        announcements={announcements}
        isLoading={isLoading}
        pagination={pagination}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onPublish={publishAnnouncement}
        onUnpublish={unpublishAnnouncement}
        onArchive={archiveAnnouncement}
        onDelete={deleteAnnouncement}
      />

      {/* 公告编辑器 */}
      {showEditor && (
        <AnnouncementEditor
          announcement={editingAnnouncement}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditingAnnouncement(null);
          }}
        />
      )}
    </div>
  );
} 