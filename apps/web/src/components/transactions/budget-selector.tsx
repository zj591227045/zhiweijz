'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useTransactionFormStore } from '@/store/transaction-form-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { useBudgetStore } from '@/store/budget-store';
import { useAuthStore } from '@/store/auth-store';
import { budgetService } from '@/lib/api-services';
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

export function BudgetSelector({ isEditMode = false }: { isEditMode?: boolean }) {
  const { budgetId, setBudgetId, date, isEditMode: storeIsEditMode } = useTransactionFormStore();

  const { currentAccountBook } = useAccountBookStore();
  const { user: currentUser } = useAuthStore();
  const [isBudgetSelectorOpen, setIsBudgetSelectorOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [dateBudgets, setDateBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 根据日期获取预算数据
  const fetchBudgetsByDate = useCallback(async (transactionDate: string, accountBookId: string) => {
    try {
      setIsLoading(true);
      console.log('根据日期获取预算:', { transactionDate, accountBookId });

      const response = await budgetService.getBudgetsByDate(transactionDate, accountBookId);
      console.log('API响应完整信息:', response);
      console.log('API响应类型:', typeof response);
      console.log('API响应keys:', response ? Object.keys(response) : 'null');

      // 检查不同的响应格式
      if (Array.isArray(response)) {
        console.log('响应是数组格式，直接使用:', response);
        console.log('设置dateBudgets状态，数组长度:', response.length);
        setDateBudgets(response);
        return response;
      } else if (response?.data) {
        const budgets = response.data;
        console.log('从data字段获取到的预算:', budgets);
        setDateBudgets(budgets);
        return budgets;
      } else if (response?.budgets) {
        const budgets = response.budgets;
        console.log('从budgets字段获取到的预算:', budgets);
        setDateBudgets(budgets);
        return budgets;
      } else {
        console.log('API响应格式不匹配:', response);
        setDateBudgets([]);
        return [];
      }
    } catch (error) {
      console.error('根据日期获取预算失败:', error);
      console.error('错误状态码:', error?.response?.status);
      console.error('错误响应数据:', error?.response?.data);
      console.error('错误详情:', error.response || error.message || error);
      setDateBudgets([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 监听日期和账本变化，重新获取预算
  useEffect(() => {
    if (date && currentAccountBook?.id) {
      console.log('日期或账本变化，重新获取预算:', { date, accountBookId: currentAccountBook.id });
      fetchBudgetsByDate(date, currentAccountBook.id);
      // 重置已初始化状态和选中的预算
      setHasInitialized(false);
      setSelectedBudget(null);
      setBudgetId('');
    }
  }, [date, currentAccountBook?.id, fetchBudgetsByDate, setBudgetId]);

  // 使用日期获取的预算数据
  console.log(
    '准备格式化预算数据，dateBudgets长度:',
    dateBudgets.length,
    'dateBudgets:',
    dateBudgets,
  );
  const formattedBudgets: Budget[] = dateBudgets.map((budget) => {
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

  // 智能推荐预算的逻辑 - 在编辑模式下禁用
  const selectRecommendedBudget = useCallback(() => {
    // 如果是编辑模式，不执行推荐逻辑
    const isInEditMode = isEditMode || storeIsEditMode;
    if (isInEditMode) {
      console.log('编辑模式：跳过智能推荐预算逻辑');
      return;
    }

    console.log('selectRecommendedBudget 调用:', {
      formattedBudgetsLength: formattedBudgets.length,
      selectedBudget,
      currentUser: currentUser?.name,
      hasInitialized,
      date,
      isEditMode: isInEditMode,
    });

    if (formattedBudgets.length > 0 && !selectedBudget && currentUser && !hasInitialized) {
      console.log('获取到日期匹配的预算:', formattedBudgets);
      console.log('当前登录用户:', currentUser);

      // 优先级1: 查找与当前登录用户名称匹配的个人预算
      const userBudget = formattedBudgets.find(
        (b) => b.familyMemberName === currentUser.name && b.budgetType === 'PERSONAL',
      );

      if (userBudget) {
        console.log('智能推荐: 找到当前用户的个人预算:', userBudget);
        setSelectedBudget(userBudget);
        setBudgetId(userBudget.id);
        setHasInitialized(true);
        return;
      }

      // 优先级2: 查找没有familyMemberId的个人预算
      const personalBudget = formattedBudgets.find(
        (b) => !b.familyMemberId && b.budgetType === 'PERSONAL',
      );

      if (personalBudget) {
        console.log('智能推荐: 设置默认个人预算:', personalBudget);
        setSelectedBudget(personalBudget);
        setBudgetId(personalBudget.id);
        setHasInitialized(true);
        return;
      }

      // 优先级3: 使用第一个预算（通用预算）
      if (formattedBudgets.length > 0) {
        console.log('智能推荐: 使用第一个可用预算:', formattedBudgets[0]);
        setSelectedBudget(formattedBudgets[0]);
        setBudgetId(formattedBudgets[0].id);
        setHasInitialized(true);
      }
    }
  }, [
    formattedBudgets,
    selectedBudget,
    currentUser,
    hasInitialized,
    date,
    setBudgetId,
    isEditMode,
    storeIsEditMode,
  ]);

  // 当日期预算数据加载完成后，智能推荐预算
  useEffect(() => {
    selectRecommendedBudget();
  }, [selectRecommendedBudget]);

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

  // 获取预算有效期显示
  const getBudgetPeriod = (budget: Budget) => {
    if (budget.startDate && budget.endDate) {
      const start = new Date(budget.startDate);
      const end = new Date(budget.endDate);

      // 如果是通用预算，显示包含年份的完整日期
      if (budget.budgetType === 'GENERAL') {
        const startStr = `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()}`;
        const endStr = `${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()}`;
        return `${startStr} - ${endStr}`;
      } else {
        // 个人预算只显示月/日
        const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
        const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
        return `${startStr} - ${endStr}`;
      }
    }
    return '未知周期';
  };

  // 判断预算是否推荐
  const isRecommendedBudget = (budget: Budget) => {
    // 优先推荐与当前用户匹配的个人预算
    if (budget.familyMemberName === currentUser?.name && budget.budgetType === 'PERSONAL') {
      return true;
    }
    // 其次推荐没有familyMemberId的个人预算
    if (!budget.familyMemberId && budget.budgetType === 'PERSONAL') {
      return true;
    }
    return false;
  };

  // 获取预算状态
  const getBudgetStatus = (budget: Budget) => {
    const balance = calculateBudgetBalance(budget);
    if (balance < 0) {
      return { status: 'over', text: '超支', color: '#ef4444' };
    } else if (balance / (budget.amount + (budget.rolloverAmount || 0)) < 0.2) {
      return { status: 'low', text: '余额不足', color: '#f59e0b' };
    } else {
      return { status: 'good', text: '正常', color: '#10b981' };
    }
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
              <div className="budget-name">
                {getBudgetDisplayName(selectedBudget)}
                {isRecommendedBudget(selectedBudget) && (
                  <span className="recommended-badge">推荐</span>
                )}
              </div>
              <div className="budget-details">
                <span>余额: {formatAmount(calculateBudgetBalance(selectedBudget))}</span>
                <span className="budget-period">({getBudgetPeriod(selectedBudget)})</span>
              </div>
            </>
          ) : (
            <div className="budget-name">{date ? `选择 ${date} 的预算` : '请先选择日期'}</div>
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
                  <span>{date ? `${date} 日期范围内没有可用的预算` : '没有可用的预算'}</span>
                  <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                    {date ? '请检查该日期是否在任何预算周期内' : '请先选择记账日期'}
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
                        .map((budget) => {
                          const budgetStatus = getBudgetStatus(budget);
                          const isRecommended = isRecommendedBudget(budget);

                          return (
                            <div
                              key={budget.id}
                              className={cn(
                                'budget-item',
                                selectedBudget?.id === budget.id && 'active',
                                isRecommended && 'recommended',
                              )}
                              onClick={() => handleBudgetSelect(budget)}
                            >
                              <div className="budget-item-info">
                                <div className="budget-item-name">
                                  {getBudgetDisplayName(budget)}
                                  {isRecommended && (
                                    <span className="recommended-badge-small">推荐</span>
                                  )}
                                </div>
                                <div className="budget-item-details">
                                  <span>余额: {formatAmount(calculateBudgetBalance(budget))}</span>
                                  <span className="budget-period-small">
                                    ({getBudgetPeriod(budget)})
                                  </span>
                                </div>
                                <div
                                  className="budget-item-status"
                                  style={{ color: budgetStatus.color }}
                                >
                                  {budgetStatus.text}
                                </div>
                              </div>
                              {selectedBudget?.id === budget.id && (
                                <div className="budget-item-check">
                                  <i className="fas fa-check"></i>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </>
                  )}

                  {/* 通用预算组 */}
                  {formattedBudgets.filter((b) => b.budgetType === 'GENERAL').length > 0 && (
                    <>
                      <div className="budget-group-header">通用预算</div>
                      {formattedBudgets
                        .filter((budget) => budget.budgetType === 'GENERAL')
                        .map((budget) => {
                          const budgetStatus = getBudgetStatus(budget);
                          const isRecommended = isRecommendedBudget(budget);

                          return (
                            <div
                              key={budget.id}
                              className={cn(
                                'budget-item',
                                selectedBudget?.id === budget.id && 'active',
                                isRecommended && 'recommended',
                              )}
                              onClick={() => handleBudgetSelect(budget)}
                            >
                              <div className="budget-item-info">
                                <div className="budget-item-name">
                                  {getBudgetDisplayName(budget)}
                                  {isRecommended && (
                                    <span className="recommended-badge-small">推荐</span>
                                  )}
                                </div>
                                <div className="budget-item-details">
                                  <span>余额: {formatAmount(calculateBudgetBalance(budget))}</span>
                                  <span className="budget-period-small">
                                    ({getBudgetPeriod(budget)})
                                  </span>
                                </div>
                                <div
                                  className="budget-item-status"
                                  style={{ color: budgetStatus.color }}
                                >
                                  {budgetStatus.text}
                                </div>
                              </div>
                              {selectedBudget?.id === budget.id && (
                                <div className="budget-item-check">
                                  <i className="fas fa-check"></i>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
