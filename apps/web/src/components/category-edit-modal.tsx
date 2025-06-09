'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { getIconClass } from '@/lib/utils';

import { toast } from 'sonner';
import './category-edit-modal.css';

interface CategoryEditModalProps {
  categoryId: string | null;
  onClose: () => void;
  onSave: () => void;
}

// 可用的分类图标 - 参考原有编辑页面
const availableIcons = [
  'restaurant', 'shopping', 'daily', 'transport', 'sports', 'entertainment',
  'clothing', 'clinic', 'beauty', 'housing', 'communication', 'electronics',
  'social', 'travel', 'digital', 'car', 'medical', 'reading',
  'investment', 'education', 'office', 'repair', 'insurance', 'salary',
  'part-time', 'investment-income', 'bonus', 'commission', 'other'
];

// 预设颜色 - 参考原有编辑页面
const presetColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export default function CategoryEditModal({
  categoryId,
  onClose,
  onSave
}: CategoryEditModalProps) {


  // 检测主题模式
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
                     document.documentElement.getAttribute('data-theme') === 'dark' ||
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
      console.log('🎨 [CategoryEditModal] 主题检测', {
        isDark,
        classList: Array.from(document.documentElement.classList),
        dataTheme: document.documentElement.getAttribute('data-theme'),
        timestamp: new Date().toISOString()
      });
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

  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const { getCategory, updateCategory } = useCategoryStore();

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
    icon: 'restaurant', // 默认使用第一个图标
    color: '#FF6B6B'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 性能优化：使用 useMemo 缓存计算结果
  const isFormValid = useMemo(() => {
    return formData.name.trim().length > 0;
  }, [formData.name]);

  // 性能优化：使用 useCallback 缓存事件处理函数
  const handleTypeChange = useCallback((type: 'EXPENSE' | 'INCOME') => {
    setFormData(prev => ({ ...prev, type }));
  }, []);

  const handleIconSelect = useCallback((icon: string) => {
    setFormData(prev => ({ ...prev, icon }));
    // 添加触觉反馈（如果支持）
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    setFormData(prev => ({ ...prev, color }));
    // 添加触觉反馈（如果支持）
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除错误状态
    if (error) {
      setError(null);
    }
  }, [error]);

  // 加载分类数据
  useEffect(() => {
    const loadCategoryData = async () => {
      if (!categoryId || categoryId === 'placeholder') {
        setError('无效的分类ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const category = await getCategory(categoryId);
        if (category) {
          setFormData({
            name: category.name,
            type: category.type,
            icon: category.icon || 'restaurant',
            color: category.color || '#FF6B6B'
          });
        } else {
          setError('分类不存在或已被删除');
        }
      } catch (error) {
        console.error('加载分类数据失败:', error);
        setError('加载分类数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (categoryId && isAuthenticated) {
      loadCategoryData();
    }
  }, [categoryId, isAuthenticated, getCategory]);

  // 优化的表单提交处理
  const handleSubmit = useCallback(async () => {
    // 表单验证
    if (!isFormValid) {
      toast.error('请输入分类名称');
      return;
    }

    if (!currentAccountBook) {
      toast.error('请先选择账本');
      return;
    }

    if (!categoryId || categoryId === 'placeholder') {
      toast.error('无效的分类ID');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await updateCategory(categoryId, {
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color
      });

      if (success) {
        // 添加触觉反馈
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        toast.success('分类更新成功');
        onSave();
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      console.error('更新分类失败:', error);
      const errorMessage = error instanceof Error ? error.message : '更新分类失败，请重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isFormValid, currentAccountBook, categoryId, formData, updateCategory, onSave]);

  // 隐藏仪表盘页面的头部，显示编辑分类的头部
  useEffect(() => {
    // 隐藏仪表盘的头部和底部导航
    const appContainer = document.querySelector('.app-container');
    const pageHeader = appContainer?.querySelector('.header');
    const bottomNav = document.querySelector('.bottom-nav');

    if (pageHeader) {
      (pageHeader as HTMLElement).style.display = 'none';
    }
    if (bottomNav) {
      (bottomNav as HTMLElement).style.display = 'none';
    }

    return () => {
      // 恢复显示
      if (pageHeader) {
        (pageHeader as HTMLElement).style.display = '';
      }
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = '';
      }
    };
  }, []);

  // 检查认证状态
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth-token');
  if (!hasToken) {
    return (
      <div className="category-edit-modal">
        <div className="category-edit-modal__container app-container">
          <div className="category-edit-modal__header">
            <button
              className="category-edit-modal__back-button"
              onClick={onClose}
              aria-label="返回"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="category-edit-modal__title">编辑分类</h1>
            <div style={{ width: '40px' }}></div>
          </div>
          <div className="category-edit-modal__content">
            <div className="category-edit-modal__error">
              <i className="fas fa-lock" aria-hidden="true"></i>
              <span>请先登录账户</span>
            </div>
            <div className="category-edit-modal__card" style={{ textAlign: 'center' }}>
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="category-edit-modal__save-btn"
                style={{ position: 'relative', bottom: 'auto', left: 'auto', right: 'auto' }}
              >
                <i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }}></i>
                前往登录
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="category-edit-modal">
        <div className="category-edit-modal__container app-container">
          <div className="category-edit-modal__header">
            <button
              className="category-edit-modal__back-button"
              onClick={onClose}
              aria-label="返回"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="category-edit-modal__title">编辑分类</h1>
            <div style={{ width: '40px' }}></div>
          </div>
          <div className="category-edit-modal__content">
            <div className="category-edit-modal__loading">
              <div className="category-edit-modal__spinner" aria-hidden="true"></div>
              <span>加载分类数据中...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 如果是占位符，显示占位符信息
  if (categoryId === 'placeholder') {
    return (
      <div className="category-edit-modal">
        <div className="category-edit-modal__container app-container">
          <div className="category-edit-modal__header">
            <button
              className="category-edit-modal__back-button"
              onClick={onClose}
              aria-label="返回"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="category-edit-modal__title">编辑分类</h1>
            <div style={{ width: '40px' }}></div>
          </div>
          <div className="category-edit-modal__content">
            <div className="category-edit-modal__card" style={{
              backgroundColor: '#fef3c7',
              borderColor: '#fcd34d',
              color: '#92400e',
              textAlign: 'center'
            }}>
              <i className="fas fa-info-circle" style={{ fontSize: '24px', marginBottom: '16px' }}></i>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                这是一个静态导出的占位符页面。在实际应用中，请通过正确的路由访问分类编辑页面。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="category-edit-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div
        className="category-edit-modal__container app-container"
        style={{
          width: '100%',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 编辑分类的头部 */}
        <div
          className="category-edit-modal__header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
            borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
            minHeight: '60px'
          }}
        >
          <button
            className="category-edit-modal__back-button"
            onClick={onClose}
            aria-label="返回"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1
            className="category-edit-modal__title"
            style={{ color: isDarkMode ? '#f3f4f6' : '#1f2937' }}
          >
            编辑分类
          </h1>
          <div style={{ width: '40px' }}></div>
        </div>

        {/* 主要内容 */}
        <div
          className="category-edit-modal__content"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            paddingBottom: 'calc(80px + 24px)',
            backgroundColor: isDarkMode ? '#111827' : '#f9fafb'
          }}
        >
          {/* 错误提示 */}
          {error && (
            <div className="category-edit-modal__error" role="alert">
              <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          {/* 分类类型选择器 */}
          <div
            className="category-edit-modal__card"
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
              className="category-edit-modal__label"
              style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
            >
              分类类型
            </label>
            <div className="category-edit-modal__type-selector" role="radiogroup" aria-label="选择分类类型">
              <button
                type="button"
                onClick={() => handleTypeChange('EXPENSE')}
                disabled={isSubmitting}
                className={`category-edit-modal__type-button category-edit-modal__type-button--expense ${
                  formData.type === 'EXPENSE' ? 'active' : ''
                }`}
                role="radio"
                aria-checked={formData.type === 'EXPENSE'}
                aria-label="支出分类"
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('INCOME')}
                disabled={isSubmitting}
                className={`category-edit-modal__type-button category-edit-modal__type-button--income ${
                  formData.type === 'INCOME' ? 'active' : ''
                }`}
                role="radio"
                aria-checked={formData.type === 'INCOME'}
                aria-label="收入分类"
              >
                收入
              </button>
            </div>
          </div>

          {/* 基本信息表单 */}
          <div
            className="category-edit-modal__card"
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
              className="category-edit-modal__label category-edit-modal__label--required"
              htmlFor="category-name"
              style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
            >
              分类名称
            </label>
            <input
              id="category-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="输入分类名称"
              disabled={isSubmitting}
              className="category-edit-modal__input"
              style={{
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                backgroundColor: 'transparent',
                borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`
              }}
              aria-required="true"
              aria-invalid={!isFormValid && formData.name.length > 0}
              maxLength={20}
            />


          </div>

          {/* 图标选择器 */}
          <div
            className="category-edit-modal__card"
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
              className="category-edit-modal__label"
              style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
            >
              分类图标
            </label>
            <div
              className="category-edit-modal__icon-grid"
              role="radiogroup"
              aria-label="选择分类图标"
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
            >
              {availableIcons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => !isSubmitting && handleIconSelect(icon)}
                  disabled={isSubmitting}
                  className={`category-edit-modal__icon-item ${
                    formData.icon === icon ? 'active' : ''
                  }`}
                  role="radio"
                  aria-checked={formData.icon === icon}
                  aria-label={`图标 ${icon}`}
                  title={`选择 ${icon} 图标`}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: formData.icon === icon
                      ? '2px solid #3b82f6'
                      : isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
                    backgroundColor: formData.icon === icon
                      ? '#3b82f6'
                      : isDarkMode ? '#1f2937' : '#ffffff',
                    color: formData.icon === icon
                      ? 'white'
                      : isDarkMode ? '#f3f4f6' : '#1f2937',
                    fontSize: '20px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className={getIconClass(icon)} aria-hidden="true"></i>
                </button>
              ))}
            </div>
          </div>

          {/* 颜色选择器 */}
          <div
            className="category-edit-modal__card"
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
              className="category-edit-modal__label"
              style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
            >
              分类颜色
            </label>
            <div
              className="category-edit-modal__color-grid"
              role="radiogroup"
              aria-label="选择分类颜色"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                padding: '16px',
                backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                borderRadius: '12px'
              }}
            >
              {presetColors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => !isSubmitting && handleColorSelect(color)}
                  disabled={isSubmitting}
                  className={`category-edit-modal__color-item ${
                    formData.color === color ? 'active' : ''
                  }`}
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
            className="category-edit-modal__card"
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
              className="category-edit-modal__label"
              style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
            >
              预览效果
            </label>
            <div className="category-edit-modal__preview">
              <div
                className="category-edit-modal__preview-icon"
                style={{ backgroundColor: formData.color }}
              >
                <i className={getIconClass(formData.icon)} aria-hidden="true"></i>
              </div>
              <div className="category-edit-modal__preview-info">
                <div
                  className="category-edit-modal__preview-name"
                  style={{ color: isDarkMode ? '#f3f4f6' : '#1f2937' }}
                >
                  {formData.name || '分类名称'}
                </div>
                <div
                  className="category-edit-modal__preview-type"
                  style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                >
                  {formData.type === 'EXPENSE' ? '支出分类' : '收入分类'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部保存按钮 */}
      <div className="category-edit-modal__save-button">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !isFormValid}
          className="category-edit-modal__save-btn"
          aria-label={isSubmitting ? '正在保存' : '保存分类修改'}
        >
          {isSubmitting ? (
            <>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} aria-hidden="true"></i>
              保存中...
            </>
          ) : (
            '保存修改'
          )}
        </button>
      </div>
    </div>
  );
}
