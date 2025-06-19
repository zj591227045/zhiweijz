'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { TagResponseDto, CreateTagDto, DEFAULT_TAG_COLORS } from '@/lib/api/types/tag.types';
import { tagApi } from '@/lib/api/tag-api';
import { Search, Plus, X, Check } from 'lucide-react';
import { TagDisplay } from './tag-display';
import { SimpleColorPicker } from './color-picker';

interface TagSelectorProps {
  accountBookId: string;
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  placeholder?: string;
  maxSelection?: number;
  allowCreate?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  disabled?: boolean;
}

/**
 * 标签选择器组件
 * 支持多选、搜索、快速创建等功能
 */
export const TagSelector: React.FC<TagSelectorProps> = ({
  accountBookId,
  selectedTagIds,
  onSelectionChange,
  placeholder = "选择标签",
  maxSelection,
  allowCreate = true,
  size = 'medium',
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tags, setTags] = useState<TagResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 获取标签列表
  const fetchTags = async () => {
    if (!accountBookId) return;
    
    setLoading(true);
    try {
      const response = await tagApi.getTags({
        accountBookId,
        search: searchTerm,
        isActive: true,
        sortBy: 'usage',
        sortOrder: 'desc',
        limit: 50,
      });
      setTags(response.data.tags);
    } catch (error) {
      console.error('获取标签列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和搜索变化时重新获取
  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [accountBookId, searchTerm, isOpen]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 打开下拉框时聚焦搜索框
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // 过滤和排序标签
  const filteredTags = useMemo(() => {
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tags, searchTerm]);

  // 获取已选择的标签
  const selectedTags = useMemo(() => {
    return tags.filter(tag => selectedTagIds.includes(tag.id));
  }, [tags, selectedTagIds]);

  // 处理标签选择
  const handleTagToggle = (tagId: string) => {
    const isSelected = selectedTagIds.includes(tagId);
    let newSelectedIds: string[];

    if (isSelected) {
      newSelectedIds = selectedTagIds.filter(id => id !== tagId);
    } else {
      if (maxSelection && selectedTagIds.length >= maxSelection) {
        return; // 达到最大选择数量
      }
      newSelectedIds = [...selectedTagIds, tagId];
    }

    onSelectionChange(newSelectedIds);
  };

  // 移除已选择的标签
  const handleRemoveTag = (tagId: string) => {
    const newSelectedIds = selectedTagIds.filter(id => id !== tagId);
    onSelectionChange(newSelectedIds);
  };

  // 创建新标签
  const handleCreateTag = async () => {
    if (!newTagName.trim() || creating) return;

    setCreating(true);
    try {
      const createData: CreateTagDto = {
        name: newTagName.trim(),
        color: newTagColor,
        accountBookId,
      };

      const response = await tagApi.createTag(createData);
      const newTag = response.data;

      // 添加到标签列表
      setTags(prev => [newTag, ...prev]);
      
      // 自动选择新创建的标签
      onSelectionChange([...selectedTagIds, newTag.id]);

      // 重置创建表单
      setNewTagName('');
      setNewTagColor(DEFAULT_TAG_COLORS[0]);
      setShowCreateForm(false);
      setSearchTerm('');
    } catch (error) {
      console.error('创建标签失败:', error);
    } finally {
      setCreating(false);
    }
  };

  // 检查是否可以创建新标签
  const canCreateTag = allowCreate && searchTerm.trim() && 
    !filteredTags.some(tag => tag.name.toLowerCase() === searchTerm.toLowerCase());

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* 选择器触发区域 */}
      <div
        className={cn(
          'min-h-10 w-full border border-gray-300 rounded-md bg-white px-3 py-2 cursor-pointer transition-colors',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
          isOpen && 'ring-2 ring-blue-500 border-blue-500'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedTags.length > 0 ? (
          <TagDisplay
            tags={selectedTags}
            size={size}
            maxDisplay={3}
            showRemove
            onRemove={(tag) => handleRemoveTag(tag.id)}
            className="min-h-6"
          />
        ) : (
          <span className="text-gray-500 text-sm">{placeholder}</span>
        )}
      </div>

      {/* 下拉选择框 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] max-h-80 overflow-hidden">
          {/* 搜索框 */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索标签..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 标签列表 */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-sm">加载中...</p>
              </div>
            ) : filteredTags.length > 0 ? (
              <div className="p-2">
                {filteredTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  const isDisabled = !isSelected && maxSelection && selectedTagIds.length >= maxSelection;
                  
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center space-x-3 p-2 rounded-md transition-colors text-left',
                        isSelected && 'bg-blue-50 text-blue-700',
                        !isSelected && !isDisabled && 'hover:bg-gray-50',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => !isDisabled && handleTagToggle(tag.id)}
                      disabled={isDisabled}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 truncate">{tag.name}</span>
                      <span className="text-xs text-gray-500">({tag.usageCount})</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">
                  {searchTerm ? '未找到匹配的标签' : '暂无标签'}
                </p>
              </div>
            )}
          </div>

          {/* 创建新标签 */}
          {allowCreate && (
            <div className="border-t border-gray-200">
              {showCreateForm ? (
                <div className="p-3 space-y-3">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="标签名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={50}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择颜色
                    </label>
                    <SimpleColorPicker
                      value={newTagColor}
                      onChange={setNewTagColor}
                      size="small"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || creating}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creating ? '创建中...' : '创建'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewTagName('');
                        setNewTagColor(DEFAULT_TAG_COLORS[0]);
                      }}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(true);
                    setNewTagName(searchTerm);
                  }}
                  className="w-full flex items-center space-x-2 p-3 text-blue-600 hover:bg-blue-50 transition-colors"
                  disabled={!canCreateTag}
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {canCreateTag ? `创建标签 "${searchTerm}"` : '创建新标签'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 移动端标签选择器（底部弹出）
 */
interface MobileTagSelectorProps extends Omit<TagSelectorProps, 'className'> {
  isOpen: boolean;
  onClose: () => void;
  position?: 'bottom' | 'center'; // 新增：控制模态框位置
}

export const MobileTagSelector: React.FC<MobileTagSelectorProps> = ({
  isOpen,
  onClose,
  accountBookId,
  selectedTagIds,
  onSelectionChange,
  placeholder = "搜索标签",
  maxSelection,
  allowCreate = true,
  disabled = false,
  position = 'bottom', // 默认底部弹出
}) => {
  console.log('MobileTagSelector 渲染，isOpen:', isOpen, 'position:', position);
  const [isClosing, setIsClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tags, setTags] = useState<TagResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // 获取标签列表
  const fetchTags = async () => {
    if (!accountBookId) return;

    setLoading(true);
    try {
      const response = await tagApi.getTags({
        accountBookId,
        search: searchTerm,
        isActive: true,
        sortBy: 'usage',
        sortOrder: 'desc',
        limit: 50,
      });
      setTags(response.data.tags);
    } catch (error) {
      console.error('获取标签列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新标签
  const handleCreateTag = async () => {
    if (!newTagName.trim() || creating) return;

    setCreating(true);
    try {
      const response = await tagApi.createTag({
        name: newTagName.trim(),
        color: newTagColor,
        accountBookId,
      });

      if (response.success) {
        // 添加到标签列表
        setTags(prev => [response.data, ...prev]);

        // 自动选择新创建的标签
        if (!selectedTagIds.includes(response.data.id)) {
          onSelectionChange([...selectedTagIds, response.data.id]);
        }

        // 重置创建表单
        setNewTagName('');
        setNewTagColor(DEFAULT_TAG_COLORS[0]);
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('创建标签失败:', error);
    } finally {
      setCreating(false);
    }
  };

  // 处理标签选择
  const handleTagToggle = (tagId: string) => {
    const isSelected = selectedTagIds.includes(tagId);
    let newSelectedIds: string[];

    if (isSelected) {
      newSelectedIds = selectedTagIds.filter(id => id !== tagId);
    } else {
      if (maxSelection && selectedTagIds.length >= maxSelection) {
        return; // 达到最大选择数量
      }
      newSelectedIds = [...selectedTagIds, tagId];
    }

    onSelectionChange(newSelectedIds);
  };

  // 初始加载和搜索变化时重新获取
  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [accountBookId, searchTerm, isOpen]);

  // 过滤标签
  const filteredTags = useMemo(() => {
    return tags.filter(tag =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tags, searchTerm]);

  // 检查是否可以创建新标签
  const canCreateTag = allowCreate && searchTerm.trim() &&
    !filteredTags.some(tag => tag.name.toLowerCase() === searchTerm.toLowerCase());

  // 处理关闭动画
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // 动画持续时间
  };

  if (!isOpen && !isClosing) return null;

  // 使用Portal渲染到body，避免父容器的层级限制
  const modalContent = (
    <div className="tag-selector-container fixed inset-0" style={{ zIndex: 200 }}>
      {/* 背景遮罩 - 增强模糊效果和视觉区分 */}
      <div
        className="tag-selector-backdrop transition-all duration-300"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 200,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          willChange: 'backdrop-filter'
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('背景点击，关闭模态框');
          handleClose();
        }}
      />

      {/* 模态框内容 - 根据position决定样式 */}
      <div
        className={position === 'center' ? 'rounded-3xl' : 'rounded-t-3xl'}
        style={{
          position: 'absolute',
          ...(position === 'center' ? {
            top: '10vh',
            left: '5vw',
            right: '5vw',
            width: 'auto',
            maxWidth: '500px',
            height: 'auto',
            maxHeight: '80vh',
            minHeight: '400px',
            margin: '0 auto',
            animation: isClosing ? 'fadeOut 0.3s ease-in' : 'fadeIn 0.3s ease-out'
          } : {
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '95vw',
            minHeight: '40vh',
            maxHeight: '80vh',
            animation: isClosing ? 'slideDownToBottom 0.3s ease-in' : 'slideUpFromBottom 0.3s ease-out'
          }),
          backgroundColor: 'var(--card-background)',
          boxShadow: `0 -10px 25px -5px rgba(0, 0, 0, 0.1),
                     0 -4px 6px -2px rgba(0, 0, 0, 0.05),
                     0 0 0 1px var(--primary-color),
                     0 0 20px rgba(var(--primary-rgb), 0.15)`,
          zIndex: 210, // 模态框标准层级
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* 拖拽指示器 - 只在底部弹出时显示 */}
        {position === 'bottom' && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
          </div>
        )}

        {/* 头部 - 压缩内边距 */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
             style={{
               borderBottom: `1px solid var(--border-color)`,
               background: `linear-gradient(to right, var(--primary-color-light), rgba(var(--primary-rgb), 0.08))`
             }}>
          <h3 className="text-lg font-semibold flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}>
            <div className="w-1.5 h-1.5 rounded-full"
                 style={{ backgroundColor: 'var(--primary-color)' }}></div>
            选择标签
          </h3>
          <div className="flex items-center gap-2">
            {selectedTagIds.length > 0 && (
              <span className="text-xs font-medium px-2 py-1 rounded-full border"
                    style={{
                      color: 'var(--primary-color)',
                      backgroundColor: 'var(--primary-color-light)',
                      borderColor: 'var(--primary-color)'
                    }}>
                已选 {selectedTagIds.length}
              </span>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-full transition-all duration-200"
              style={{
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--card-background)';
                e.currentTarget.style.boxShadow = 'var(--card-shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 搜索框 - 压缩高度 */}
        <div className="px-4 py-2 flex-shrink-0"
             style={{
               borderBottom: `1px solid var(--border-color)`,
               backgroundColor: 'var(--background-secondary)'
             }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm shadow-sm transition-all duration-200"
              style={{
                border: `1px solid var(--border-color)`,
                backgroundColor: 'var(--card-background)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary-color)';
                e.target.style.boxShadow = `0 0 0 2px var(--primary-color-light)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.boxShadow = 'var(--card-shadow)';
              }}
              disabled={disabled}
            />
          </div>
        </div>

        {/* 标签列表 - 最大化内容区域 */}
        <div className="flex-1 overflow-y-auto min-h-0"
             style={{ backgroundColor: 'var(--card-background)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 rounded-full"
                   style={{
                     borderColor: 'var(--primary-color)',
                     borderTopColor: 'transparent'
                   }}></div>
              <span className="mt-2 text-sm"
                    style={{ color: 'var(--text-secondary)' }}>加载中...</span>
            </div>
          ) : (
            <div className="p-4">
              {/* 标签网格布局 - 贴纸样式，优化密度 */}
              <div className="flex flex-wrap gap-2.5">
                {filteredTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  const isDisabled = disabled || (maxSelection && !isSelected && selectedTagIds.length >= maxSelection);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 text-sm font-medium shadow-sm border-2 min-h-[40px]',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--primary-color)'
                          : isDisabled
                            ? 'var(--background-secondary)'
                            : 'var(--card-background)',
                        color: isSelected
                          ? 'var(--primary-foreground)'
                          : isDisabled
                            ? 'var(--text-secondary)'
                            : 'var(--text-primary)',
                        borderColor: isSelected
                          ? 'var(--primary-color)'
                          : isDisabled
                            ? 'var(--border-color)'
                            : 'var(--border-color)',
                        boxShadow: isSelected ? 'var(--card-shadow)' : undefined,
                        transform: isSelected ? 'scale(1.05)' : undefined
                      }}
                      onMouseEnter={(e) => {
                        if (!isDisabled && !isSelected) {
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                          e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDisabled && !isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                      onClick={() => !isDisabled && handleTagToggle(tag.id)}
                      disabled={isDisabled}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border"
                        style={{
                          backgroundColor: tag.color,
                          borderColor: isSelected ? 'var(--primary-foreground)' : 'var(--border-color)'
                        }}
                      />
                      <span className="whitespace-nowrap text-sm">{tag.name}</span>
                      {/* 使用次数徽章 - 显示该标签被使用的交易记录数量 */}
                      <span className="text-xs px-1 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'var(--background-secondary)',
                        color: isSelected
                          ? 'var(--primary-foreground)'
                          : 'var(--text-secondary)'
                      }}
                      title={`该标签已被使用 ${tag.usageCount} 次`}>
                        {tag.usageCount}
                      </span>
                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                             style={{
                               backgroundColor: 'rgba(255, 255, 255, 0.2)'
                             }}>
                          <Check className="w-2.5 h-2.5"
                                 style={{ color: 'var(--primary-foreground)' }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 创建新标签选项 - 贴纸样式 */}
              {canCreateTag && (
                <button
                  type="button"
                  onClick={() => {
                    setNewTagName(searchTerm.trim()); // 自动填充搜索值
                    setShowCreateForm(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 text-sm font-medium shadow-sm border-2 border-dashed min-h-[40px]"
                  style={{
                    borderColor: 'var(--primary-color)',
                    backgroundColor: 'var(--primary-color-light)',
                    color: 'var(--primary-color)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-color-light)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-color-light)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  disabled={!canCreateTag}
                >
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: 'var(--primary-color)' }}>
                    <Plus className="w-2.5 h-2.5"
                          style={{ color: 'var(--primary-foreground)' }} />
                  </div>
                  <span className="whitespace-nowrap text-sm">
                    创建 "{searchTerm}"
                  </span>
                </button>
              )}

              {filteredTags.length === 0 && !canCreateTag && !loading && (
                <div className="text-center py-8 w-full"
                     style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                       style={{ backgroundColor: 'var(--background-secondary)' }}>
                    <Search className="w-6 h-6"
                            style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <p className="text-base font-medium"
                     style={{ color: 'var(--text-primary)' }}>未找到相关标签</p>
                  {allowCreate && (
                    <p className="text-sm mt-1"
                       style={{ color: 'var(--text-secondary)' }}>输入名称创建新标签</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 创建标签表单 - 压缩样式 */}
        {showCreateForm && (
          <div className="p-4 flex-shrink-0"
               style={{
                 borderTop: `1px solid var(--border-color)`,
                 background: `linear-gradient(to right, var(--background-secondary), var(--primary-color-light))`
               }}>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1"
                       style={{ color: 'var(--text-primary)' }}>
                  标签名称
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="输入标签名称"
                  className="w-full px-3 py-2 rounded-lg text-sm shadow-sm transition-all duration-200"
                  style={{
                    border: `1px solid var(--border-color)`,
                    backgroundColor: 'var(--card-background)',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-color)';
                    e.target.style.boxShadow = `0 0 0 2px var(--primary-color-light)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'var(--card-shadow)';
                  }}
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2"
                       style={{ color: 'var(--text-primary)' }}>
                  选择颜色
                </label>
                <div className="p-2 rounded-lg border"
                     style={{
                       backgroundColor: 'var(--card-background)',
                       borderColor: 'var(--border-color)'
                     }}>
                  <SimpleColorPicker
                    value={newTagColor}
                    onChange={setNewTagColor}
                    colors={DEFAULT_TAG_COLORS}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm text-sm border"
                  style={{
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--card-background)',
                    borderColor: 'var(--border-color)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--background-hover)';
                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-background)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                  disabled={creating}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || creating}
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md text-sm"
                  style={{
                    backgroundColor: 'var(--primary-color)',
                    color: 'var(--primary-foreground)',
                    opacity: (!newTagName.trim() || creating) ? 0.5 : 1,
                    cursor: (!newTagName.trim() || creating) ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!(!newTagName.trim() || creating)) {
                      e.currentTarget.style.backgroundColor = 'var(--primary-color-dark)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(!newTagName.trim() || creating)) {
                      e.currentTarget.style.backgroundColor = 'var(--primary-color)';
                    }
                  }}
                >
                  {creating ? '创建中...' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 使用Portal渲染到document.body
  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default TagSelector;
