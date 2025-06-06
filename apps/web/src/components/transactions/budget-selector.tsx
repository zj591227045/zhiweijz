'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useTransactionFormStore } from '@/store/transaction-form-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { useBudgetStore } from '@/store/budget-store';
import { useAuthStore } from '@/store/auth-store';
import './budget-selector.css';

// 预算类型定义
interface Budget {
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
  // 添加API返回的其他字段
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  period?: string;
  startDate?: string;
  endDate?: string;
  remaining?: number;
  percentage?: number;
}

export function BudgetSelector() {
  const { budgetId, setBudgetId } = useTransactionFormStore();

  const { currentAccountBook } = useAccountBookStore();
  const { budgets, fetchActiveBudgets, isLoading } = useBudgetStore();
  const { user: currentUser } = useAuthStore();
  const [isBudgetSelectorOpen, setIsBudgetSelectorOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // 获取活跃预算数据
  useEffect(() => {
    if (currentAccountBook?.id) {
      fetchActiveBudgets(currentAccountBook.id);
    }
  }, [currentAccountBook?.id, fetchActiveBudgets]);

  // 筛选支出类型的预算并格式化数据
  const formattedBudgets: Budget[] = budgets.map((budget) => {
    console.log('处理预算数据:', budget);

    // 获取预算名称，优先使用name字段，其次使用分类名称
    let budgetName = '';
    if ((budget as any).name) {
      budgetName = (budget as any).name;
    } else if (budget.category?.name) {
      budgetName = budget.category.name;
    } else {
      budgetName = '未知分类';
    }

    // 获取已花费金额
    const spentAmount = (budget as any).spent || 0;

    // 获取结转金额
    const rolloverAmount = (budget as any).rolloverAmount || 0;

    // 获取预算类型
    const budgetType = (budget as any).budgetType || 'PERSONAL';

    // 获取家庭成员信息
    const familyMemberName = (budget as any).familyMemberName || (budget as any).userName;
    const familyMemberId = (budget as any).familyMemberId;
    const userId = (budget as any).userId;
    const userName = (budget as any).userName;

    const formattedBudget = {
      id: budget.id,
      name: budgetName,
      amount: budget.amount,
      spent: spentAmount,
      rolloverAmount,
      budgetType,
      familyMemberName,
      familyMemberId,
      userId,
      userName,
      category: budget.category,
      period: (budget as any).period,
      startDate: (budget as any).startDate,
      endDate: (budget as any).endDate,
      remaining: (budget as any).remaining,
      percentage: (budget as any).percentage,
    };

    console.log('格式化后的预算:', formattedBudget);
    return formattedBudget;
  });

  // 自动选择默认预算的逻辑
  const selectDefaultBudget = useCallback(() => {
    console.log('selectDefaultBudget 调用:', {
      formattedBudgetsLength: formattedBudgets.length,
      selectedBudget,
      currentUser: currentUser?.name,
      hasInitialized,
    });

    if (formattedBudgets.length > 0 && !selectedBudget && currentUser && !hasInitialized) {
      console.log('获取到活跃预算:', formattedBudgets);
      console.log('当前登录用户:', currentUser);

      // 查找与当前登录用户名称匹配的预算
      const userBudget = formattedBudgets.find(
        (b) => b.familyMemberName === currentUser.name && b.budgetType === 'PERSONAL',
      );

      if (userBudget) {
        console.log('找到当前用户的预算:', userBudget);
        setSelectedBudget(userBudget);
        setBudgetId(userBudget.id);
        setHasInitialized(true);
      } else {
        // 如果没有找到匹配的预算，查找没有familyMemberId的个人预算
        const personalBudget = formattedBudgets.find(
          (b) => !b.familyMemberId && b.budgetType === 'PERSONAL',
        );

        if (personalBudget) {
          console.log('设置默认个人预算:', personalBudget);
          setSelectedBudget(personalBudget);
          setBudgetId(personalBudget.id);
          setHasInitialized(true);
        } else if (formattedBudgets.length > 0) {
          // 如果没有找到个人预算，使用第一个预算
          console.log('未找到个人预算，使用第一个预算:', formattedBudgets[0]);
          setSelectedBudget(formattedBudgets[0]);
          setBudgetId(formattedBudgets[0].id);
          setHasInitialized(true);
        }
      }
    }
  }, [formattedBudgets, selectedBudget, currentUser, hasInitialized, setBudgetId]);

  // 当活跃预算数据加载完成后，设置默认预算
  useEffect(() => {
    selectDefaultBudget();
  }, [selectDefaultBudget]);

  // 根据budgetId查找选中的预算（仅在budgetId变化且没有selectedBudget时执行）
  useEffect(() => {
    if (budgetId && formattedBudgets.length > 0 && !selectedBudget) {
      const budget = formattedBudgets.find((b) => b.id === budgetId);
      if (budget) {
        setSelectedBudget(budget);
      }
    }
  }, [budgetId, formattedBudgets, selectedBudget]);

  // 处理预算选择
  const handleBudgetSelect = (budget: Budget) => {
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
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // 计算预算余额
  const calculateBudgetBalance = (budget: Budget) => {
    const totalAmount = budget.amount + (budget.rolloverAmount || 0);
    return totalAmount - budget.spent;
  };

  // 获取预算显示名称
  const getBudgetDisplayName = (budget: Budget) => {
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
      {/* 预算选择器预览 */}
      <div className="budget-selector-preview" onClick={() => setIsBudgetSelectorOpen(true)}>
        <div className="budget-selector-icon">
          <i className="fas fa-wallet"></i>
        </div>
        <div className="budget-selector-info">
          {selectedBudget ? (
            <>
              <div className="budget-name">{getBudgetDisplayName(selectedBudget)}</div>
              <div className="budget-balance">
                余额: {formatAmount(calculateBudgetBalance(selectedBudget))}
              </div>
            </>
          ) : (
            <div className="budget-name">选择预算</div>
          )}
        </div>
        <div className="budget-selector-arrow">
          <i className="fas fa-chevron-right"></i>
        </div>
      </div>

      {/* 预算选择器弹窗 */}
      {isBudgetSelectorOpen && (
        <div className="budget-selector-overlay" onClick={() => setIsBudgetSelectorOpen(false)}>
          <div className="budget-selector-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="budget-selector-header">
              <h3>选择预算</h3>
              <button className="close-button" onClick={() => setIsBudgetSelectorOpen(false)}>
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
                  <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                    调试信息: budgets.length = {budgets.length}, isLoading = {isLoading.toString()}
                  </div>
                </div>
              ) : (
                <div className="budget-list">
                  {/* 不使用预算选项 */}
                  <div
                    className={cn('budget-item', !selectedBudget && 'active')}
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
                  {formattedBudgets.filter((b) => b.budgetType !== 'GENERAL').length > 0 && (
                    <>
                      <div className="budget-group-header">个人预算</div>
                      {formattedBudgets
                        .filter((budget) => budget.budgetType !== 'GENERAL')
                        .map((budget) => (
                          <div
                            key={budget.id}
                            className={cn(
                              'budget-item',
                              selectedBudget?.id === budget.id && 'active',
                            )}
                            onClick={() => handleBudgetSelect(budget)}
                          >
                            <div className="budget-item-info">
                              <div className="budget-item-name">{getBudgetDisplayName(budget)}</div>
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
                  {formattedBudgets.filter((b) => b.budgetType === 'GENERAL').length > 0 && (
                    <>
                      <div className="budget-group-header">通用预算</div>
                      {formattedBudgets
                        .filter((budget) => budget.budgetType === 'GENERAL')
                        .map((budget) => (
                          <div
                            key={budget.id}
                            className={cn(
                              'budget-item',
                              selectedBudget?.id === budget.id && 'active',
                            )}
                            onClick={() => handleBudgetSelect(budget)}
                          >
                            <div className="budget-item-info">
                              <div className="budget-item-name">{getBudgetDisplayName(budget)}</div>
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
