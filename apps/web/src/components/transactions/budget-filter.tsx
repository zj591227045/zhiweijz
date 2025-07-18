import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAccountBookStore } from '@/store/account-book-store';
import { useAuthStore } from '@/store/auth-store';
import { BudgetModalSelector } from './budget-modal-selector';
import { ChevronDown } from 'lucide-react';

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

interface BudgetFilterProps {
  selectedBudgetId?: string;
  onBudgetChange: (budgetId: string | null) => void;
  startDate?: string;
  endDate?: string;
  className?: string;
  enableAggregation?: boolean; // 是否启用预算聚合
}

export function BudgetFilter({
  selectedBudgetId,
  onBudgetChange,
  startDate,
  endDate,
  className = '',
  enableAggregation = true // 默认启用聚合
}: BudgetFilterProps) {
  const { currentAccountBook } = useAccountBookStore();
  const { isAuthenticated } = useAuthStore();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 获取预算列表
  const fetchBudgets = async () => {
    if (!isAuthenticated || !currentAccountBook?.id) {
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

      const response = await apiClient.get('/budgets', { params });
      
      if (response && Array.isArray(response.data)) {
        setBudgets(response.data);
      } else if (Array.isArray(response)) {
        setBudgets(response);
      } else {
        setBudgets([]);
      }
    } catch (error: any) {
      console.error('获取预算列表失败:', error);
      setError('获取预算列表失败');
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 当账本、认证状态或时间范围变化时重新获取预算
  useEffect(() => {
    fetchBudgets();
  }, [isAuthenticated, currentAccountBook?.id, startDate, endDate]);

  // 处理预算选择变化
  const handleBudgetChange = (budgetId: string | null) => {
    onBudgetChange(budgetId);
  };

  // 获取当前选中预算的显示名称
  const getSelectedBudgetName = () => {
    if (!selectedBudgetId) return '全部预算';

    const allBudgets = [...personalBudgets, ...generalBudgets];
    const selectedBudget = allBudgets.find(budget => budget.id === selectedBudgetId);

    if (selectedBudget) {
      return selectedBudget.name;
    }

    return '未知预算';
  };

  // 根据时间范围过滤预算
  const getFilteredBudgets = () => {
    if (!startDate || !endDate) {
      return budgets;
    }

    const filterStartDate = new Date(startDate);
    const filterEndDate = new Date(endDate);

    return budgets.filter(budget => {
      const budgetStartDate = new Date(budget.startDate);
      const budgetEndDate = new Date(budget.endDate);

      // 预算时间范围与筛选时间范围有重叠
      return budgetStartDate <= filterEndDate && budgetEndDate >= filterStartDate;
    });
  };

  const filteredBudgets = getFilteredBudgets();

  // 聚合相同用户的个人预算（跨月份）
  const aggregatePersonalBudgets = (budgets: Budget[]) => {
    const userBudgetMap = new Map<string, Budget[]>();

    // 按用户分组个人预算
    budgets.forEach(budget => {
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
        const totalRemaining = userBudgets.reduce((sum, budget) => sum + (budget.remaining || 0), 0);

        // 使用第一个预算作为基础，更新金额信息
        const aggregatedBudget: Budget = {
          ...userBudgets[0],
          id: `aggregated_${userId}`, // 特殊ID标识聚合预算
          name: `${userBudgets[0].userName || '个人'}预算 (${userBudgets.length}个月)`,
          amount: totalAmount,
          spent: totalSpent,
          remaining: totalRemaining,
          // 使用最早的开始日期和最晚的结束日期
          startDate: userBudgets.reduce((earliest, budget) =>
            budget.startDate < earliest ? budget.startDate : earliest, userBudgets[0].startDate),
          endDate: userBudgets.reduce((latest, budget) =>
            budget.endDate > latest ? budget.endDate : latest, userBudgets[0].endDate)
        };

        aggregatedBudgets.push(aggregatedBudget);
      }
    });

    return aggregatedBudgets;
  };

  // 按预算类型分组并根据设置决定是否聚合个人预算
  const personalBudgets = enableAggregation
    ? aggregatePersonalBudgets(filteredBudgets)
    : filteredBudgets.filter(budget => budget.budgetType === 'PERSONAL');
  const generalBudgets = filteredBudgets.filter(budget => budget.budgetType === 'GENERAL');

  // 格式化预算显示名称
  const formatBudgetName = (budget: Budget) => {
    let name = budget.name;

    // 检查是否为聚合预算
    const isAggregated = budget.id.startsWith('aggregated_');

    if (budget.budgetType === 'PERSONAL' && budget.userName && !isAggregated) {
      name += ` (${budget.userName})`;
    } else if (budget.budgetType === 'GENERAL' && budget.familyMemberName) {
      name += ` (${budget.familyMemberName})`;
    }

    // 添加预算金额信息 - 移动端简化显示
    if (budget.amount) {
      const spent = budget.spent || 0;
      const remaining = budget.remaining || (budget.amount - spent);
      const usagePercentage = Math.round((spent / budget.amount) * 100);

      if (className?.includes('mobile')) {
        // 移动端简化显示
        if (isAggregated) {
          name += ` - ¥${budget.amount.toLocaleString()} (已用${usagePercentage}%)`;
        } else {
          name += ` - ¥${budget.amount.toLocaleString()}`;
          if (remaining < budget.amount) {
            name += ` (剩余¥${remaining.toLocaleString()})`;
          }
        }
      } else {
        // 桌面端详细显示
        if (isAggregated) {
          name += ` - ¥${budget.amount.toLocaleString()} (已用: ¥${spent.toLocaleString()}, 剩余: ¥${remaining.toLocaleString()})`;
        } else {
          name += ` - ¥${budget.amount.toLocaleString()} (剩余: ¥${remaining.toLocaleString()})`;
        }
      }
    }

    return name;
  };

  if (!isAuthenticated || !currentAccountBook?.id) {
    return null;
  }

  return (
    <div className={`budget-filter ${className}`}>
      <div className="budget-filter-content">
        {!className?.includes('mobile') && (
          <label className="budget-filter-label">
            <i className="fas fa-wallet"></i>
            预算筛选
          </label>
        )}

        {/* 预算选择按钮 */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading}
          className="budget-filter-button"
          style={className?.includes('mobile') ? {
            width: '100%',
            padding: '14px 16px',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            backgroundColor: '#f9fafb',
            color: '#374151',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            minHeight: '48px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'left'
          } : {
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: 'white',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            minHeight: '44px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'left'
          }}
        >
          <span className="budget-filter-button-text">
            {isLoading ? '加载中...' : getSelectedBudgetName()}
          </span>
          <ChevronDown className="budget-filter-button-icon" style={{
            width: '18px',
            height: '18px',
            color: '#6b7280',
            flexShrink: 0
          }} />
        </button>

        {/* 预算选择模态框 */}
        <BudgetModalSelector
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedBudgetId={selectedBudgetId}
          onBudgetChange={handleBudgetChange}
          startDate={startDate}
          endDate={endDate}
          enableAggregation={enableAggregation}
        />

        {isLoading && (
          <div className="budget-filter-loading">
            <i className="fas fa-spinner fa-spin"></i>
            加载中...
          </div>
        )}

        {error && (
          <div className="budget-filter-error">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {!isLoading && !error && filteredBudgets.length === 0 && (
          <div className="budget-filter-empty">
            <i className="fas fa-info-circle"></i>
            当前时间范围内暂无预算
          </div>
        )}
      </div>
    </div>
  );
}
