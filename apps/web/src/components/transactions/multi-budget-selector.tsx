'use client';

import { useState, useEffect } from 'react';
import { useAccountBookStore } from '@/store/account-book-store';
import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';
import { FamilyApiService } from '@/api/family-api';
import { BudgetAllocationItem } from '@/store/transaction-form-store';
import { Budget } from '@/types';
import { formatAmount } from '@/lib/utils';
import './multi-budget-selector.css';

interface FamilyMember {
  id: string;
  name: string;
  userId?: string;
  isCustodial: boolean;
}

interface MultiBudgetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  selectedAllocations: BudgetAllocationItem[];
  onAllocationsChange: (allocations: BudgetAllocationItem[]) => void;
  transactionDate: string;
}

export function MultiBudgetSelector({
  isOpen,
  onClose,
  totalAmount,
  selectedAllocations,
  onAllocationsChange,
  transactionDate,
}: MultiBudgetSelectorProps) {
  const { currentAccountBook } = useAccountBookStore();
  const { user: currentUser } = useAuthStore();
  const { budgets, fetchActiveBudgets } = useBudgetStore();

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAllocations, setLocalAllocations] = useState<BudgetAllocationItem[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // 获取家庭成员列表
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!currentAccountBook?.familyId || !isOpen) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await FamilyApiService.getFamilyById(currentAccountBook.familyId);

        // 转换为所需格式，包含当前用户
        const formattedMembers: FamilyMember[] = response.members.map(member => ({
          id: member.userId || member.id,
          name: member.name,
          userId: member.userId,
          isCustodial: member.isCustodial,
        }));

        setFamilyMembers(formattedMembers);
      } catch (err) {
        console.error('获取家庭成员失败:', err);
        setError('获取家庭成员失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [currentAccountBook?.familyId, isOpen]);

  // 获取预算数据
  useEffect(() => {
    if (currentAccountBook?.id && isOpen) {
      fetchActiveBudgets(currentAccountBook.id);
    }
  }, [currentAccountBook?.id, isOpen, fetchActiveBudgets]);

  // 初始化本地分摊数据
  useEffect(() => {
    if (isOpen) {
      setLocalAllocations([...selectedAllocations]);
    }
  }, [isOpen, selectedAllocations]);

  // 键盘检测和处理
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      // 检测视口高度变化来判断键盘是否显示
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      const heightDiff = windowHeight - viewportHeight;

      // 如果高度差超过150px，认为键盘已显示
      if (heightDiff > 150) {
        setKeyboardHeight(heightDiff);
        setIsKeyboardVisible(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    };

    // 监听视口变化
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // 初始检测
    handleResize();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isOpen]);

  // 获取指定日期范围内的预算
  const getAvailableBudgets = () => {
    if (!transactionDate) return [];
    
    const targetDate = new Date(transactionDate);
    return budgets.filter(budget => {
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      return targetDate >= startDate && targetDate <= endDate;
    });
  };

  // 计算已分摊总金额
  const getTotalAllocatedAmount = () => {
    return localAllocations
      .filter(item => item.isSelected)
      .reduce((sum, item) => sum + item.amount, 0);
  };

  // 计算剩余金额
  const getRemainingAmount = () => {
    return totalAmount - getTotalAllocatedAmount();
  };

  // 处理成员选择/取消选择
  const handleMemberToggle = (member: FamilyMember) => {
    const existingIndex = localAllocations.findIndex(
      item => item.memberId === member.id
    );

    if (existingIndex >= 0) {
      // 取消选择
      const newAllocations = localAllocations.filter((_, index) => index !== existingIndex);
      setLocalAllocations(newAllocations);
    } else {
      // 选择成员，需要选择预算
      const availableBudgets = getAvailableBudgets();
      const memberBudgets = availableBudgets.filter(budget => 
        budget.userId === member.userId || 
        budget.familyMemberId === member.id
      );

      if (memberBudgets.length > 0) {
        // 默认选择第一个预算
        const defaultBudget = memberBudgets[0];
        const remainingAmount = getRemainingAmount();
        const defaultAmount = remainingAmount > 0 ? remainingAmount : 0;

        const newAllocation: BudgetAllocationItem = {
          budgetId: defaultBudget.id,
          budgetName: defaultBudget.name || '未命名预算',
          memberName: member.name,
          memberId: member.id,
          amount: defaultAmount,
          isSelected: true,
        };

        setLocalAllocations([...localAllocations, newAllocation]);
      }
    }
  };

  // 处理预算选择变更
  const handleBudgetChange = (index: number, budgetId: string) => {
    const availableBudgets = getAvailableBudgets();
    const selectedBudget = availableBudgets.find(b => b.id === budgetId);
    
    if (selectedBudget) {
      const newAllocations = [...localAllocations];
      newAllocations[index] = {
        ...newAllocations[index],
        budgetId: selectedBudget.id,
        budgetName: selectedBudget.name || '未命名预算',
      };
      setLocalAllocations(newAllocations);
    }
  };

  // 处理金额变更
  const handleAmountChange = (index: number, amount: number) => {
    const newAllocations = [...localAllocations];
    newAllocations[index] = {
      ...newAllocations[index],
      amount: Math.max(0, amount),
    };
    setLocalAllocations(newAllocations);
  };

  // 平均分摊
  const handleEvenSplit = () => {
    const selectedAllocations = localAllocations.filter(item => item.isSelected);
    if (selectedAllocations.length === 0) return;

    const averageAmount = Math.round((totalAmount / selectedAllocations.length) * 100) / 100;
    let remainingAmount = totalAmount;

    const newAllocations = localAllocations.map((item, index) => {
      if (!item.isSelected) return item;

      // 最后一个分摊项承担剩余金额，避免精度问题
      const isLast = index === localAllocations.length - 1 ||
                     localAllocations.slice(index + 1).every(a => !a.isSelected);

      if (isLast) {
        return { ...item, amount: remainingAmount };
      } else {
        remainingAmount -= averageAmount;
        return { ...item, amount: averageAmount };
      }
    });

    setLocalAllocations(newAllocations);
  };

  // 快速设置金额
  const handleQuickAmount = (memberId: string, percentage: number) => {
    const index = localAllocations.findIndex(item => item.memberId === memberId);
    if (index >= 0) {
      const amount = Math.round((totalAmount * percentage) * 100) / 100;
      handleAmountChange(index, amount);
    }
  };

  // 确认选择
  const handleConfirm = () => {
    const totalAllocated = getTotalAllocatedAmount();
    
    if (Math.abs(totalAllocated - totalAmount) > 0.01) {
      setError(`分摊总金额(${formatAmount(totalAllocated)})必须等于记账金额(${formatAmount(totalAmount)})`);
      return;
    }

    onAllocationsChange(localAllocations.filter(item => item.isSelected));
    onClose();
  };

  // 获取成员的可用预算
  const getMemberBudgets = (member: FamilyMember) => {
    const availableBudgets = getAvailableBudgets();
    return availableBudgets.filter(budget => 
      budget.userId === member.userId || 
      budget.familyMemberId === member.id
    );
  };

  if (!isOpen) return null;

  return (
    <div className="multi-budget-overlay" onClick={onClose}>
      <div
        className="multi-budget-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: isKeyboardVisible ? `translateY(-${Math.min(keyboardHeight * 0.6, 200)}px)` : 'translateY(0)',
          transition: 'transform 0.3s ease',
        }}
      >
        <div className="multi-budget-header">
          <h3>多人预算分摊</h3>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="multi-budget-content">
          {isLoading ? (
            <div className="loading-state">加载中...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : (
            <>
              {/* 总金额显示 */}
              <div className="amount-summary">
                <div className="total-amount">
                  总金额: {formatAmount(totalAmount)}
                </div>
                <div className="allocation-status">
                  <div className="allocated-amount">
                    已分摊: {formatAmount(getTotalAllocatedAmount())}
                  </div>
                  <div className="status-indicator">
                    {Math.abs(getTotalAllocatedAmount() - totalAmount) < 0.01 ? (
                      <span className="status-match">
                        <i className="fas fa-check"></i>
                        金额匹配
                      </span>
                    ) : (
                      <span className="status-mismatch">
                        <i className="fas fa-exclamation-triangle"></i>
                        差额: {formatAmount(getRemainingAmount())}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 快捷操作 */}
              <div className="quick-actions">
                <button 
                  className="action-button"
                  onClick={handleEvenSplit}
                  disabled={localAllocations.filter(item => item.isSelected).length === 0}
                >
                  平均分摊
                </button>
              </div>

              {/* 成员列表 */}
              <div className="members-list">
                {familyMembers.map(member => {
                  const memberBudgets = getMemberBudgets(member);
                  const allocation = localAllocations.find(item => item.memberId === member.id);
                  const isSelected = !!allocation;

                  return (
                    <div key={member.id} className={`member-card ${isSelected ? 'selected' : ''}`}>
                      <div className="member-info">
                        <div className="member-avatar">
                          {member.name.charAt(0)}
                        </div>
                        <div className="member-details">
                          <div className="member-name">{member.name}</div>
                          {memberBudgets.length > 0 && allocation && (
                            <div className="budget-info">
                              {allocation.budgetName}
                            </div>
                          )}
                          {memberBudgets.length === 0 && (
                            <div className="no-budget-hint">无可用预算</div>
                          )}
                        </div>
                        <div className="member-actions">
                          {isSelected && allocation && (
                            <div className="amount-display">
                              {formatAmount(allocation.amount)}
                            </div>
                          )}
                          <label className="member-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleMemberToggle(member)}
                              disabled={memberBudgets.length === 0}
                            />
                          </label>
                        </div>
                      </div>

                      {isSelected && allocation && (
                        <div className="allocation-details">
                          {/* 预算选择 */}
                          {memberBudgets.length > 1 && (
                            <div className="budget-select">
                              <label>选择预算:</label>
                              <select
                                value={allocation.budgetId}
                                onChange={(e) => {
                                  const index = localAllocations.findIndex(item => item.memberId === member.id);
                                  if (index >= 0) {
                                    handleBudgetChange(index, e.target.value);
                                  }
                                }}
                              >
                                {memberBudgets.map(budget => (
                                  <option key={budget.id} value={budget.id}>
                                    {budget.name || '未命名预算'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* 金额输入 */}
                          <div className="amount-input-section">
                            <label>分摊金额:</label>
                            <div className="amount-input-wrapper">
                              <span className="currency-symbol">¥</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={totalAmount}
                                value={allocation.amount}
                                onChange={(e) => {
                                  const index = localAllocations.findIndex(item => item.memberId === member.id);
                                  if (index >= 0) {
                                    handleAmountChange(index, parseFloat(e.target.value) || 0);
                                  }
                                }}
                                placeholder="0.00"
                              />
                            </div>

                            {/* 快速金额按钮 */}
                            <div className="quick-amount-buttons">
                              <button
                                type="button"
                                className="quick-amount-btn"
                                onClick={() => handleQuickAmount(member.id, 0.25)}
                              >
                                25%
                              </button>
                              <button
                                type="button"
                                className="quick-amount-btn"
                                onClick={() => handleQuickAmount(member.id, 0.5)}
                              >
                                50%
                              </button>
                              <button
                                type="button"
                                className="quick-amount-btn"
                                onClick={() => handleQuickAmount(member.id, 0.75)}
                              >
                                75%
                              </button>
                              <button
                                type="button"
                                className="quick-amount-btn"
                                onClick={() => handleQuickAmount(member.id, 1)}
                              >
                                全部
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 确认按钮 */}
              <div className="confirm-section">
                {error && <div className="error-message">{error}</div>}
                <button
                  className="confirm-button"
                  onClick={handleConfirm}
                  disabled={localAllocations.filter(item => item.isSelected).length === 0}
                >
                  确认分摊
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
