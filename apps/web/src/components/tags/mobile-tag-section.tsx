'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TagDisplay } from './tag-display';
import { MobileTagSelector } from './tag-selector';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import { tagApi } from '@/lib/api/tag-api';
import { Plus, ChevronRight, Sparkles } from 'lucide-react';

interface MobileTagSectionProps {
  accountBookId: string;
  categoryId?: string;
  description?: string;
  amount?: number;
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  disabled?: boolean;
  className?: string;
  onTagSelectionComplete?: () => void; // 标签选择完成回调
}

/**
 * 移动端优化的标签选择组件
 * 默认显示智能推荐标签，点击"更多"打开完整选择器
 */
export const MobileTagSection: React.FC<MobileTagSectionProps> = ({
  accountBookId,
  categoryId,
  description,
  amount,
  selectedTagIds,
  onSelectionChange,
  disabled = false,
  className,
  onTagSelectionComplete,
}) => {
  const [showFullSelector, setShowFullSelector] = useState(false);
  //console.log('MobileTagSection 渲染，showFullSelector:', showFullSelector);
  const [allTags, setAllTags] = useState<TagResponseDto[]>([]);

  // 获取标签数据
  useEffect(() => {
    const fetchTags = async () => {
      if (!accountBookId) return;

      try {
        const response = await tagApi.getTags({
          accountBookId,
          isActive: true,
          sortBy: 'usage',
          sortOrder: 'desc',
          limit: 100,
        });
        setAllTags(response.data.tags);
      } catch (error) {
        console.error('获取标签列表失败:', error);
      }
    };

    fetchTags();
  }, [accountBookId]);

  // 获取已选择的标签
  const selectedTags = useMemo(() => {
    return allTags.filter((tag) => selectedTagIds.includes(tag.id));
  }, [allTags, selectedTagIds]);

  // 处理标签选择
  const handleTagSelect = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  // 处理标签移除
  const handleTagRemove = (tagId: string) => {
    onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
  };

  // 打开完整标签选择器
  const openFullSelector = () => {
    console.log('打开标签选择器');
    setShowFullSelector(true);
  };

  // 关闭标签选择器并自动保存
  const handleSelectorClose = () => {
    console.log('关闭标签选择器');
    setShowFullSelector(false);
    // 自动保存选择结果
    if (onTagSelectionComplete) {
      onTagSelectionComplete();
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* 已选标签显示 */}
      {selectedTagIds.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <span>已选标签</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {selectedTagIds.length}
            </span>
          </div>
          <TagDisplay
            tags={selectedTags.filter((tag) => selectedTagIds.includes(tag.id))}
            size="medium"
            showRemove
            onRemove={(tag) => handleTagRemove(tag.id)}
            className="flex-wrap gap-2"
          />
        </div>
      )}

      {/* 智能推荐标签 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>智能推荐</span>
          </div>
        </div>

        <CompactTagRecommendationV2
          accountBookId={accountBookId}
          categoryId={categoryId}
          description={description}
          selectedTagIds={selectedTagIds}
          onTagSelect={handleTagSelect}
          maxRecommendations={4}
        />
      </div>

      {/* 更多标签按钮 - 增强样式 */}
      <button
        type="button"
        onClick={openFullSelector}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-all duration-200 shadow-sm',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        style={{
          borderColor: disabled ? 'var(--border-color)' : 'var(--primary-color)',
          color: disabled ? 'var(--text-secondary)' : 'var(--primary-color)',
          backgroundColor: disabled ? 'var(--background-secondary)' : 'var(--card-background)',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'var(--primary-color-dark)';
            e.currentTarget.style.background = `linear-gradient(to right, var(--primary-color-light), rgba(var(--primary-rgb), 0.08))`;
            e.currentTarget.style.transform = 'scale(0.98)';
            e.currentTarget.style.boxShadow = 'var(--card-shadow)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'var(--primary-color)';
            e.currentTarget.style.backgroundColor = 'var(--card-background)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: disabled
              ? 'var(--background-secondary)'
              : 'var(--primary-color-light)',
          }}
        >
          <Plus
            className="w-4 h-4"
            style={{ color: disabled ? 'var(--text-secondary)' : 'var(--primary-color)' }}
          />
        </div>
        <span className="font-semibold text-base">选择更多标签</span>
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* 完整标签选择器模态框 */}
      <MobileTagSelector
        isOpen={showFullSelector}
        onClose={handleSelectorClose}
        accountBookId={accountBookId}
        selectedTagIds={selectedTagIds}
        onSelectionChange={onSelectionChange}
        placeholder="搜索或创建标签"
        maxSelection={10}
        allowCreate={true}
        disabled={disabled}
      />
    </div>
  );
};

/**
 * 紧凑版标签推荐组件（重新设计）
 */
interface CompactTagRecommendationV2Props {
  accountBookId: string;
  categoryId?: string;
  description?: string;
  selectedTagIds: string[];
  onTagSelect: (tagId: string) => void;
  maxRecommendations?: number;
}

export const CompactTagRecommendationV2: React.FC<CompactTagRecommendationV2Props> = ({
  accountBookId,
  categoryId,
  description,
  selectedTagIds,
  onTagSelect,
  maxRecommendations = 4,
}) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!accountBookId) return;

      setIsLoading(true);
      try {
        const response = await tagApi.getTagRecommendations({
          accountBookId,
          categoryId,
          description,
          limit: maxRecommendations,
        });

        if (response.success) {
          // 过滤掉已选择的标签
          const filtered = response.data.filter((rec) => !selectedTagIds.includes(rec.tag.id));
          setRecommendations(filtered.slice(0, maxRecommendations));
        }
      } catch (err) {
        console.error('获取标签推荐失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchRecommendations, 300);
    return () => clearTimeout(timer);
  }, [accountBookId, categoryId, description, selectedTagIds, maxRecommendations]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="text-sm text-gray-500">分析中...</span>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return <div className="text-sm text-gray-500 py-2">暂无推荐标签</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {recommendations.map((recommendation) => (
        <button
          key={recommendation.tag.id}
          type="button"
          onClick={() => onTagSelect(recommendation.tag.id)}
          className="inline-flex items-center gap-2 px-3 py-2 border-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm min-h-[40px]"
          style={{
            background: `linear-gradient(to right, var(--primary-color-light), rgba(var(--primary-rgb), 0.08))`,
            borderColor: 'var(--primary-color)',
            color: 'var(--primary-color)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `linear-gradient(to right, rgba(var(--primary-rgb), 0.15), rgba(var(--primary-rgb), 0.12))`;
            e.currentTarget.style.borderColor = 'var(--primary-color-dark)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = 'var(--card-shadow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `linear-gradient(to right, var(--primary-color-light), rgba(var(--primary-rgb), 0.08))`;
            e.currentTarget.style.borderColor = 'var(--primary-color)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border"
            style={{
              backgroundColor: recommendation.tag.color,
              borderColor: 'var(--card-background)',
            }}
          />
          <span className="whitespace-nowrap">{recommendation.tag.name}</span>
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <Plus className="w-2.5 h-2.5" style={{ color: 'var(--primary-foreground)' }} />
          </div>
        </button>
      ))}
    </div>
  );
};

export default MobileTagSection;
