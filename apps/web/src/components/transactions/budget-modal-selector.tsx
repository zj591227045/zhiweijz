'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useAccountBookStore } from '@/store/account-book-store';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { X, Check, Wallet, Users, Calendar, TrendingUp } from 'lucide-react';

interface Budget {
  id: string;
  name: string;
  budgetType: 'PERSONAL' | 'GENERAL';
  userId?: string;
  userName?: string;
  familyMemberId?: string;
  familyMemberName?: string;
  startDate: string;
  endDate: string;
  amount: number;
  spent?: number;
  remaining?: number;
}

interface BudgetModalSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBudgetId: string | null;
  onBudgetChange: (budgetId: string | null) => void;
  startDate?: string;
  endDate?: string;
  enableAggregation?: boolean;
}

/**
 * 预算选择器模态框组件
 * 提供更美观的预算选择界面，显示详细的预算信息
 */
export const BudgetModalSelector: React.FC<BudgetModalSelectorProps> = ({
  isOpen,
  onClose,
  selectedBudgetId,
  onBudgetChange,
  startDate,
  endDate,
  enableAggregation = true,
}) => {
  const { currentAccountBook } = useAccountBookStore();
  const { isAuthenticated } = useAuthStore();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hasUnbudgetedTransactions, setHasUnbudgetedTransactions] = useState(false);

  // 获取预算列表
  const fetchBudgets = async () => {
    if (!currentAccountBook?.id || !isAuthenticated) {
      setBudgets([]);
      setHasUnbudgetedTransactions(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        accountBookId: currentAccountBook.id,
      };

      // 如果有时间范围，添加到查询参数中
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }

      // 并行获取预算列表和检查无预算记账
      const [budgetResponse, unbudgetedResponse] = await Promise.all([
        apiClient.get('/budgets', { params }),
        apiClient.get('/statistics/check-unbudgeted', { params }),
      ]);

      // 处理预算列表响应
      if (budgetResponse && Array.isArray(budgetResponse.data)) {
        setBudgets(budgetResponse.data);
      } else if (Array.isArray(budgetResponse)) {
        setBudgets(budgetResponse);
      } else {
        setBudgets([]);
      }

      // 处理无预算记账检查响应
      setHasUnbudgetedTransactions(unbudgetedResponse?.hasUnbudgetedTransactions || false);
    } catch (error: any) {
      console.error('获取预算列表失败:', error);
      setError('获取预算列表失败');
      setBudgets([]);
      setHasUnbudgetedTransactions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 当模态框打开时获取预算列表
  useEffect(() => {
    if (isOpen) {
      fetchBudgets();
    }
  }, [isOpen, isAuthenticated, currentAccountBook?.id, startDate, endDate]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 根据时间范围过滤预算
  const getFilteredBudgets = () => {
    if (!startDate || !endDate) {
      return budgets;
    }

    const filterStartDate = new Date(startDate);
    const filterEndDate = new Date(endDate);

    return budgets.filter((budget) => {
      const budgetStartDate = new Date(budget.startDate);
      const budgetEndDate = new Date(budget.endDate);

      // 预算时间范围与筛选时间范围有重叠
      return budgetStartDate <= filterEndDate && budgetEndDate >= filterStartDate;
    });
  };

  // 聚合相同用户的个人预算（跨月份）
  const aggregatePersonalBudgets = (budgets: Budget[]) => {
    const userBudgetMap = new Map<string, Budget[]>();

    // 按用户分组个人预算
    budgets.forEach((budget) => {
      if (budget.budgetType === 'PERSONAL') {
        const userKey = budget.userId || 'unknown';
        if (!userBudgetMap.has(userKey)) {
          userBudgetMap.set(userKey, []);
        }
        userBudgetMap.get(userKey)!.push(budget);
      }
    });

    // 为每个用户创建聚合预算
    const aggregatedBudgets: Budget[] = [];
    userBudgetMap.forEach((userBudgets, userId) => {
      if (userBudgets.length === 1) {
        // 只有一个预算，直接使用
        aggregatedBudgets.push(userBudgets[0]);
      } else {
        // 多个预算，创建聚合预算
        const totalAmount = userBudgets.reduce((sum, budget) => sum + (budget.amount || 0), 0);
        const totalSpent = userBudgets.reduce((sum, budget) => sum + (budget.spent || 0), 0);
        const totalRemaining = userBudgets.reduce(
          (sum, budget) => sum + (budget.remaining || 0),
          0,
        );

        // 使用第一个预算作为基础，更新金额信息
        const aggregatedBudget: Budget = {
          ...userBudgets[0],
          id: `aggregated_${userId}`, // 特殊ID标识聚合预算
          name: `${userBudgets[0].userName || '个人'}预算 (${userBudgets.length}个月)`,
          amount: totalAmount,
          spent: totalSpent,
          remaining: totalRemaining,
          // 使用最早的开始日期和最晚的结束日期
          startDate: userBudgets.reduce(
            (earliest, budget) => (budget.startDate < earliest ? budget.startDate : earliest),
            userBudgets[0].startDate,
          ),
          endDate: userBudgets.reduce(
            (latest, budget) => (budget.endDate > latest ? budget.endDate : latest),
            userBudgets[0].endDate,
          ),
        };

        aggregatedBudgets.push(aggregatedBudget);
      }
    });

    return aggregatedBudgets;
  };

  const filteredBudgets = getFilteredBudgets();

  // 按预算类型分组并根据设置决定是否聚合个人预算
  const personalBudgets = enableAggregation
    ? aggregatePersonalBudgets(filteredBudgets)
    : filteredBudgets.filter((budget) => budget.budgetType === 'PERSONAL');
  const generalBudgets = filteredBudgets.filter((budget) => budget.budgetType === 'GENERAL');

  // 处理预算选择
  const handleBudgetSelect = (budgetId: string | null) => {
    onBudgetChange(budgetId);
    handleClose();
  };

  // 处理关闭
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  // 格式化预算显示信息
  const formatBudgetInfo = (budget: Budget) => {
    const spent = budget.spent || 0;
    const amount = budget.amount || 0;
    const remaining = budget.remaining || amount - spent;
    const usagePercentage = amount > 0 ? Math.round((spent / amount) * 100) : 0;

    return {
      spent,
      amount,
      remaining,
      usagePercentage,
      isAggregated: budget.id.startsWith('aggregated_'),
    };
  };

  // 获取预算状态颜色
  const getBudgetStatusColor = (usagePercentage: number) => {
    if (usagePercentage >= 90) return 'text-red-600 bg-red-50';
    if (usagePercentage >= 70) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black bg-opacity-50 backdrop-blur-sm',
        isClosing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200',
      )}
      onClick={(e) => {
        // 点击背景关闭模态框
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className={cn(
          'w-full max-w-md bg-white rounded-2xl shadow-2xl',
          'max-h-[80vh] overflow-hidden',
          isClosing ? 'animate-out zoom-out-95 duration-200' : 'animate-in zoom-in-95 duration-200',
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
        aria-describedby="budget-modal-description"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3
            id="budget-modal-title"
            className="text-lg font-semibold text-gray-900 flex items-center gap-2"
          >
            <Wallet className="w-5 h-5 text-blue-600" />
            选择预算
          </h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="关闭预算选择器"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="overflow-y-auto max-h-[60vh]">
          <div id="budget-modal-description" className="sr-only">
            选择一个预算来筛选统计数据，或选择全部预算查看所有数据
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">加载中...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <span>{error}</span>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* 全部预算选项 */}
              <button
                onClick={() => handleBudgetSelect(null)}
                className={cn(
                  'w-full p-4 rounded-xl border-2 transition-all',
                  'flex items-center justify-between',
                  selectedBudgetId === null
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-lg">🌟</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">全部预算</div>
                    <div className="text-sm text-gray-500">显示所有预算的数据</div>
                  </div>
                </div>
                {selectedBudgetId === null && <Check className="w-5 h-5 text-blue-600" />}
              </button>

              {/* 无预算选项 - 只有当存在无预算记账时才显示 */}
              {hasUnbudgetedTransactions && (
                <button
                  onClick={() => handleBudgetSelect('NO_BUDGET')}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 transition-all',
                    'flex items-center justify-between',
                    selectedBudgetId === 'NO_BUDGET'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-white text-lg">📝</span>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">无预算</div>
                      <div className="text-sm text-gray-500">显示未分配预算的记账</div>
                    </div>
                  </div>
                  {selectedBudgetId === 'NO_BUDGET' && (
                    <Check className="w-5 h-5 text-orange-600" />
                  )}
                </button>
              )}

              {/* 个人预算 */}
              {personalBudgets.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">个人预算</span>
                  </div>
                  <div className="space-y-2">
                    {personalBudgets.map((budget) => {
                      const info = formatBudgetInfo(budget);
                      return (
                        <button
                          key={budget.id}
                          onClick={() => handleBudgetSelect(budget.id)}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 transition-all text-left',
                            selectedBudgetId === budget.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900">{budget.name}</span>
                                {info.isAggregated && (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                    聚合
                                  </span>
                                )}
                              </div>

                              {budget.userName && (
                                <div className="text-sm text-gray-600 mb-2">
                                  👤 {budget.userName}
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">预算总额</span>
                                  <span className="font-medium">
                                    ¥{info.amount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">已使用</span>
                                  <span
                                    className={cn(
                                      'font-medium',
                                      info.usagePercentage >= 90 ? 'text-red-600' : 'text-gray-900',
                                    )}
                                  >
                                    ¥{info.spent.toLocaleString()} ({info.usagePercentage}%)
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">剩余</span>
                                  <span className="font-medium text-green-600">
                                    ¥{info.remaining.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* 进度条 */}
                              <div className="mt-3">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={cn(
                                      'h-2 rounded-full transition-all',
                                      info.usagePercentage >= 90
                                        ? 'bg-red-500'
                                        : info.usagePercentage >= 70
                                          ? 'bg-orange-500'
                                          : 'bg-green-500',
                                    )}
                                    style={{ width: `${Math.min(info.usagePercentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {selectedBudgetId === budget.id && (
                              <Check className="w-5 h-5 text-blue-600 ml-3 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 通用预算 */}
              {generalBudgets.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">通用预算</span>
                  </div>
                  <div className="space-y-2">
                    {generalBudgets.map((budget) => {
                      const info = formatBudgetInfo(budget);
                      return (
                        <button
                          key={budget.id}
                          onClick={() => handleBudgetSelect(budget.id)}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 transition-all text-left',
                            selectedBudgetId === budget.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900">{budget.name}</span>
                              </div>

                              {budget.familyMemberName && (
                                <div className="text-sm text-gray-600 mb-2">
                                  👥 {budget.familyMemberName}
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">预算总额</span>
                                  <span className="font-medium">
                                    ¥{info.amount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">已使用</span>
                                  <span
                                    className={cn(
                                      'font-medium',
                                      info.usagePercentage >= 90 ? 'text-red-600' : 'text-gray-900',
                                    )}
                                  >
                                    ¥{info.spent.toLocaleString()} ({info.usagePercentage}%)
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">剩余</span>
                                  <span className="font-medium text-green-600">
                                    ¥{info.remaining.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* 进度条 */}
                              <div className="mt-3">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={cn(
                                      'h-2 rounded-full transition-all',
                                      info.usagePercentage >= 90
                                        ? 'bg-red-500'
                                        : info.usagePercentage >= 70
                                          ? 'bg-orange-500'
                                          : 'bg-green-500',
                                    )}
                                    style={{ width: `${Math.min(info.usagePercentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {selectedBudgetId === budget.id && (
                              <Check className="w-5 h-5 text-green-600 ml-3 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 空状态 */}
              {personalBudgets.length === 0 && generalBudgets.length === 0 && (
                <div className="text-center py-12">
                  <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">当前时间范围内没有可用的预算</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
