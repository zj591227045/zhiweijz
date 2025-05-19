'use client';

import { useRouter } from 'next/navigation';
import { Budget } from '@/store/budget-list-store';
import { cn, formatCurrency } from '@/lib/utils';
import { useAccountBookStore } from '@/store/account-book-store';
import { AccountBookType } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

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
    router.push(`/budgets/${budget.id}/edit`);
  };

  // 处理删除预算
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(budget.id);
  };

  // 确定进度条颜色
  const getProgressColor = () => {
    if (budget.overSpent) return 'bg-destructive';
    if (budget.warning) return 'bg-amber-500';
    return 'bg-primary';
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="icon-button" onClick={(e) => e.stopPropagation()}>
                <i className="fas fa-ellipsis-v"></i>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <i className="fas fa-edit mr-2"></i> 编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                <i className="fas fa-trash-alt mr-2"></i> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="budget-amount">
        {formatCurrency(budget.amount)}
      </div>

      <div className="budget-progress">
        <div className="progress-bar">
          <div
            className="progress"
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
