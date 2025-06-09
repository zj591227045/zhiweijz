'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// 使用FontAwesome图标，不需要导入
import { TransactionType } from '@/types';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { toast } from 'sonner';
import { getIconClass } from '@/lib/utils';

// 可用的分类图标 - 与编辑模态框保持一致
const availableIcons = [
  'restaurant', 'shopping', 'daily', 'transport', 'sports', 'entertainment',
  'clothing', 'clinic', 'beauty', 'housing', 'communication', 'electronics',
  'social', 'travel', 'digital', 'car', 'medical', 'reading',
  'investment', 'education', 'office', 'repair', 'insurance', 'salary',
  'part-time', 'investment-income', 'bonus', 'commission', 'other'
];

// 预设颜色 - 与编辑模态框保持一致
const presetColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

// 分离使用 useSearchParams 的组件
function NewCategoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createCategory, isLoading } = useCategoryStore();
  const { currentAccountBook } = useAccountBookStore();

  // 检测主题模式
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
                     document.documentElement.getAttribute('data-theme') === 'dark' ||
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };

    checkTheme();

    // 监听主题变化
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    type: (searchParams.get('type') as TransactionType) || TransactionType.EXPENSE,
    icon: 'restaurant', // 使用第一个图标作为默认值
    color: '#FF6B6B', // 使用第一个预设颜色作为默认值
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '分类名称不能为空';
    } else if (formData.name.trim().length > 20) {
      newErrors.name = '分类名称不能超过20个字符';
    }

    if (!formData.type) {
      newErrors.type = '请选择分类类型';
    }

    if (!formData.icon) {
      newErrors.icon = '请选择分类图标';
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

    try {
      if (!currentAccountBook?.id) {
        toast.error('请先选择账本');
        return;
      }

      const success = await createCategory({
        name: formData.name.trim(),
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        accountBookId: currentAccountBook.id,
      });

      if (success) {
        toast.success('分类创建成功');
        router.push('/settings/categories');
      }
    } catch (error) {
      console.error('创建分类失败:', error);
      toast.error('创建分类失败');
    }
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
        paddingBottom: '24px'
      }}
    >
      <PageContainer title="添加分类" showBack onBack={() => router.push('/settings/categories')}>
        <div
          className="max-w-2xl mx-auto p-4"
          style={{
            backgroundColor: isDarkMode ? '#111827' : '#f9fafb'
          }}
        >
          {/* 页面标题卡片 */}
          <div
            style={{
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '16px',
              boxShadow: isDarkMode ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            <h1
              style={{
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                fontSize: '20px',
                fontWeight: '600',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-palette" />
              创建新分类
            </h1>
          </div>
          <form onSubmit={handleSubmit}>
            {/* 分类类型选择器 */}
            <div
              style={{
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: isDarkMode ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <label
                style={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '12px',
                  display: 'block'
                }}
              >
                分类类型
              </label>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                  borderRadius: '12px',
                  padding: '4px',
                  gap: '4px'
                }}
                role="radiogroup"
                aria-label="选择分类类型"
              >
                <button
                  type="button"
                  onClick={() => handleInputChange('type', TransactionType.EXPENSE)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: formData.type === TransactionType.EXPENSE
                      ? '#3b82f6'
                      : 'transparent',
                    color: formData.type === TransactionType.EXPENSE
                      ? 'white'
                      : isDarkMode ? '#f3f4f6' : '#1f2937'
                  }}
                  role="radio"
                  aria-checked={formData.type === TransactionType.EXPENSE}
                  aria-label="支出分类"
                >
                  支出
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('type', TransactionType.INCOME)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: formData.type === TransactionType.INCOME
                      ? '#3b82f6'
                      : 'transparent',
                    color: formData.type === TransactionType.INCOME
                      ? 'white'
                      : isDarkMode ? '#f3f4f6' : '#1f2937'
                  }}
                  role="radio"
                  aria-checked={formData.type === TransactionType.INCOME}
                  aria-label="收入分类"
                >
                  收入
                </button>
              </div>
              {errors.type && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                  {errors.type}
                </p>
              )}
            </div>

            {/* 基本信息表单 */}
            <div
              style={{
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: isDarkMode ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <label
                htmlFor="name"
                style={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '12px',
                  display: 'block'
                }}
              >
                分类名称 *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="输入分类名称"
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  border: 'none',
                  borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = isDarkMode ? '#4b5563' : '#e5e7eb';
                }}
              />
              {errors.name && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* 图标选择器 */}
            <div
              style={{
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: isDarkMode ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <label
                style={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '12px',
                  display: 'block'
                }}
              >
                分类图标 *
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                  borderRadius: '12px',
                  maxHeight: '240px',
                  overflowY: 'auto'
                }}
                role="radiogroup"
                aria-label="选择分类图标"
              >
                {availableIcons.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => handleInputChange('icon', iconName)}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: formData.icon === iconName
                        ? '2px solid #3b82f6'
                        : isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
                      backgroundColor: formData.icon === iconName
                        ? '#3b82f6'
                        : isDarkMode ? '#1f2937' : '#ffffff',
                      color: formData.icon === iconName
                        ? 'white'
                        : isDarkMode ? '#f3f4f6' : '#1f2937',
                      fontSize: '20px',
                      transition: 'all 0.2s ease'
                    }}
                    role="radio"
                    aria-checked={formData.icon === iconName}
                    aria-label={`图标 ${iconName}`}
                    title={`选择 ${iconName} 图标`}
                  >
                    <i className={getIconClass(iconName)} aria-hidden="true" />
                  </button>
                ))}
              </div>
              {errors.icon && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                  {errors.icon}
                </p>
              )}
            </div>

            {/* 颜色选择器 */}
            <div
              style={{
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: isDarkMode ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <label
                style={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '12px',
                  display: 'block'
                }}
              >
                分类颜色
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                  borderRadius: '12px'
                }}
                role="radiogroup"
                aria-label="选择分类颜色"
              >
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleInputChange('color', color)}
                    style={{
                      backgroundColor: color,
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: formData.color === color
                        ? isDarkMode ? '3px solid #f3f4f6' : '3px solid #1f2937'
                        : '3px solid transparent',
                      position: 'relative',
                      boxShadow: isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease',
                      transform: formData.color === color ? 'scale(1.1)' : 'scale(1)'
                    }}
                    role="radio"
                    aria-checked={formData.color === color}
                    aria-label={`颜色 ${color}`}
                    title={`选择颜色 ${color}`}
                  >
                    {formData.color === color && (
                      <span style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                      }}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 实时预览组件 */}
            <div
              style={{
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: isDarkMode ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <label
                style={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '12px',
                  display: 'block'
                }}
              >
                预览效果
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                  borderRadius: '12px'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: formData.color,
                    color: 'white',
                    fontSize: '20px'
                  }}
                >
                  <i className={getIconClass(formData.icon)} aria-hidden="true" />
                </div>
                <div>
                  <div
                    style={{
                      color: isDarkMode ? '#f3f4f6' : '#1f2937',
                      fontSize: '16px',
                      fontWeight: '500',
                      marginBottom: '4px'
                    }}
                  >
                    {formData.name || '分类名称'}
                  </div>
                  <div
                    style={{
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      fontSize: '14px'
                    }}
                  >
                    {formData.type === TransactionType.EXPENSE ? '支出分类' : '收入分类'}
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => router.push('/settings/categories')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#1f2937' : '#ffffff';
                }}
              >
                <i className="fas fa-arrow-left" />
                取消
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" />
                    创建分类
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </PageContainer>
    </div>
  );
}

// 主页面组件，用 Suspense 包装
export default function NewCategoryPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
          <PageContainer title="添加分类" showBack>
            <div className="max-w-2xl mx-auto p-4">
              {/* 页面标题卡片 */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '16px',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <h1
                  style={{
                    color: '#1f2937',
                    fontSize: '20px',
                    fontWeight: '600',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-palette" />
                  创建新分类
                </h1>
              </div>

              {/* 加载骨架屏 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 分类类型选择器骨架 */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '80px', marginBottom: '12px' }}></div>
                  <div style={{ height: '48px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}></div>
                </div>

                {/* 基本信息表单骨架 */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '100px', marginBottom: '12px' }}></div>
                  <div style={{ height: '48px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}></div>
                </div>

                {/* 图标选择器骨架 */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', width: '80px', marginBottom: '12px' }}></div>
                  <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} style={{ width: '60px', height: '60px', backgroundColor: '#e5e7eb', borderRadius: '12px' }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PageContainer>
        </div>
      }
    >
      <NewCategoryForm />
    </Suspense>
  );
}
