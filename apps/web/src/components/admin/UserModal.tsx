'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useUserManagement } from '@/store/admin/useUserManagement';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  isActive: boolean;
  dailyLlmTokenLimit?: number | null;
}

interface UserModalProps {
  user?: User | null;
  onClose: () => void;
}

export function UserModal({ user, onClose }: UserModalProps) {
  const { createUser, updateUser } = useUserManagement();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    bio: '',
    dailyLlmTokenLimit: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 编辑模式下初始化表单数据
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        bio: user.bio || '',
        dailyLlmTokenLimit: user.dailyLlmTokenLimit?.toString() || '',
      });
    }
  }, [user]);

  // 表单验证
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '姓名不能为空';
    } else if (formData.name.length > 50) {
      newErrors.name = '姓名长度不能超过50个字符';
    }

    if (!formData.email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    } else if (formData.email.length > 100) {
      newErrors.email = '邮箱长度不能超过100个字符';
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = '密码不能为空';
    } else if (!user && formData.password.length < 6) {
      newErrors.password = '密码长度至少6个字符';
    } else if (!user && formData.password.length > 50) {
      newErrors.password = '密码长度不能超过50个字符';
    }

    if (formData.bio && formData.bio.length > 200) {
      newErrors.bio = '个人简介长度不能超过200个字符';
    }

    // 验证Token限额
    if (formData.dailyLlmTokenLimit.trim()) {
      const tokenLimit = parseInt(formData.dailyLlmTokenLimit);
      if (isNaN(tokenLimit)) {
        newErrors.dailyLlmTokenLimit = 'Token限额必须是数字';
      } else if (tokenLimit < 0) {
        newErrors.dailyLlmTokenLimit = 'Token限额不能为负数';
      } else if (tokenLimit > 1000000) {
        newErrors.dailyLlmTokenLimit = 'Token限额不能超过1,000,000';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let success = false;
      
      if (user) {
        // 编辑用户
        const updateData: any = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          bio: formData.bio.trim() || undefined,
        };
        
        // 处理Token限额
        if (formData.dailyLlmTokenLimit.trim()) {
          updateData.dailyLlmTokenLimit = parseInt(formData.dailyLlmTokenLimit);
        } else {
          updateData.dailyLlmTokenLimit = null; // 空值表示使用全局限额
        }
        
        success = await updateUser(user.id, updateData);
      } else {
        // 创建用户
        const createData: any = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          bio: formData.bio.trim() || undefined,
        };
        
        // 处理Token限额
        if (formData.dailyLlmTokenLimit.trim()) {
          createData.dailyLlmTokenLimit = parseInt(formData.dailyLlmTokenLimit);
        }
        
        success = await createUser(createData);
      }

      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('操作用户失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 输入框变更处理
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {user ? '编辑用户' : '创建用户'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 姓名 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入姓名"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* 邮箱 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入邮箱"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* 密码（仅创建时显示） */}
          {!user && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入密码"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          )}

          {/* 个人简介 */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              个人简介
            </label>
            <textarea
              id="bio"
              rows={3}
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.bio ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入个人简介（可选）"
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-600">{errors.bio}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.bio.length}/200
            </p>
          </div>

          {/* Token限额 */}
          <div>
            <label htmlFor="dailyLlmTokenLimit" className="block text-sm font-medium text-gray-700 mb-1">
              每日LLM Token限额
            </label>
            <input
              type="number"
              id="dailyLlmTokenLimit"
              value={formData.dailyLlmTokenLimit}
              onChange={(e) => handleInputChange('dailyLlmTokenLimit', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.dailyLlmTokenLimit ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="留空使用全局限额"
              min="0"
              max="1000000"
            />
            {errors.dailyLlmTokenLimit && (
              <p className="mt-1 text-sm text-red-600">{errors.dailyLlmTokenLimit}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              留空将使用全局限额。优先级：用户个人限额 → 全局限额
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '处理中...' : (user ? '更新' : '创建')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 