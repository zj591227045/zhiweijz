'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useTransactionStore } from '@/store/transaction-store';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { useBudgetStore } from '@/store/budget-store';
import { triggerTransactionChange } from '@/store/dashboard-store';
import { formatDateForInput, getIconClass } from '@/lib/utils';
import { TransactionType, UpdateTransactionData } from '@/types';
import { toast } from 'sonner';
import '../app/transactions/edit/[id]/transaction-edit.css';

interface TransactionEditModalProps {
  transactionId: string | null;
  transactionData: any;
  onClose: () => void;
  onSave: () => void;
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
    <div>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: 'var(--text-secondary)',
        marginBottom: '8px'
      }}>预算</label>

      {/* iOS 风格预算选择器预览 */}
      <div
        onClick={() => setIsBudgetSelectorOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '20px',
          backgroundColor: 'var(--primary-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <i className="fas fa-wallet"></i>
        </div>
        <div style={{ flex: 1 }}>
          {selectedBudget ? (
            <>
              <div style={{
                fontSize: '16px',
                fontWeight: '500',
                color: 'var(--text-color)',
                marginBottom: '2px'
              }}>
                {getBudgetDisplayName(selectedBudget)}
              </div>
              <div style={{
                fontSize: '14px',
                color: 'var(--text-secondary)'
              }}>
                余额: {formatAmount(calculateBudgetBalance(selectedBudget))}
              </div>
            </>
          ) : (
            <div style={{
              fontSize: '16px',
              color: 'var(--text-secondary)'
            }}>选择预算（可选）</div>
          )}
        </div>
        <div style={{
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          更改
        </div>
      </div>

      {/* iOS 风格预算选择器弹窗 */}
      {isBudgetSelectorOpen && (
        <div
          onClick={() => setIsBudgetSelectorOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              backgroundColor: 'var(--background-color)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              maxHeight: '70vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* 弹窗头部 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-color)',
                margin: 0
              }}>选择预算</h3>
              <button
                onClick={() => setIsBudgetSelectorOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: 'var(--background-secondary)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            {/* 弹窗内容 */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '0 20px 20px'
            }}>
              {isLoading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: 'var(--text-secondary)'
                }}>加载中...</div>
              ) : formattedBudgets.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: 'var(--text-secondary)',
                  gap: '8px'
                }}>
                  <i className="fas fa-info-circle" style={{ fontSize: '24px' }}></i>
                  <span>没有可用的预算</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* 不使用预算选项 */}
                  <div
                    onClick={handleClearBudget}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: !selectedBudget ? 'var(--primary-color)' : 'var(--background-color)',
                      border: `1px solid ${!selectedBudget ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: !selectedBudget ? 'white' : 'var(--text-color)'
                    }}>不使用预算</div>
                    {!selectedBudget && (
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <i className="fas fa-check" style={{ fontSize: '12px' }}></i>
                      </div>
                    )}
                  </div>

                  {/* 个人预算组 */}
                  {formattedBudgets.filter(b => b.budgetType !== 'GENERAL').length > 0 && (
                    <>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        margin: '16px 0 8px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>个人预算</div>
                      {formattedBudgets
                        .filter(budget => budget.budgetType !== 'GENERAL')
                        .map((budget) => (
                          <div
                            key={budget.id}
                            onClick={() => handleBudgetSelect(budget)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '16px',
                              borderRadius: '12px',
                              backgroundColor: selectedBudget?.id === budget.id ? 'var(--primary-color)' : 'var(--background-color)',
                              border: `1px solid ${selectedBudget?.id === budget.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              marginBottom: '4px'
                            }}
                          >
                            <div>
                              <div style={{
                                fontSize: '16px',
                                fontWeight: '500',
                                color: selectedBudget?.id === budget.id ? 'white' : 'var(--text-color)',
                                marginBottom: '4px'
                              }}>
                                {getBudgetDisplayName(budget)}
                              </div>
                              <div style={{
                                fontSize: '14px',
                                color: selectedBudget?.id === budget.id ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)'
                              }}>
                                余额: {formatAmount(calculateBudgetBalance(budget))}
                              </div>
                            </div>
                            {selectedBudget?.id === budget.id && (
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                              }}>
                                <i className="fas fa-check" style={{ fontSize: '12px' }}></i>
                              </div>
                            )}
                          </div>
                        ))}
                    </>
                  )}

                  {/* 通用预算组 */}
                  {formattedBudgets.filter(b => b.budgetType === 'GENERAL').length > 0 && (
                    <>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        margin: '16px 0 8px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>通用预算</div>
                      {formattedBudgets
                        .filter(budget => budget.budgetType === 'GENERAL')
                        .map((budget) => (
                          <div
                            key={budget.id}
                            onClick={() => handleBudgetSelect(budget)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '16px',
                              borderRadius: '12px',
                              backgroundColor: selectedBudget?.id === budget.id ? 'var(--primary-color)' : 'var(--background-color)',
                              border: `1px solid ${selectedBudget?.id === budget.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              marginBottom: '4px'
                            }}
                          >
                            <div>
                              <div style={{
                                fontSize: '16px',
                                fontWeight: '500',
                                color: selectedBudget?.id === budget.id ? 'white' : 'var(--text-color)',
                                marginBottom: '4px'
                              }}>
                                {getBudgetDisplayName(budget)}
                              </div>
                              <div style={{
                                fontSize: '14px',
                                color: selectedBudget?.id === budget.id ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)'
                              }}>
                                余额: {formatAmount(calculateBudgetBalance(budget))}
                              </div>
                            </div>
                            {selectedBudget?.id === budget.id && (
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                              }}>
                                <i className="fas fa-check" style={{ fontSize: '12px' }}></i>
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

export default function TransactionEditModal({
  transactionId,
  transactionData,
  onClose,
  onSave
}: TransactionEditModalProps) {
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
  const [currentStep, setCurrentStep] = useState(2); // 默认进入第二步，与原有逻辑一致
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // 初始化数据
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
      fetchAccountBooks();
    }
  }, [isAuthenticated, fetchCategories, fetchAccountBooks]);

  // 获取预算数据
  useEffect(() => {
    if (currentAccountBook?.id) {
      fetchActiveBudgets(currentAccountBook.id);
    }
  }, [currentAccountBook?.id, fetchActiveBudgets]);

  // 获取真实交易数据
  useEffect(() => {
    if (transactionId && transactionId !== 'placeholder') {
      console.log('🔄 [TransactionEditModal] 开始获取交易数据:', transactionId);
      fetchTransaction(transactionId);
    }
  }, [transactionId, fetchTransaction]);

  // 使用获取到的交易数据或传入的数据初始化表单
  useEffect(() => {
    const dataToUse = transaction || transactionData;

    if (dataToUse) {
      console.log('🔄 [TransactionEditModal] 初始化表单数据:', dataToUse);

      const transactionDate = new Date(dataToUse.date);
      const hours = transactionDate.getHours().toString().padStart(2, '0');
      const minutes = transactionDate.getMinutes().toString().padStart(2, '0');

      const newFormData = {
        amount: dataToUse.amount,
        type: dataToUse.type,
        categoryId: dataToUse.categoryId || '',
        date: formatDateForInput(transactionDate),
        description: dataToUse.description || ''
      };

      console.log('🔄 [TransactionEditModal] 设置表单数据:', newFormData);
      setFormData(newFormData);
      setAmountString(Math.abs(dataToUse.amount)?.toString() || '0');
      setBudgetId(dataToUse.budgetId || '');
      setTime(`${hours}:${minutes}`);
      setCurrentStep(2); // 直接进入详情步骤
    }
  }, [transaction, transactionData]);

  // 根据交易类型筛选分类
  const filteredCategories = categories.filter(
    category => category.type === formData.type
  );

  // 获取选中的分类信息
  const selectedCategory = categories.find(cat => cat.id === formData.categoryId);

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

      const success = await updateTransaction(transactionId!, updateData);
      if (success) {
        toast.success('交易更新成功');

        // 触发交易变化事件，让仪表盘自动刷新
        if (currentAccountBook?.id) {
          triggerTransactionChange(currentAccountBook.id);
        }

        onSave();
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



  // 隐藏仪表盘页面的头部，显示编辑交易的头部
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--background-color)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 使用完全相同的应用容器结构 */}
      <div className="app-container" style={{
        maxWidth: 'none',
        margin: 0,
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 编辑交易的头部 */}
        <div className="header">
          <button className="icon-button" onClick={onClose}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="header-title">编辑交易</div>
          <div style={{ width: '32px' }}></div>
        </div>

        {/* 主要内容 */}
        <div className="main-content" style={{
          paddingBottom: '20px',
          overflowY: 'auto'
        }}>
          <div style={{ padding: '0 20px' }}>
            {/* iOS 风格交易类型切换 */}
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--background-secondary)',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '24px'
            }}>
              <button
                onClick={() => handleTypeChange(TransactionType.EXPENSE)}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: formData.type === TransactionType.EXPENSE ? '#ef4444' : 'transparent',
                  color: formData.type === TransactionType.EXPENSE ? 'white' : 'var(--text-color)',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                支出
              </button>
              <button
                onClick={() => handleTypeChange(TransactionType.INCOME)}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: formData.type === TransactionType.INCOME ? '#10b981' : 'transparent',
                  color: formData.type === TransactionType.INCOME ? 'white' : 'var(--text-color)',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                收入
              </button>
            </div>

            {/* iOS 风格金额输入 */}
            <div style={{
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '32px',
                  fontWeight: '300',
                  color: 'var(--text-secondary)'
                }}>¥</span>
                <input
                  type="number"
                  placeholder="0"
                  value={amountString}
                  onChange={(e) => setAmountString(e.target.value)}
                  step="0.01"
                  min="0"
                  disabled={isSubmitting}
                  style={{
                    fontSize: '48px',
                    fontWeight: '300',
                    color: 'var(--text-color)',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'center',
                    width: 'auto',
                    minWidth: '100px',
                    maxWidth: '200px'
                  }}
                />
              </div>
            </div>

            {/* iOS 风格步骤指示器 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '24px 0',
              gap: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentStep >= 1 ? 'var(--primary-color)' : 'var(--border-color)',
                  color: currentStep >= 1 ? 'white' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}>
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: currentStep >= 1 ? 'var(--primary-color)' : 'var(--text-secondary)'
                }}>选择分类</span>
              </div>

              <div style={{
                width: '32px',
                height: '2px',
                backgroundColor: currentStep >= 2 ? 'var(--primary-color)' : 'var(--border-color)',
                borderRadius: '1px',
                transition: 'all 0.3s ease'
              }}></div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentStep >= 2 ? 'var(--primary-color)' : 'var(--border-color)',
                  color: currentStep >= 2 ? 'white' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}>
                  2
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: currentStep >= 2 ? 'var(--primary-color)' : 'var(--text-secondary)'
                }}>交易详情</span>
              </div>
            </div>
            {/* 第一步：分类选择 */}
            {currentStep === 1 && (
              <div style={{ padding: '0 20px' }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: 'var(--text-color)',
                  textAlign: 'center',
                  marginBottom: '24px'
                }}>选择分类</h3>

                {/* iOS 风格分类网格 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  {filteredCategories.map(category => (
                    <div
                      key={category.id}
                      onClick={() => !isSubmitting && handleCategorySelect(category.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '16px 8px',
                        borderRadius: '12px',
                        backgroundColor: formData.categoryId === category.id ? 'var(--primary-color)' : 'var(--background-color)',
                        border: `1px solid ${formData.categoryId === category.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isSubmitting ? 0.6 : 1,
                        transform: formData.categoryId === category.id ? 'scale(0.98)' : 'scale(1)'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '20px',
                        backgroundColor: formData.categoryId === category.id ? 'rgba(255, 255, 255, 0.2)' : 'var(--primary-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '18px'
                      }}>
                        <i className={getIconClass(category.icon)}></i>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: formData.categoryId === category.id ? 'white' : 'var(--text-color)',
                        textAlign: 'center',
                        lineHeight: '1.2'
                      }}>{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 第二步：交易详情 */}
            {currentStep === 2 && (
              <div className="step-content">
                <h3 className="step-title">填写详情</h3>

                {/* 显示选中的分类 - iOS 风格卡片 */}
                {selectedCategory && (
                  <div style={{
                    backgroundColor: 'var(--background-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '20px',
                      backgroundColor: 'var(--primary-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <i className={getIconClass(selectedCategory.icon)}></i>
                    </div>
                    <span style={{
                      flex: 1,
                      fontSize: '16px',
                      fontWeight: '500',
                      color: 'var(--text-color)'
                    }}>{selectedCategory.name}</span>
                    <button
                      onClick={() => setCurrentStep(1)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--primary-color)',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: '4px 8px'
                      }}
                    >
                      更改
                    </button>
                  </div>
                )}

                {/* iOS 风格表单 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* 描述输入 */}
                  <div style={{
                    backgroundColor: 'var(--background-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px'
                    }}>描述</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="添加描述..."
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                        padding: '0'
                      }}
                    />
                  </div>

                  {/* 日期和时间 - 并排布局 */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                      flex: 1,
                      backgroundColor: 'var(--background-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px'
                      }}>日期</label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '16px',
                          color: 'var(--text-color)',
                          padding: '0'
                        }}
                      />
                    </div>

                    <div style={{
                      flex: 1,
                      backgroundColor: 'var(--background-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px'
                      }}>时间</label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '16px',
                          color: 'var(--text-color)',
                          padding: '0'
                        }}
                      />
                    </div>
                  </div>

                  {/* 预算选择（仅支出类型显示） */}
                  {formData.type === TransactionType.EXPENSE && (
                    <div style={{
                      backgroundColor: 'var(--background-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <BudgetSelector budgetId={budgetId} setBudgetId={setBudgetId} />
                    </div>
                  )}
                </div>

                {/* 错误信息 */}
                {formError && (
                  <div style={{
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px',
                    margin: '16px 0',
                    color: '#dc2626',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}>{formError}</div>
                )}

                {/* iOS 风格操作按钮 */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '24px',
                  paddingBottom: '20px'
                }}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      height: '48px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--background-color)',
                      color: 'var(--text-color)',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    上一步
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={{
                      flex: 2,
                      height: '48px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: 'var(--primary-color)',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {isSubmitting ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
