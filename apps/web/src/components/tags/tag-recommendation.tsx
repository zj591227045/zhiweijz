'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TagDisplay } from './tag-display';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import { tagApi } from '@/lib/api/tag-api';
import { Lightbulb, X, Plus } from 'lucide-react';

interface TagRecommendationProps {
  accountBookId: string;
  categoryId?: string;
  description?: string;
  amount?: number;
  selectedTagIds: string[];
  onTagSelect: (tagId: string) => void;
  onTagDeselect: (tagId: string) => void;
  className?: string;
}

interface TagRecommendation {
  tag: TagResponseDto;
  confidence: number;
  reason: string;
}

/**
 * 智能标签推荐组件
 * 基于历史数据分析推荐相关标签
 */
export const TagRecommendation: React.FC<TagRecommendationProps> = ({
  accountBookId,
  categoryId,
  description,
  amount,
  selectedTagIds,
  onTagSelect,
  onTagDeselect,
  className,
}) => {
  const [recommendations, setRecommendations] = useState<TagRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取标签推荐
  const fetchRecommendations = async () => {
    if (!accountBookId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await tagApi.getTagRecommendations({
        accountBookId,
        categoryId,
        description,
        limit: 10,
      });

      if (response.success) {
        setRecommendations(response.data);
      }
    } catch (err) {
      console.error('获取标签推荐失败:', err);
      setError(err instanceof Error ? err.message : '获取推荐失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 当输入参数变化时重新获取推荐
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendations();
    }, 300); // 防抖

    return () => clearTimeout(timer);
  }, [accountBookId, categoryId, description, amount, selectedTagIds]);

  // 处理标签选择
  const handleTagClick = (tag: TagResponseDto) => {
    if (selectedTagIds.includes(tag.id)) {
      onTagDeselect(tag.id);
    } else {
      onTagSelect(tag.id);
    }
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (!recommendations.length && !isLoading && !error) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 推荐标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-700">智能推荐</span>
          {recommendations.length > 0 && (
            <span className="text-xs text-gray-500">({recommendations.length} 个推荐)</span>
          )}
        </div>

        {recommendations.length > 3 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isExpanded ? '收起' : '展开全部'}
          </button>
        )}
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center space-x-2 py-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-500">分析中...</span>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      {/* 推荐列表 */}
      {recommendations.length > 0 && !isLoading && (
        <div className="space-y-2">
          {(isExpanded ? recommendations : recommendations.slice(0, 3)).map((recommendation) => {
            const isSelected = selectedTagIds.includes(recommendation.tag.id);

            return (
              <div
                key={recommendation.tag.id}
                className={cn(
                  'border rounded-lg p-3 transition-all cursor-pointer',
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                )}
                onClick={() => handleTagClick(recommendation.tag)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <TagDisplay
                      tags={[recommendation.tag]}
                      size="small"
                      className="pointer-events-none"
                    />
                    <div className="flex items-center space-x-1">
                      {isSelected ? (
                        <X className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Plus className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    匹配度: {Math.round(recommendation.confidence * 100)}%
                  </div>
                </div>

                {/* 推荐原因 */}
                <div className="text-xs text-gray-600">💡 {recommendation.reason}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 推荐说明 */}
      {recommendations.length > 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-2">
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>基于您的历史记账习惯智能推荐，点击标签即可快速添加</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 简化版标签推荐（用于移动端或空间受限的场景）
 */
interface CompactTagRecommendationProps {
  accountBookId: string;
  categoryId?: string;
  description?: string;
  selectedTagIds: string[];
  onTagSelect: (tagId: string) => void;
  maxRecommendations?: number;
}

export const CompactTagRecommendation: React.FC<CompactTagRecommendationProps> = ({
  accountBookId,
  categoryId,
  description,
  selectedTagIds,
  onTagSelect,
  maxRecommendations = 3,
}) => {
  const [recommendations, setRecommendations] = useState<TagRecommendation[]>([]);
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
          setRecommendations(response.data.slice(0, maxRecommendations));
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

  if (isLoading || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0" />
      <div className="flex flex-wrap gap-1">
        {recommendations.map((recommendation) => (
          <button
            key={recommendation.tag.id}
            type="button"
            onClick={() => onTagSelect(recommendation.tag.id)}
            className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full hover:bg-yellow-100 transition-colors"
          >
            + {recommendation.tag.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TagRecommendation;
