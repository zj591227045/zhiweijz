"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Budget, useTransactionFormStore } from "@/store/transaction-form-store";

export function BudgetSelector() {
  const {
    budgets,
    selectedBudget,
    isBudgetSelectorOpen,
    setSelectedBudget,
    toggleBudgetSelector
  } = useTransactionFormStore();

  // 处理预算选择
  const handleBudgetSelect = (budget: Budget) => {
    setSelectedBudget(budget);
    toggleBudgetSelector(false);
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
    // 预算金额 = 预算金额 + 结转预算金额
    const totalAmount = budget.amount + (budget.rolloverAmount || 0);
    // 预算余额 = 预算金额 - 通过预算ID过滤的交易记录总金额
    return totalAmount - budget.spent;
  };

  // 获取预算显示名称
  const getBudgetDisplayName = (budget: Budget) => {
    // 如果是通用预算，只显示预算名称
    if (budget.budgetType === 'GENERAL') {
      return budget.name;
    }

    // 如果有家庭成员名称，显示预算名称和家庭成员名称
    if (budget.familyMemberName) {
      return `${budget.name} (${budget.familyMemberName})`;
    }
    // 如果有家庭成员ID但没有名称
    else if (budget.familyMemberId) {
      return `${budget.name} (未知成员)`;
    }
    // 如果有用户名称
    else if (budget.userName) {
      return `${budget.name} (${budget.userName})`;
    }
    // 如果都没有，只显示预算名称
    return budget.name;
  };

  return (
    <div className="budget-selector-container">
      {/* 预算选择器预览 */}
      <div
        className="budget-selector-preview"
        onClick={() => toggleBudgetSelector(true)}
      >
        <div className="budget-selector-icon">
          <i className="fas fa-wallet"></i>
        </div>
        <div className="budget-selector-info">
          <div className="budget-name">
            {selectedBudget ? getBudgetDisplayName(selectedBudget) : "选择预算"}
          </div>
          {selectedBudget && (
            <div className="budget-balance">
              余额: {formatAmount(calculateBudgetBalance(selectedBudget))}
            </div>
          )}
        </div>
        <div className="budget-selector-arrow">
          <i className="fas fa-chevron-down"></i>
        </div>
      </div>

      {/* 预算选择器弹窗 */}
      {isBudgetSelectorOpen && (
        <div className="budget-selector-overlay" onClick={() => toggleBudgetSelector(false)}>
          <div
            className="budget-selector-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="budget-selector-header">
              <h3>选择预算</h3>
              <button
                className="close-button"
                onClick={() => toggleBudgetSelector(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="budget-selector-content">
              {budgets.length === 0 ? (
                <div className="no-budgets-message">
                  <i className="fas fa-info-circle"></i>
                  <span>没有可用的预算</span>
                </div>
              ) : (
                <div className="budget-list">
                  {/* 个人预算组 */}
                  {budgets.filter(b => b.budgetType !== 'GENERAL').length > 0 && (
                    <>
                      <div className="budget-group-header">个人预算</div>
                      {budgets
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
                  {budgets.filter(b => b.budgetType === 'GENERAL').length > 0 && (
                    <>
                      <div className="budget-group-header">通用预算</div>
                      {budgets
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
