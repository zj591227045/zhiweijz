'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@zhiweijz/web';
import { PageContainer } from '@/components/layout/page-container';
import { useTransactionStore } from '@/store/transaction-store';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { formatDateForInput, getCategoryIconClass } from '@/lib/utils';
import { TransactionType, UpdateTransactionData } from '@/types';
import { toast } from 'sonner';
import './transaction-edit.css';

export default function TransactionEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { transaction, isLoading, error, fetchTransaction, updateTransaction } = useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { currentAccountBook } = useAccountBookStore();

  // 表单状态
  const [formData, setFormData] = useState<UpdateTransactionData>({
    amount: 0,
    type: TransactionType.EXPENSE,
    categoryId: '',
    date: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 获取交易详情和分类列表
  useEffect(() => {
    if (params.id) {
      fetchTransaction(params.id);
      fetchCategories();
    }
  }, [params.id, fetchTransaction, fetchCategories]);

  // 当交易数据加载完成后，初始化表单数据
  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
        date: formatDateForInput(new Date(transaction.date)),
        description: transaction.description || ''
      });
    }
  }, [transaction]);

  // 根据交易类型筛选分类
  const filteredCategories = categories.filter(
    category => category.type === formData.type
  );

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证
    if (!formData.amount || formData.amount <= 0) {
      setFormError('请输入有效的金额');
      return;
    }

    if (!formData.categoryId) {
      setFormError('请选择分类');
      return;
    }

    if (!formData.date) {
      setFormError('请选择日期');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const success = await updateTransaction(params.id, formData);
      if (success) {
        toast.success('交易更新成功');
        router.push(`/transactions/${params.id}`);
      }
    } catch (error) {
      console.error('更新交易失败:', error);
      setFormError('更新交易失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  // 处理交易类型变化
  const handleTypeChange = (type: TransactionType) => {
    setFormData(prev => ({
      ...prev,
      type,
      categoryId: '' // 重置分类选择
    }));
  };

  // 处理分类选择
  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryId
    }));
  };

  // 返回上一页
  const handleBack = () => {
    router.back();
  };

  // 获取图标类名
  const getIconClass = (iconName?: string) => {
    if (!iconName) return "fas fa-tag";
    const iconClass = getCategoryIconClass(iconName);
    return iconClass.startsWith("fa-") ? `fas ${iconClass}` : `fas fa-${iconClass}`;
  };

  return (
    <PageContainer title="编辑交易" showBackButton={true} onBackClick={handleBack} showBottomNav={false}>
      {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <div className="loading-text">加载中...</div>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="error-message">{error}</div>
            <button
              className="retry-button"
              onClick={() => fetchTransaction(params.id)}
            >
              重试
            </button>
          </div>
        ) : transaction ? (
          <form className="form-card" onSubmit={handleSubmit}>
            {/* 交易类型选择 */}
            <div className="type-selector">
              <button
                type="button"
                className={`type-button ${formData.type === TransactionType.EXPENSE ? 'active' : ''}`}
                onClick={() => handleTypeChange(TransactionType.EXPENSE)}
              >
                支出
              </button>
              <button
                type="button"
                className={`type-button ${formData.type === TransactionType.INCOME ? 'active' : ''}`}
                onClick={() => handleTypeChange(TransactionType.INCOME)}
              >
                收入
              </button>
            </div>

            {/* 金额输入 */}
            <div className="form-group">
              <label className="form-label" htmlFor="amount">金额</label>
              <input
                type="number"
                id="amount"
                name="amount"
                className="form-input"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
              />
            </div>

            {/* 分类选择 */}
            <div className="form-group">
              <label className="form-label">分类</label>
              <div className="category-selector">
                {filteredCategories.map(category => (
                  <div
                    key={category.id}
                    className={`category-item ${formData.categoryId === category.id ? 'active' : ''}`}
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <div className="category-icon">
                      <i className={getIconClass(category.icon)}></i>
                    </div>
                    <div className="category-name">{category.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 日期选择 */}
            <div className="form-group">
              <label className="form-label" htmlFor="date">日期</label>
              <input
                type="date"
                id="date"
                name="date"
                className="date-picker"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            {/* 备注输入 */}
            <div className="form-group">
              <label className="form-label" htmlFor="description">备注</label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleChange}
                placeholder="添加备注（可选）"
              />
            </div>

            {/* 错误信息 */}
            {formError && (
              <div className="error-message">{formError}</div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </form>
        ) : (
          <div className="error-state">
            <div className="error-icon">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="error-message">未找到交易记录</div>
            <button
              className="retry-button"
              onClick={() => router.push('/transactions')}
            >
              返回交易列表
            </button>
          </div>
        )}
    </PageContainer>
  );
}
