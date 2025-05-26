'use client';

import { useRouter } from 'next/navigation';
import { cn, formatCurrency, getCategoryIconClass } from '@/lib/utils';
import { useAccountBookStore } from '@zhiweijz/web';

export interface Budget {
  id: string;
  name: string;
  period: string; // 例如: "2023年5月"
  amount: number;
  spent: number;
  remaining: number;
  adjustedRemaining?: number; // 考虑结转后的剩余金额
  percentage: number;
  rolloverAmount?: number;
  daysRemaining: number;
  categoryIcon?: string;
  warning: boolean; // 是否接近超支
  overSpent: boolean; // 是否超支
  budgetType: 'PERSONAL' | 'GENERAL';
  userId?: string;
  userName?: string; // 用户名称，用于在家庭账本中显示
  familyMemberId?: string; // 家庭成员ID，用于托管成员
  familyMemberName?: string; // 家庭成员名称，用于托管成员
  accountBookType?: string; // 账本类型
}

interface BudgetListCardProps {
  budget: Budget;
  onDelete: (id: string) => void;
}

export function BudgetListCard({ budget, onDelete }: BudgetListCardProps) {
  const router = useRouter();
  const { currentAccountBook } = useAccountBookStore();

  // 处理编辑预算
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 使用正确的路由路径
    router.push(`/budgets/${budget.id}/edit`);
  };

  // 处理删除预算
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(budget.id);
  };

  // 处理点击预算卡片
  const handleCardClick = () => {
    router.push(`/budgets/${budget.id}/edit`);
  };

  return (
    <div
      className={cn(
        "budget-card",
        budget.overSpent && "danger",
        budget.warning && !budget.overSpent && "warning"
      )}
      onClick={handleCardClick}
    >
      <div className="budget-header">
        <div className="budget-title">
          <h3>{budget.name}</h3>
          <div className="budget-subtitle">
            <span className="budget-period">{budget.period}</span>
            {/* 如果是家庭账本且有用户名称或家庭成员名称，显示名称 */}
            {currentAccountBook?.type === 'FAMILY' &&
             budget.budgetType === 'PERSONAL' && (
              <span className="budget-username">
                <i className={`fas ${budget.familyMemberId ? 'fa-child' : 'fa-user'} mr-1 text-xs`}></i>
                {budget.familyMemberName || budget.userName}
              </span>
            )}
          </div>
        </div>
        <div className="budget-actions">
          {/* 个人预算只显示编辑按钮，通用预算显示编辑和删除按钮 */}
          <div className="action-buttons">
            <button
              className="edit-button"
              onClick={(e) => handleEdit(e)}
              aria-label="编辑预算"
            >
              <i className="fas fa-edit"></i>
            </button>
            {budget.budgetType === 'GENERAL' && (
              <button
                className="delete-button"
                onClick={(e) => handleDelete(e)}
                aria-label="删除预算"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="budget-amount">
        {formatCurrency(budget.amount)}
      </div>

      <div className="budget-list-progress-section">
        <div 
          className="budget-list-progress-bar-custom"
          style={{
            height: '8px',
            backgroundColor: '#e5e7eb', // 明显的灰色背景
            border: `1px solid ${budget.overSpent ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '4px',
            overflow: 'hidden',
            width: '100%',
            position: 'relative',
            marginBottom: '8px'
          }}
        >
          <div
            className="budget-list-progress-fill-override"
            style={{
              height: '100%',
              width: `${Math.min(budget.percentage, 100)}%`,
              backgroundColor: budget.overSpent
                ? '#ef4444'
                : budget.warning && !budget.overSpent
                ? '#f59e0b'
                : '#3b82f6',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          ></div>
        </div>
        <div className="progress-info">
          <span className="spent">已用: {formatCurrency(budget.spent)}</span>
          <span className={cn(
            "remaining",
            budget.overSpent && "negative"
          )}>
            {budget.overSpent
              ? `超支: ${formatCurrency(Math.abs(budget.adjustedRemaining ?? budget.remaining))}`
              : `剩余: ${formatCurrency(budget.adjustedRemaining ?? budget.remaining)}`}
          </span>
        </div>
      </div>

      <div className="budget-footer">
        {budget.rolloverAmount !== undefined && budget.rolloverAmount !== 0 ? (
          <div className={cn(
            "rollover-info",
            budget.rolloverAmount < 0 && "negative"
          )}>
            <i className="fas fa-exchange-alt"></i>
            <span>
              本月结转: {budget.rolloverAmount > 0 ? '+' : ''}
              {formatCurrency(budget.rolloverAmount)}
            </span>
          </div>
        ) : budget.categoryIcon ? (
          <div className="category-icon">
            <i className={`fas ${getCategoryIconClass(budget.categoryIcon)}`}></i>
          </div>
        ) : (
          <div></div> // 空占位符，保持布局
        )}

        <div className="days-remaining">
          {budget.daysRemaining > 0
            ? `剩余${budget.daysRemaining}天`
            : budget.budgetType === 'GENERAL' && budget.daysRemaining === 0
              ? '无期限'
              : '已结束'}
        </div>
      </div>
    </div>
  );
}
