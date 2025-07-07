'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TagDisplay } from './tag-display';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import { tagApi } from '@/lib/api/tag-api';
import { FileText, Plus, Star, Bookmark } from 'lucide-react';

interface TagTemplate {
  id: string;
  name: string;
  description?: string;
  tags: TagResponseDto[];
  category?: string;
  isDefault?: boolean;
  usageCount?: number;
}

interface TagTemplateProps {
  accountBookId: string;
  selectedTagIds: string[];
  onTagsApply: (tagIds: string[]) => void;
  onTemplateCreate?: (template: Omit<TagTemplate, 'id'>) => void;
  className?: string;
}

/**
 * 标签模板组件
 * 提供预设标签模板和快速应用功能
 */
export const TagTemplateSelector: React.FC<TagTemplateProps> = ({
  accountBookId,
  selectedTagIds,
  onTagsApply,
  onTemplateCreate,
  className,
}) => {
  const [templates, setTemplates] = useState<TagTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取标签模板（暂时使用预设模板）
  const fetchTemplates = async () => {
    if (!accountBookId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 暂时使用空数组，只显示预设模板
      setTemplates([]);
    } catch (err) {
      console.error('获取标签模板失败:', err);
      setError(err instanceof Error ? err.message : '获取模板失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [accountBookId]);

  // 应用模板
  const handleApplyTemplate = async (template: TagTemplate) => {
    try {
      const tagIds = template.tags.map(tag => tag.id);
      onTagsApply(tagIds);

      // 暂时不更新使用次数，因为相关API还未实现
      console.log('应用标签模板:', template.name, '标签数量:', tagIds.length);
    } catch (err) {
      console.error('应用模板失败:', err);
    }
  };

  // 预设模板数据（暂时禁用，避免使用不存在的标签ID）
  const defaultTemplates: Omit<TagTemplate, 'id'>[] = [];

  // 合并默认模板和用户模板
  const allTemplates = [...defaultTemplates.map((t, index) => ({ ...t, id: `default-${index}` })), ...templates];

  // 获取分类图标
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'lifestyle':
        return '🏠';
      case 'work':
        return '💼';
      case 'entertainment':
        return '🎮';
      case 'finance':
        return '💰';
      default:
        return '📋';
    }
  };

  if (!allTemplates.length && !isLoading) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 模板标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">标签模板</span>
          {allTemplates.length > 0 && (
            <span className="text-xs text-gray-500">
              ({allTemplates.length} 个模板)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {onTemplateCreate && (
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              创建模板
            </button>
          )}
          
          {allTemplates.length > 2 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              {isExpanded ? '收起' : '展开'}
            </button>
          )}
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center space-x-2 py-2">
          <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-500">加载模板...</span>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      {/* 模板列表 */}
      {allTemplates.length > 0 && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(isExpanded ? allTemplates : allTemplates.slice(0, 4)).map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
              onClick={() => handleApplyTemplate(template)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getCategoryIcon(template.category)}</span>
                  <div>
                    <div className="font-medium text-sm text-gray-900 flex items-center space-x-1">
                      <span>{template.name}</span>
                      {template.isDefault && (
                        <Star className="w-3 h-3 text-yellow-500" />
                      )}
                    </div>
                    {template.description && (
                      <div className="text-xs text-gray-500">{template.description}</div>
                    )}
                  </div>
                </div>
                
                {template.usageCount !== undefined && template.usageCount > 0 && (
                  <div className="text-xs text-gray-500">
                    {template.usageCount} 次使用
                  </div>
                )}
              </div>
              
              {/* 标签预览 */}
              <div className="mb-2">
                <TagDisplay 
                  tags={template.tags.slice(0, 3)} 
                  size="small"
                  className="pointer-events-none"
                />
                {template.tags.length > 3 && (
                  <span className="text-xs text-gray-500 ml-2">
                    +{template.tags.length - 3} 个标签
                  </span>
                )}
              </div>
              
              {/* 应用按钮 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  点击应用到当前交易
                </span>
                <Plus className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建模板表单 */}
      {showCreateForm && onTemplateCreate && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">创建标签模板</h4>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            <input
              type="text"
              placeholder="模板名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="模板描述（可选）"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            
            {selectedTagIds.length > 0 && (
              <div className="text-sm text-gray-600">
                将使用当前选中的 {selectedTagIds.length} 个标签创建模板
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  // 实现创建模板逻辑
                  setShowCreateForm(false);
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                disabled={selectedTagIds.length === 0}
              >
                创建模板
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      {allTemplates.length > 0 && (
        <div className="text-xs text-gray-500 bg-purple-50 border border-purple-200 rounded-md p-2">
          <div className="flex items-center space-x-1">
            <Bookmark className="w-3 h-3 text-purple-500" />
            <span>
              选择模板快速应用一组相关标签，提高记账效率
            </span>
          </div>
        </div>
      )}
    </div>
  );
};


