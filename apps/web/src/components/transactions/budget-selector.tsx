"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTransactionFormStore } from "@/store/transaction-form-store";
import { useAccountBookStore } from "@/store/account-book-store";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import "./budget-selector.css";

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
}

export function BudgetSelector() {
  const {
    budgetId,
    setBudgetId
  } = useTransactionFormStore();

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
  const formattedBudgets: Budget[] = budgets.map(budget => ({
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

  // 自动选择默认预算的逻辑
  const selectDefaultBudget = useCallback(() => {
    if (formattedBudgets.length > 0 && !selectedBudget && currentUser && !hasInitialized) {
      console.log("获取到活跃预算:", formattedBudgets);
      console.log("当前登录用户:", currentUser);

      // 查找与当前登录用户名称匹配的预算
      const userBudget = formattedBudgets.find(b =>
        b.familyMemberName === currentUser.name && b.budgetType === 'PERSONAL'
      );

      if (userBudget) {
        console.log("找到当前用户的预算:", userBudget);
        setSelectedBudget(userBudget);
        setBudgetId(userBudget.id);
        setHasInitialized(true);
      } else {
        // 如果没有找到匹配的预算，查找没有familyMemberId的个人预算
        const personalBudget = formattedBudgets.find(b =>
          !b.familyMemberId && b.budgetType === 'PERSONAL'
        );

        if (personalBudget) {
          console.log("设置默认个人预算:", personalBudget);
          setSelectedBudget(personalBudget);
          setBudgetId(personalBudget.id);
          setHasInitialized(true);
        } else if (formattedBudgets.length > 0) {
          // 如果没有找到个人预算，使用第一个预算
          console.log("未找到个人预算，使用第一个预算:", formattedBudgets[0]);
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
      const budget = formattedBudgets.find(b => b.id === budgetId);
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
      maximumFractionDigits: 2
    }).format(amount);
  };

  // 计算预算余额
  const calculateBudgetBalance = (budget: Budget) => {
    const totalAmount = budget.amount + (budget.rolloverAmount || 0);
    return totalAmount - budget.spent;
  };

  // 获取预算显示名称
  const getBudgetDisplayName = (budget: Budget) => {
    if (budget.budgetType === 'PERSONAL' && budget.familyMemberName) {
      return `${budget.name} (${budget.familyMemberName})`;
    }
    return budget.name;
  };

  return (
    <div className="budget-selector-container">
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
                    className={cn(
                      "budget-item",
                      !selectedBudget && "active"
                    )}
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
                            className={cn(
                              "budget-item",
                              selectedBudget?.id === budget.id && "active"
                            )}
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
                            className={cn(
                              "budget-item",
                              selectedBudget?.id === budget.id && "active"
                            )}
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
