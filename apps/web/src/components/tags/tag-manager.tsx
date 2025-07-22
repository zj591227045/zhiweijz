'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TagResponseDto, CreateTagDto, UpdateTagDto } from '@/lib/api/types/tag.types';
import { tagApi } from '@/lib/api/tag-api';
import { TagList } from './tag-display';
import { TagEditModal } from './tag-edit-modal';
import { Search, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '@/styles/tags-theme.css';

interface TagManagerProps {
  accountBookId: string;
  onTagCreate?: (tag: TagResponseDto) => void;
  onTagUpdate?: (tag: TagResponseDto) => void;
  onTagDelete?: (tagId: string) => void;
  className?: string;
}

/**
 * 标签管理组件
 * 用于设置页面的标签管理功能
 */
export const TagManager: React.FC<TagManagerProps> = ({
  accountBookId,
  onTagCreate,
  onTagUpdate,
  onTagDelete,
  className,
}) => {
  const [tags, setTags] = useState<TagResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'created'>('usage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [editingTag, setEditingTag] = useState<TagResponseDto | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 获取标签列表
  const fetchTags = async (resetPage = false) => {
    if (!accountBookId) return;

    setLoading(true);
    try {
      const currentPage = resetPage ? 1 : page;
      const response = await tagApi.getTags({
        accountBookId,
        search: searchTerm || undefined,
        isActive: showActiveOnly,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 20,
      });

      if (resetPage) {
        setTags(response.data.tags);
        setPage(1);
      } else {
        setTags((prev) =>
          currentPage === 1 ? response.data.tags : [...prev, ...response.data.tags],
        );
      }

      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('获取标签列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchTags(true);
  }, [accountBookId, searchTerm, sortBy, sortOrder, showActiveOnly]);

  // 创建标签
  const handleCreateTag = async (data: CreateTagDto) => {
    try {
      const response = await tagApi.createTag(data);
      const newTag = response.data;

      setTags((prev) => [newTag, ...prev]);
      setShowCreateModal(false);
      onTagCreate?.(newTag);
    } catch (error) {
      console.error('创建标签失败:', error);
      throw error;
    }
  };

  // 更新标签
  const handleUpdateTag = async (tagId: string, data: UpdateTagDto) => {
    try {
      const response = await tagApi.updateTag(tagId, data);
      const updatedTag = response.data;

      setTags((prev) => prev.map((tag) => (tag.id === tagId ? updatedTag : tag)));
      setEditingTag(null);
      onTagUpdate?.(updatedTag);
    } catch (error) {
      console.error('更新标签失败:', error);
      throw error;
    }
  };

  // 删除标签
  const handleDeleteTag = async (tag: TagResponseDto) => {
    if (!confirm(`确定要删除标签"${tag.name}"吗？`)) {
      return;
    }

    try {
      await tagApi.deleteTag(tag.id);
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
      onTagDelete?.(tag.id);
    } catch (error) {
      console.error('删除标签失败:', error);
      alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 加载更多
  const handleLoadMore = () => {
    if (page < totalPages && !loading) {
      setPage((prev) => prev + 1);
      fetchTags();
    }
  };

  return (
    <div className={cn('tag-manager-container space-y-6', className)}>
      {/* 头部操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h2 className="tag-manager-title text-xl font-semibold">标签管理</h2>
          <p className="tag-manager-subtitle text-sm mt-1">
            管理账本中的标签，为记账记录添加更多维度的分类
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>新建标签</span>
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <Search className="tag-search-icon absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" />
          <Input
            type="text"
            placeholder="搜索标签名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tag-search-input pl-10"
          />
        </div>

        {/* 筛选选项 */}
        <div className="flex items-center space-x-4">
          {/* 排序方式 */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-') as [
                typeof sortBy,
                typeof sortOrder,
              ];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="tag-filter-select px-3 py-2 border rounded-md text-sm focus:ring-2"
          >
            <option value="usage-desc">使用次数 ↓</option>
            <option value="usage-asc">使用次数 ↑</option>
            <option value="name-asc">名称 A-Z</option>
            <option value="name-desc">名称 Z-A</option>
            <option value="created-desc">创建时间 ↓</option>
            <option value="created-asc">创建时间 ↑</option>
          </select>

          {/* 显示状态 */}
          <label className="tag-filter-label flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="tag-filter-checkbox rounded border focus:ring-2"
            />
            <span>仅显示活跃标签</span>
          </label>
        </div>
      </div>

      {/* 标签列表 */}
      <div className="tag-list-container rounded-lg border">
        {loading && page === 1 ? (
          <div className="tag-loading-container p-8 text-center">
            <div className="tag-loading-spinner animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2">加载中...</p>
          </div>
        ) : (
          <>
            <TagList
              tags={tags}
              onTagEdit={setEditingTag}
              onTagDelete={handleDeleteTag}
              className="p-4"
            />

            {/* 加载更多 */}
            {page < totalPages && (
              <div className="p-4 border-t" style={{ borderColor: 'var(--border-color, #e5e7eb)' }}>
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    {loading ? '加载中...' : '加载更多'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="tag-stats-card p-4 rounded-lg border">
          <div className="tag-stats-number text-2xl font-bold" style={{ color: 'var(--primary-color, #3b82f6)' }}>
            {tags.length}
          </div>
          <div className="tag-stats-label text-sm">标签总数</div>
        </div>
        <div className="tag-stats-card p-4 rounded-lg border">
          <div className="tag-stats-number text-2xl font-bold" style={{ color: 'var(--success-color, #22c55e)' }}>
            {tags.reduce((sum, tag) => sum + tag.usageCount, 0)}
          </div>
          <div className="tag-stats-label text-sm">总使用次数</div>
        </div>
        <div className="tag-stats-card p-4 rounded-lg border">
          <div className="tag-stats-number text-2xl font-bold" style={{ color: 'var(--secondary-color, #8b5cf6)' }}>
            {tags.filter((tag) => tag.usageCount > 0).length}
          </div>
          <div className="tag-stats-label text-sm">已使用标签</div>
        </div>
      </div>

      {/* 标签编辑模态框 */}
      {(editingTag || showCreateModal) && (
        <TagEditModal
          isOpen={true}
          onClose={() => {
            setEditingTag(null);
            setShowCreateModal(false);
          }}
          tag={editingTag}
          accountBookId={accountBookId}
          onSave={editingTag ? (data) => handleUpdateTag(editingTag.id, data) : handleCreateTag}
        />
      )}
    </div>
  );
};

export default TagManager;
