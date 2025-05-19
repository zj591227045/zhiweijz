'use client';

import { useRouter } from 'next/navigation';
import { Budget } from '@/store/budget-list-store';
import { cn, formatCurrency } from '@/lib/utils';
import { useAccountBookStore } from '@/store/account-book-store';
import { AccountBookType } from '@/types';


interface BudgetListCardProps {
  budget: Budget;
  onDelete: (id: string) => void;
}

export function BudgetListCard({ budget, onDelete }: BudgetListCardProps) {
  const router = useRouter();
  const { currentAccountBook } = useAccountBookStore();

  // 处理点击预算卡片
  const handleCardClick = () => {
    router.push(`/budgets/${budget.id}`);
  };

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
            {/* 如果是家庭账本且有用户名称，显示用户名称 */}
            {currentAccountBook?.type === AccountBookType.FAMILY &&
             budget.budgetType === 'PERSONAL' &&
             budget.userName && (
              <span className="budget-username">
                <i className="fas fa-user mr-1 text-xs"></i>
                {budget.userName}
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

      <div className="budget-progress">
        <div className="progress-bar">
          <div
            className={cn(
              "progress",
              budget.overSpent && "bg-destructive",
              budget.warning && !budget.overSpent && "bg-amber-500"
            )}
            style={{ width: `${Math.min(budget.percentage, 100)}%` }}
          ></div>
        </div>
        <div className="progress-info">
          <span className="spent">已用: {formatCurrency(budget.spent)}</span>
          <span className={cn(
            "remaining",
            budget.overSpent && "negative"
          )}>
            {budget.overSpent
              ? `超支: ${formatCurrency(Math.abs(budget.remaining))}`
              : `剩余: ${formatCurrency(budget.remaining)}`}
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
            <i className={`fas fa-${budget.categoryIcon}`}></i>
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
