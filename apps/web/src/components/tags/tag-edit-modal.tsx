'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  TagResponseDto,
  CreateTagDto,
  UpdateTagDto,
  TagValidation,
  DEFAULT_TAG_COLORS,
} from '@/lib/api/types/tag.types';
import { ColorPicker } from './color-picker';
import { TagDisplay } from './tag-display';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TagEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag?: TagResponseDto | null;
  accountBookId: string;
  onSave: (data: CreateTagDto | UpdateTagDto) => Promise<void>;
}

/**
 * 标签编辑模态框
 * 支持创建和编辑标签
 */
export const TagEditModal: React.FC<TagEditModalProps> = ({
  isOpen,
  onClose,
  tag,
  accountBookId,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    color: DEFAULT_TAG_COLORS[0],
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isEditing = !!tag;

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (tag) {
        setFormData({
          name: tag.name,
          color: tag.color,
          description: tag.description || '',
        });
      } else {
        setFormData({
          name: '',
          color: DEFAULT_TAG_COLORS[0],
          description: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, tag]);

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 验证名称
    if (!formData.name.trim()) {
      newErrors.name = '标签名称不能为空';
    } else if (formData.name.length < TagValidation.name.minLength) {
      newErrors.name = `标签名称至少需要 ${TagValidation.name.minLength} 个字符`;
    } else if (formData.name.length > TagValidation.name.maxLength) {
      newErrors.name = `标签名称不能超过 ${TagValidation.name.maxLength} 个字符`;
    } else if (!TagValidation.name.pattern.test(formData.name)) {
      newErrors.name = '标签名称只能包含中文、英文、数字、空格、连字符和下划线';
    }

    // 验证颜色
    if (!TagValidation.color.pattern.test(formData.color)) {
      newErrors.color = '请选择有效的颜色';
    }

    // 验证描述
    if (formData.description && formData.description.length > TagValidation.description.maxLength) {
      newErrors.description = `描述不能超过 ${TagValidation.description.maxLength} 个字符`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const saveData = isEditing
        ? {
            name: formData.name.trim(),
            color: formData.color,
            description: formData.description.trim() || undefined,
          }
        : {
            name: formData.name.trim(),
            color: formData.color,
            description: formData.description.trim() || undefined,
            accountBookId,
          };

      await onSave(saveData);
      onClose();
    } catch (error) {
      console.error('保存标签失败:', error);
      setErrors({
        submit: error instanceof Error ? error.message : '保存失败，请重试',
      });
    } finally {
      setSaving(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // 清除对应字段的错误
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // 如果模态框未打开，不渲染
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* 模态框内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {isEditing ? '编辑标签' : '创建标签'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 表单内容 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 标签名称 */}
            <div>
              <label htmlFor="tag-name" className="block text-sm font-medium text-gray-700 mb-2">
                标签名称 <span className="text-red-500">*</span>
              </label>
              <Input
                id="tag-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="请输入标签名称"
                maxLength={TagValidation.name.maxLength}
                className={cn(errors.name && 'border-red-500')}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              <p className="mt-1 text-xs text-gray-500">
                {formData.name.length}/{TagValidation.name.maxLength}
              </p>
            </div>

            {/* 标签颜色 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签颜色 <span className="text-red-500">*</span>
              </label>
              <ColorPicker
                value={formData.color}
                onChange={(color) => handleInputChange('color', color)}
                className={cn(errors.color && 'border-red-500')}
              />
              {errors.color && <p className="mt-1 text-sm text-red-600">{errors.color}</p>}
            </div>

            {/* 标签描述 */}
            <div>
              <label
                htmlFor="tag-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                描述 (可选)
              </label>
              <textarea
                id="tag-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="请输入标签描述"
                rows={3}
                maxLength={TagValidation.description.maxLength}
                className={cn(
                  'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none',
                  errors.description && 'border-red-500',
                )}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/{TagValidation.description.maxLength}
              </p>
            </div>

            {/* 预览 */}
            {formData.name && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">预览效果</label>
                <TagDisplay
                  tags={[
                    {
                      id: 'preview',
                      name: formData.name,
                      color: formData.color,
                      description: formData.description,
                      accountBookId,
                      createdBy: '',
                      isActive: true,
                      usageCount: 0,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  ]}
                  size="medium"
                />
              </div>
            )}

            {/* 错误信息 */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={saving}
              >
                取消
              </Button>
              <Button type="submit" className="flex-1" disabled={saving || !formData.name.trim()}>
                {saving ? '保存中...' : isEditing ? '更新' : '创建'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TagEditModal;
