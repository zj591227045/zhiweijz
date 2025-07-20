'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TagDisplay, MobileTagSelector } from '../tags';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import { tagApi } from '@/lib/api/tag-api';
import { Filter, X } from 'lucide-react';

interface TagFilterSelectorProps {
  accountBookId: string;
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  className?: string;
}

/**
 * 统计分析页面的标签筛选选择器
 */
export const TagFilterSelector: React.FC<TagFilterSelectorProps> = ({
  accountBookId,
  selectedTagIds,
  onSelectionChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagResponseDto[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取已选择的标签详情
  useEffect(() => {
    const fetchSelectedTags = async () => {
      if (selectedTagIds.length === 0) {
        setSelectedTags([]);
        return;
      }

      setLoading(true);
      try {
        const response = await tagApi.getTags({
          accountBookId,
          isActive: true,
          limit: 100,
        });

        if (response.success) {
          const tags = response.data.tags.filter((tag) => selectedTagIds.includes(tag.id));
          setSelectedTags(tags);
        }
      } catch (error) {
        console.error('获取标签详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSelectedTags();
  }, [selectedTagIds, accountBookId]);

  // 移除标签
  const handleRemoveTag = (tagId: string) => {
    const newTagIds = selectedTagIds.filter((id) => id !== tagId);
    onSelectionChange(newTagIds);
  };

  // 清空所有标签
  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* 标签筛选标题和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">标签筛选</span>
          {selectedTagIds.length > 0 && (
            <span className="text-xs text-gray-500">({selectedTagIds.length} 个标签)</span>
          )}
        </div>

        {selectedTagIds.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            清空筛选
          </button>
        )}
      </div>

      {/* 已选择的标签显示 */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm text-gray-500">加载中...</span>
            </div>
          ) : (
            <TagDisplay
              tags={selectedTags}
              size="small"
              showRemove
              onRemove={(tag) => handleRemoveTag(tag.id)}
              className="flex-wrap"
            />
          )}
        </div>
      )}

      {/* 标签选择器按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors',
        )}
      >
        <span className="text-sm text-gray-600">
          {selectedTagIds.length > 0 ? '修改标签筛选' : '选择标签进行筛选'}
        </span>
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 模态框标签选择器 - 使用居中样式 */}
      <MobileTagSelector
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        accountBookId={accountBookId}
        selectedTagIds={selectedTagIds}
        onSelectionChange={onSelectionChange}
        placeholder="搜索标签"
        allowCreate={false} // 统计页面不允许创建新标签
        disabled={false}
        position="center" // 使用居中模态框样式
      />

      {/* 筛选提示 */}
      {selectedTagIds.length > 0 && (
        <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-md p-2">
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              当前统计数据已按选中的 {selectedTagIds.length}{' '}
              个标签进行筛选，只显示包含这些标签的记账记录
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 简化版标签筛选器（用于移动端）
 */
interface MobileTagFilterProps {
  accountBookId: string;
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const MobileTagFilter: React.FC<MobileTagFilterProps> = ({
  accountBookId,
  selectedTagIds,
  onSelectionChange,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* 底部弹出内容 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">标签筛选</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签筛选内容 */}
        <div className="p-4">
          <TagFilterSelector
            accountBookId={accountBookId}
            selectedTagIds={selectedTagIds}
            onSelectionChange={onSelectionChange}
          />
        </div>

        {/* 底部操作 */}
        <div className="p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            应用筛选
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagFilterSelector;
