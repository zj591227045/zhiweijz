'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, BottomNavigation } from '@zhiweijz/web';
import { useTransactionStore } from '@/store/transaction-store';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { useBudgetStore } from '@/store/budget-store';
import { formatDateForInput, getIconClass } from '@/lib/utils';
import { TransactionType, CreateTransactionData } from '@/types';
import { toast } from 'sonner';
import './transaction-new.css';

export default function TransactionNewPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { createTransaction, isLoading } = useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { accountBooks, currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  
  // 表单状态
  const [formData, setFormData] = useState<CreateTransactionData>({
    amount: 0,
    type: TransactionType.EXPENSE,
    categoryId: '',
    date: formatDateForInput(new Date()),
    accountBookId: '',
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

  // 获取分类、账本和预算列表
  useEffect(() => {
    fetchCategories();
    fetchAccountBooks();
    fetchBudgets();
  }, [fetchCategories, fetchAccountBooks, fetchBudgets]);

  // 当当前账本加载完成后，设置默认账本
  useEffect(() => {
    if (currentAccountBook?.id) {
      setFormData(prev => ({
        ...prev,
        accountBookId: currentAccountBook.id
      }));
    }
  }, [currentAccountBook]);

  // 根据交易类型筛选分类
  const filteredCategories = categories.filter(
    category => category.type === formData.type
  );

  // 根据交易类型和账本筛选预算
  const filteredBudgets = budgets.filter(
    budget => 
      budget.category?.type === formData.type && 
      budget.accountBookId === formData.accountBookId
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
    
    if (!formData.accountBookId) {
      setFormError('请选择账本');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    
    try {
      const success = await createTransaction(formData);
      if (success) {
        toast.success('交易创建成功');
        router.push('/transactions');
      }
    } catch (error) {
      console.error('创建交易失败:', error);
      setFormError('创建交易失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      categoryId: '', // 重置分类选择
      budgetId: '' // 重置预算选择
    }));
  };

  // 处理分类选择
  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryId,
      budgetId: '' // 重置预算选择
    }));
  };

  // 返回上一页
  const handleBack = () => {
    router.back();
  };

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <div className="header">
        <button className="icon-button" onClick={handleBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="header-title">新增交易</div>
        <div className="header-actions"></div>
      </div>

      {/* 主要内容区域 */}
      <div className="main-content">
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
              value={formData.amount || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
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

          {/* 账本选择 */}
          <div className="form-group">
            <label className="form-label" htmlFor="accountBookId">账本</label>
            <select
              id="accountBookId"
              name="accountBookId"
              className="account-book-selector"
              value={formData.accountBookId}
              onChange={handleChange}
              required
            >
              <option value="">请选择账本</option>
              {accountBooks.map(book => (
                <option key={book.id} value={book.id}>
                  {book.name}
                </option>
              ))}
            </select>
          </div>

          {/* 预算选择（仅支出类型显示） */}
          {formData.type === TransactionType.EXPENSE && (
            <div className="form-group">
              <label className="form-label" htmlFor="budgetId">预算（可选）</label>
              <select
                id="budgetId"
                name="budgetId"
                className="budget-selector"
                value={formData.budgetId || ''}
                onChange={handleChange}
              >
                <option value="">不使用预算</option>
                {filteredBudgets.map(budget => (
                  <option key={budget.id} value={budget.id}>
                    {budget.category?.name} - {budget.amount}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 备注输入 */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">备注</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              value={formData.description || ''}
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
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? '保存中...' : '保存'}
          </button>
        </form>
      </div>

      {/* 底部导航栏 */}
      <BottomNavigation currentPath="/transactions" />
    </div>
  );
}
