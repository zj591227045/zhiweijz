'use client';

import { useRouter } from 'next/navigation';
import { Budget } from '@/store/budget-list-store';
import { cn, formatCurrency } from '@/lib/utils';
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
        "budget-list-card",
        budget.overSpent && "danger border-l-4 border-destructive",
        budget.warning && !budget.overSpent && "warning border-l-4 border-amber-500"
      )}
      onClick={handleCardClick}
    >
      <div className="budget-list-card-header">
        <div className="budget-list-card-title">
          <h3>{budget.name}</h3>
          <span className="budget-list-card-period">{budget.period}</span>
        </div>
        <div className="budget-list-card-actions">
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

      <div className="budget-list-card-amount">
        {formatCurrency(budget.amount)}
      </div>

      <div className="budget-list-card-progress">
        <div className="budget-list-progress-bar">
          <div
            className="budget-list-progress"
            style={{ width: `${Math.min(budget.percentage, 100)}%` }}
          ></div>
        </div>
        <div className="budget-list-progress-info">
          <span className="budget-list-spent">已用: {formatCurrency(budget.spent)}</span>
          <span className={cn(
            "budget-list-remaining",
            budget.overSpent && "negative"
          )}>
            {budget.overSpent
              ? `超支: ${formatCurrency(Math.abs(budget.remaining))}`
              : `剩余: ${formatCurrency(budget.remaining)}`}
          </span>
        </div>
      </div>

      <div className="budget-list-card-footer">
        {budget.rolloverAmount !== undefined && budget.rolloverAmount !== 0 ? (
          <div className={cn(
            "budget-list-rollover-info",
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

        <div className="budget-list-days-remaining">
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
