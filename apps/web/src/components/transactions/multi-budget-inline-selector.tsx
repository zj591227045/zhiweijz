'use client';

import { useState, useEffect } from 'react';
import { useBudgetStore } from '@/store/budget-store';
import { BudgetAllocationItem } from '@/store/transaction-form-store';
import { Budget } from '@/types';
import './multi-budget-inline-selector-compact.css';

// 格式化金额显示
const formatAmount = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

interface MultiBudgetInlineSelectorProps {
  totalAmount: number;
  selectedAllocations: BudgetAllocationItem[];
  onAllocationsChange: (allocations: BudgetAllocationItem[]) => void;
  onConfirm?: () => void; // 确认分摊后的回调
}

export function MultiBudgetInlineSelector({
  totalAmount,
  selectedAllocations,
  onAllocationsChange,
  onConfirm
}: MultiBudgetInlineSelectorProps) {
  const { budgets } = useBudgetStore();
  const [localAllocations, setLocalAllocations] = useState<BudgetAllocationItem[]>([]);

  // 初始化本地分摊数据
  useEffect(() => {
    setLocalAllocations(selectedAllocations);
  }, [selectedAllocations]);

  // 获取可用的预算列表（过滤掉金额为0的预算），并按类型排序
  const availableBudgets = budgets
    .filter(budget => budget.amount > 0)
    .sort((a, b) => {
      // 优先显示个人预算，然后显示通用预算
      if (a.budgetType === 'PERSONAL' && b.budgetType !== 'PERSONAL') return -1;
      if (a.budgetType !== 'PERSONAL' && b.budgetType === 'PERSONAL') return 1;
      return 0;
    });

  // 获取预算的显示名称
  const getBudgetDisplayName = (budget: Budget): string => {
    // 对于个人预算，优先显示成员名称
    if (budget.budgetType === 'PERSONAL' && budget.familyMemberName) {
      return budget.familyMemberName;
    }
    // 对于通用预算，优先显示预算名称
    if (budget.name) {
      return budget.name;
    }
    // 其次显示分类名称
    if (budget.category?.name) {
      return budget.category.name;
    }
    // 最后显示预算ID
    return `预算 ${budget.id.slice(-4)}`;
  };

  // 计算预算余额（预算总金额 + 结转金额 - 已用金额）
  const calculateBudgetBalance = (budget: Budget): number => {
    const totalAmount = budget.amount + (budget.rolloverAmount || 0);
    return totalAmount - (budget.spent || 0);
  };

  // 获取预算状态
  const getBudgetStatus = (budget: Budget) => {
    const balance = calculateBudgetBalance(budget);
    const totalAmount = budget.amount + (budget.rolloverAmount || 0);

    if (balance < 0) {
      return { status: 'over', text: '超支', color: '#ef4444' };
    } else if (totalAmount > 0 && balance / totalAmount < 0.2) {
      return { status: 'low', text: '余额不足', color: '#f59e0b' };
    } else {
      return { status: 'good', text: '正常', color: '#10b981' };
    }
  };

  // 获取已分摊总金额
  const getTotalAllocatedAmount = (): number => {
    return localAllocations.reduce((sum, item) => sum + item.amount, 0);
  };

  // 检查金额是否匹配
  const isAmountMatched = (): boolean => {
    return Math.abs(getTotalAllocatedAmount() - totalAmount) < 0.01;
  };

  // 处理预算选择
  const handleBudgetToggle = (budget: Budget) => {
    const existingIndex = localAllocations.findIndex(item => item.budgetId === budget.id);

    if (existingIndex >= 0) {
      // 取消选择
      const newAllocations = localAllocations.filter(item => item.budgetId !== budget.id);

      // 如果还有其他选中的预算，重新平均分摊
      if (newAllocations.length > 0) {
        const averageAmount = Math.round((totalAmount / newAllocations.length) * 100) / 100;
        const updatedAllocations = newAllocations.map(allocation => ({
          ...allocation,
          amount: averageAmount
        }));
        setLocalAllocations(updatedAllocations);
        onAllocationsChange(updatedAllocations);
      } else {
        setLocalAllocations(newAllocations);
        onAllocationsChange(newAllocations);
      }
    } else {
      // 选择预算 - 重新计算所有已选择预算的平均分摊
      const newAllocation: BudgetAllocationItem = {
        memberId: budget.id, // 使用预算ID作为成员ID
        memberName: getBudgetDisplayName(budget),
        budgetId: budget.id,
        budgetName: getBudgetDisplayName(budget),
        amount: 0, // 先设为0，后面会重新计算
        isSelected: true
      };

      const newAllocations = [...localAllocations, newAllocation];

      // 重新平均分摊总金额
      const averageAmount = Math.round((totalAmount / newAllocations.length) * 100) / 100;
      const updatedAllocations = newAllocations.map(allocation => ({
        ...allocation,
        amount: averageAmount
      }));

      setLocalAllocations(updatedAllocations);
      onAllocationsChange(updatedAllocations);
    }
  };

  // 处理金额变更
  const handleAmountChange = (budgetId: string, amount: number) => {
    const newAllocations = localAllocations.map(item =>
      item.budgetId === budgetId ? { ...item, amount } : item
    );
    setLocalAllocations(newAllocations);
    onAllocationsChange(newAllocations);
  };

  // 确认分摊 - 保存当前分摊结果
  const handleConfirmSplit = () => {
    if (localAllocations.length === 0 || !isAmountMatched()) return;

    // 直接使用当前的分摊结果，不做任何修改
    onAllocationsChange(localAllocations);

    // 调用确认回调，关闭预算选择器
    if (onConfirm) {
      onConfirm();
    }
  };

  if (!totalAmount || totalAmount <= 0) {
    return (
      <div className="multi-budget-inline-hint">
        <i className="fas fa-info-circle"></i>
        <span>请先输入记账金额</span>
      </div>
    );
  }

  return (
    <div className="multi-budget-inline-selector">



      {/* 紧凑的预算列表 */}
      <div className="compact-budget-list">
        {availableBudgets.map(budget => {
          const allocation = localAllocations.find(item => item.budgetId === budget.id);
          const isSelected = !!allocation;

          return (
            <div key={budget.id} className={`compact-budget-item ${isSelected ? 'selected' : ''}`}>
              <div className="budget-row">
                <div className="budget-info">
                  <div className="budget-avatar">
                    {getBudgetDisplayName(budget).charAt(0)}
                  </div>
                  <div className="budget-details">
                    <div className="budget-name">
                      {getBudgetDisplayName(budget)}
                      <span
                        className="budget-status-badge"
                        style={{
                          backgroundColor: getBudgetStatus(budget).color,
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginLeft: '8px',
                          fontWeight: '500'
                        }}
                      >
                        {getBudgetStatus(budget).text}
                      </span>
                    </div>
                    <div className="budget-balance" style={{ color: getBudgetStatus(budget).color }}>
                      余额: {formatAmount(calculateBudgetBalance(budget))}
                    </div>
                  </div>
                </div>
                <div className="budget-actions">
                  {isSelected && allocation ? (
                    <input
                      type="number"
                      className="amount-input"
                      step="0.01"
                      min="0"
                      max={totalAmount}
                      value={allocation.amount}
                      onChange={(e) => handleAmountChange(budget.id, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  ) : (
                    <span className="amount-placeholder">0</span>
                  )}
                  <label className="budget-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleBudgetToggle(budget)}
                    />
                    <span className="checkmark"></span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {availableBudgets.length === 0 && (
        <div className="inline-no-members">
          <i className="fas fa-wallet"></i>
          <span>暂无可用预算</span>
        </div>
      )}

      {/* 底部汇总 */}
      {localAllocations.length > 0 && (
        <div className={`bottom-summary ${!isAmountMatched() ? 'has-error' : ''}`}>
          <div className="summary-info">
            <span className="summary-text">已分摊: {formatAmount(getTotalAllocatedAmount())}</span>
            {isAmountMatched() ? (
              <span className="match-indicator">
                <i className="fas fa-check"></i>
                金额匹配
              </span>
            ) : (
              <span className="error-indicator">
                <i className="fas fa-exclamation-triangle"></i>
                差额: {formatAmount(totalAmount - getTotalAllocatedAmount())}
              </span>
            )}
          </div>
          <button
            className="confirm-split-btn"
            onClick={handleConfirmSplit}
            disabled={localAllocations.length === 0 || !isAmountMatched()}
          >
            {isAmountMatched() ? '确认分摊' : '金额不匹配'}
          </button>
        </div>
      )}
    </div>
  );
}
