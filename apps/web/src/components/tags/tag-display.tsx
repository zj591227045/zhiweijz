'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import { X } from 'lucide-react';

interface TagDisplayProps {
  tags: TagResponseDto[];
  size?: 'small' | 'medium' | 'large';
  maxDisplay?: number;
  onClick?: (tag: TagResponseDto) => void;
  onRemove?: (tag: TagResponseDto) => void;
  showRemove?: boolean;
  className?: string;
  interactive?: boolean;
}

/**
 * 标签显示组件
 * 用于在各种场景下显示标签列表
 */
export const TagDisplay: React.FC<TagDisplayProps> = ({
  tags,
  size = 'medium',
  maxDisplay = 3,
  onClick,
  onRemove,
  showRemove = false,
  className,
  interactive = false,
}) => {
  // 如果没有标签，不渲染任何内容
  if (!tags || tags.length === 0) {
    return null;
  }

  // 计算显示的标签和剩余数量
  const displayTags = maxDisplay > 0 ? tags.slice(0, maxDisplay) : tags;
  const remainingCount = maxDisplay > 0 && tags.length > maxDisplay ? tags.length - maxDisplay : 0;

  // 根据尺寸获取样式类
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-1 text-xs';
      case 'large':
        return 'px-4 py-2 text-sm';
      default:
        return 'px-3 py-1.5 text-xs';
    }
  };

  // 获取文本颜色（根据背景色自动计算）
  const getTextColor = (backgroundColor: string): string => {
    // 移除 # 号
    const hex = backgroundColor.replace('#', '');
    
    // 转换为 RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 计算亮度
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // 根据亮度返回黑色或白色文本
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };

  // 处理标签点击
  const handleTagClick = (tag: TagResponseDto, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClick) {
      onClick(tag);
    }
  };

  // 处理移除按钮点击
  const handleRemoveClick = (tag: TagResponseDto, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onRemove) {
      onRemove(tag);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {displayTags.map((tag) => (
        <span
          key={tag.id}
          className={cn(
            'inline-flex items-center rounded-full font-medium transition-all duration-200',
            getSizeClasses(),
            interactive && 'cursor-pointer hover:scale-105 hover:shadow-sm',
            onClick && 'cursor-pointer'
          )}
          style={{
            backgroundColor: tag.color,
            color: getTextColor(tag.color),
          }}
          onClick={(e) => handleTagClick(tag, e)}
          title={tag.description || tag.name}
        >
          <span className="truncate max-w-20">{tag.name}</span>
          {showRemove && onRemove && (
            <button
              type="button"
              className={cn(
                'ml-1 rounded-full hover:bg-black/10 transition-colors',
                size === 'small' ? 'p-0.5' : 'p-1'
              )}
              onClick={(e) => handleRemoveClick(tag, e)}
              aria-label={`移除标签 ${tag.name}`}
            >
              <X className={cn(size === 'small' ? 'h-2 w-2' : 'h-3 w-3')} />
            </button>
          )}
        </span>
      ))}
      
      {remainingCount > 0 && (
        <span
          className={cn(
            'inline-flex items-center rounded-full bg-gray-100 text-gray-600 font-medium',
            getSizeClasses(),
            interactive && 'cursor-pointer hover:bg-gray-200'
          )}
          title={`还有 ${remainingCount} 个标签`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

/**
 * 单个标签徽章组件
 */
interface TagBadgeProps {
  tag: TagResponseDto;
  size?: 'small' | 'medium' | 'large';
  onClick?: (tag: TagResponseDto) => void;
  onRemove?: (tag: TagResponseDto) => void;
  showRemove?: boolean;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'medium',
  onClick,
  onRemove,
  showRemove = false,
  className,
}) => {
  return (
    <TagDisplay
      tags={[tag]}
      size={size}
      maxDisplay={1}
      onClick={onClick}
      onRemove={onRemove}
      showRemove={showRemove}
      className={className}
      interactive={!!onClick}
    />
  );
};

/**
 * 标签列表组件（用于管理页面）
 */
interface TagListProps {
  tags: TagResponseDto[];
  onTagClick?: (tag: TagResponseDto) => void;
  onTagEdit?: (tag: TagResponseDto) => void;
  onTagDelete?: (tag: TagResponseDto) => void;
  className?: string;
}

export const TagList: React.FC<TagListProps> = ({
  tags,
  onTagClick,
  onTagEdit,
  onTagDelete,
  className,
}) => {
  if (!tags || tags.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>暂无标签</p>
        <p className="text-sm mt-1">点击上方按钮创建第一个标签</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div
            className="flex items-center space-x-3 flex-1 cursor-pointer"
            onClick={() => onTagClick?.(tag)}
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900 truncate">{tag.name}</h3>
                <span className="text-sm text-gray-500">({tag.usageCount})</span>
              </div>
              {tag.description && (
                <p className="text-sm text-gray-600 truncate mt-1">{tag.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {onTagEdit && (
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => onTagEdit(tag)}
                aria-label={`编辑标签 ${tag.name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onTagDelete && (
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                onClick={() => onTagDelete(tag)}
                aria-label={`删除标签 ${tag.name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TagDisplay;
