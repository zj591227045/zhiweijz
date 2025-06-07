'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { useTransactionStore } from '@/store/transaction-store';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { useBudgetStore } from '@/store/budget-store';
import { triggerTransactionChange } from '@/store/dashboard-store';
import { formatDateForInput, getIconClass } from '@/lib/utils';
import { TransactionType, UpdateTransactionData } from '@/types';
import { toast } from 'sonner';
import './transaction-edit.css';

interface TransactionEditClientProps {
  params: {
    id: string;
  };
}

// 预算显示类型定义
interface BudgetDisplay {
  id: string;
  name: string;
  amount: number;
  spent: number;
  rolloverAmount?: number;
  budgetType?: 'PERSONAL' | 'GENERAL';
  familyMemberName?: string;
  familyMemberId?: string;
  userId?: string;
  userName?: string;
}

// 预算选择器组件
function BudgetSelector({
  budgetId,
  setBudgetId
}: {
  budgetId: string;
  setBudgetId: (id: string) => void;
}) {
  const { currentAccountBook } = useAccountBookStore();
  const { budgets, fetchActiveBudgets, isLoading } = useBudgetStore();
  const { user: currentUser } = useAuthStore();
  const [isBudgetSelectorOpen, setIsBudgetSelectorOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetDisplay | null>(null);

  // 获取活跃预算数据
  useEffect(() => {
    if (currentAccountBook?.id) {
      fetchActiveBudgets(currentAccountBook.id);
    }
  }, [currentAccountBook?.id, fetchActiveBudgets]);

  // 筛选支出类型的预算并格式化数据
  const formattedBudgets: BudgetDisplay[] = budgets.map(budget => ({
    id: budget.id,
    name: (budget as any).name || budget.category?.name || '未知分类',
    amount: budget.amount,
    spent: (budget as any).spent || 0,
    rolloverAmount: (budget as any).rolloverAmount || 0,
    budgetType: (budget as any).budgetType || 'PERSONAL',
    familyMemberName: (budget as any).familyMemberName,
    familyMemberId: (budget as any).familyMemberId,
    userId: (budget as any).userId,
    userName: (budget as any).userName
  }));

  // 根据budgetId查找选中的预算 - 使用useCallback避免循环依赖
  const updateSelectedBudget = useCallback(() => {
    if (budgetId && formattedBudgets.length > 0) {
      const budget = formattedBudgets.find(b => b.id === budgetId);
      if (budget) {
        setSelectedBudget(budget);
      }
    } else {
      setSelectedBudget(null);
    }
  }, [budgetId, formattedBudgets.length]);

  useEffect(() => {
    updateSelectedBudget();
  }, [updateSelectedBudget]);

  // 处理预算选择
  const handleBudgetSelect = (budget: BudgetDisplay) => {
    setSelectedBudget(budget);
    setBudgetId(budget.id);
    setIsBudgetSelectorOpen(false);
  };

  // 处理清除预算选择
  const handleClearBudget = () => {
    setSelectedBudget(null);
    setBudgetId('');
    setIsBudgetSelectorOpen(false);
  };

  // 格式化金额显示
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // 计算预算余额
  const calculateBudgetBalance = (budget: BudgetDisplay) => {
    const totalAmount = budget.amount + (budget.rolloverAmount || 0);
    return totalAmount - budget.spent;
  };

  // 获取预算显示名称
  const getBudgetDisplayName = (budget: BudgetDisplay) => {
    // 如果是个人预算且有家庭成员名称，显示成员名称
    if (budget.budgetType === 'PERSONAL' && budget.familyMemberName) {
      return budget.familyMemberName;
    }
    // 如果是通用预算，直接显示预算名称
    if (budget.budgetType === 'GENERAL') {
      return budget.name;
    }
    // 其他情况显示预算名称
    return budget.name;
  };

  return (
    <div className="budget-selector-container">
      <label className="form-label">预算</label>
      {/* 预算选择器预览 */}
      <div
        className="budget-selector-preview"
        onClick={() => setIsBudgetSelectorOpen(true)}
      >
        <div className="budget-selector-icon">
          <i className="fas fa-wallet"></i>
        </div>
        <div className="budget-selector-info">
          {selectedBudget ? (
            <>
              <div className="budget-name">
                {getBudgetDisplayName(selectedBudget)}
              </div>
              <div className="budget-balance">
                余额: {formatAmount(calculateBudgetBalance(selectedBudget))}
              </div>
            </>
          ) : (
            <div className="budget-name">选择预算（可选）</div>
          )}
        </div>
        <div className="budget-selector-arrow">
          <i className="fas fa-chevron-right"></i>
        </div>
      </div>

      {/* 预算选择器弹窗 */}
      {isBudgetSelectorOpen && (
        <div className="budget-selector-overlay" onClick={() => setIsBudgetSelectorOpen(false)}>
          <div
            className="budget-selector-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="budget-selector-header">
              <h3>选择预算</h3>
              <button
                className="close-button"
                onClick={() => setIsBudgetSelectorOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="budget-selector-content">
              {isLoading ? (
                <div className="loading-state">加载中...</div>
              ) : formattedBudgets.length === 0 ? (
                <div className="no-budgets-message">
                  <i className="fas fa-info-circle"></i>
                  <span>没有可用的预算</span>
                </div>
              ) : (
                <div className="budget-list">
                  {/* 不使用预算选项 */}
                  <div
                    className={`budget-item ${!selectedBudget ? 'active' : ''}`}
                    onClick={handleClearBudget}
                  >
                    <div className="budget-item-info">
                      <div className="budget-item-name">不使用预算</div>
                    </div>
                    {!selectedBudget && (
                      <div className="budget-item-check">
                        <i className="fas fa-check"></i>
                      </div>
                    )}
                  </div>

                  {/* 个人预算组 */}
                  {formattedBudgets.filter(b => b.budgetType !== 'GENERAL').length > 0 && (
                    <>
                      <div className="budget-group-header">个人预算</div>
                      {formattedBudgets
                        .filter(budget => budget.budgetType !== 'GENERAL')
                        .map((budget) => (
                          <div
                            key={budget.id}
                            className={`budget-item ${selectedBudget?.id === budget.id ? 'active' : ''}`}
                            onClick={() => handleBudgetSelect(budget)}
                          >
                            <div className="budget-item-info">
                              <div className="budget-item-name">
                                {getBudgetDisplayName(budget)}
                              </div>
                              <div className="budget-item-balance">
                                余额: {formatAmount(calculateBudgetBalance(budget))}
                              </div>
                            </div>
                            {selectedBudget?.id === budget.id && (
                              <div className="budget-item-check">
                                <i className="fas fa-check"></i>
                              </div>
                            )}
                          </div>
                        ))}
                    </>
                  )}

                  {/* 通用预算组 */}
                  {formattedBudgets.filter(b => b.budgetType === 'GENERAL').length > 0 && (
                    <>
                      <div className="budget-group-header">通用预算</div>
                      {formattedBudgets
                        .filter(budget => budget.budgetType === 'GENERAL')
                        .map((budget) => (
                          <div
                            key={budget.id}
                            className={`budget-item ${selectedBudget?.id === budget.id ? 'active' : ''}`}
                            onClick={() => handleBudgetSelect(budget)}
                          >
                            <div className="budget-item-info">
                              <div className="budget-item-name">
                                {getBudgetDisplayName(budget)}
                              </div>
                              <div className="budget-item-balance">
                                余额: {formatAmount(calculateBudgetBalance(budget))}
                              </div>
                            </div>
                            {selectedBudget?.id === budget.id && (
                              <div className="budget-item-check">
                                <i className="fas fa-check"></i>
                              </div>
                            )}
                          </div>
                        ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionEditClient({ params }: TransactionEditClientProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { transaction, isLoading, error, fetchTransaction, updateTransaction } = useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const { fetchActiveBudgets } = useBudgetStore();

  // 表单状态
  const [formData, setFormData] = useState<UpdateTransactionData>({
    amount: 0,
    type: TransactionType.EXPENSE,
    categoryId: '',
    date: '',
    description: ''
  });
  const [amountString, setAmountString] = useState('');
  const [budgetId, setBudgetId] = useState('');
  const [time, setTime] = useState('12:00');
  const [currentStep, setCurrentStep] = useState(2); // 默认进入第二步
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
      fetchAccountBooks();
    }
  }, [params.id, fetchTransaction, fetchCategories, fetchAccountBooks]);

  // 获取预算数据
  useEffect(() => {
    if (currentAccountBook?.id) {
      fetchActiveBudgets(currentAccountBook.id);
    }
  }, [currentAccountBook?.id, fetchActiveBudgets]);

  // 当交易数据加载完成后，初始化表单数据
  useEffect(() => {
    if (transaction) {
      const transactionDate = new Date(transaction.date);
      const hours = transactionDate.getHours().toString().padStart(2, '0');
      const minutes = transactionDate.getMinutes().toString().padStart(2, '0');

      setFormData({
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
        date: formatDateForInput(transactionDate),
        description: transaction.description || ''
      });
      setAmountString(Math.abs(transaction.amount)?.toString() || '0');
      setBudgetId(transaction.budgetId || '');
      setTime(`${hours}:${minutes}`);
    }
  }, [transaction]);

  // 根据交易类型筛选分类
  const filteredCategories = categories.filter(
    category => category.type === formData.type
  );

  // 处理表单提交
  const handleSubmit = async () => {
    const amount = parseFloat(amountString);
    if (!amountString || amount <= 0) {
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

    if (!time) {
      setFormError('请选择时间');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const [hours, minutes] = time.split(":");
      const [year, month, day] = formData.date.split("-");
      const transactionDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        0,
        0
      );

      const updateData = {
        ...formData,
        amount,
        date: transactionDate.toISOString(),
        budgetId: budgetId || undefined
      };
      const success = await updateTransaction(params.id, updateData);
      if (success) {
        toast.success('交易更新成功');

        // 触发交易变化事件，让仪表盘自动刷新
        if (currentAccountBook?.id) {
          triggerTransactionChange(currentAccountBook.id);
        }

        router.push('/transactions');
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
      [name]: value
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
    setCurrentStep(2);
  };

  // 返回交易列表页面
  const handleBack = () => {
    router.push('/transactions');
  };

  // 获取选中的分类信息
  const selectedCategory = categories.find(cat => cat.id === formData.categoryId);

  return (
    <PageContainer
      title="编辑交易"
      showBackButton={true}
      onBackClick={handleBack}
      showBottomNav={false}
    >
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
        <div className="transaction-edit-container">
          {/* 交易类型切换 */}
          <div className="transaction-type-toggle">
            <button
              className={`type-button expense ${formData.type === TransactionType.EXPENSE ? 'active' : ''}`}
              onClick={() => handleTypeChange(TransactionType.EXPENSE)}
              disabled={isSubmitting}
            >
              支出
            </button>
            <button
              className={`type-button income ${formData.type === TransactionType.INCOME ? 'active' : ''}`}
              onClick={() => handleTypeChange(TransactionType.INCOME)}
              disabled={isSubmitting}
            >
              收入
            </button>
          </div>

          {/* 金额输入 */}
          <div className="amount-input-container">
            <div className="amount-display">
              <span className="currency-symbol">¥</span>
              <input
                type="number"
                className="amount-input"
                placeholder="0"
                value={amountString}
                onChange={(e) => setAmountString(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* 步骤指示器 */}
          <div className="step-indicator">
            <div className={`step ${currentStep >= 1 ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">选择分类</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">交易详情</div>
            </div>
          </div>

          {/* 第一步：分类选择 */}
          {currentStep === 1 && (
            <div className="step-content">
              <h3 className="step-title">选择分类</h3>
              <div className="category-grid">
                {filteredCategories.map(category => (
                  <div
                    key={category.id}
                    className={`category-item ${formData.categoryId === category.id ? 'active' : ''} ${isSubmitting ? 'disabled' : ''}`}
                    onClick={() => !isSubmitting && handleCategorySelect(category.id)}
                  >
                    <div className="category-icon-wrapper">
                      <i className={getIconClass(category.icon)}></i>
                    </div>
                    <div className="category-name">{category.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 第二步：交易详情 */}
          {currentStep === 2 && (
            <div className="step-content">
              <h3 className="step-title">填写详情</h3>

              {/* 显示选中的分类 */}
              {selectedCategory && (
                <div className="selected-category">
                  <div className="category-icon-wrapper">
                    <i className={getIconClass(selectedCategory.icon)}></i>
                  </div>
                  <span>{selectedCategory.name}</span>
                  <button className="change-category-btn" onClick={() => setCurrentStep(1)}>
                    更改
                  </button>
                </div>
              )}

              <div className="transaction-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="description">描述</label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    className="form-input"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="添加描述..."
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="date">日期</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    className="form-input"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="time">时间</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    className="form-input"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* 预算选择（仅支出类型显示） */}
                {formData.type === TransactionType.EXPENSE && (
                  <BudgetSelector budgetId={budgetId} setBudgetId={setBudgetId} />
                )}
              </div>

              {/* 错误信息 */}
              {formError && (
                <div className="error-message">{formError}</div>
              )}

              {/* 操作按钮 */}
              <div className="step2-buttons">
                <button
                  className="back-button"
                  onClick={() => setCurrentStep(1)}
                  disabled={isSubmitting}
                >
                  上一步
                </button>
                <button
                  className="save-button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          )}
        </div>
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