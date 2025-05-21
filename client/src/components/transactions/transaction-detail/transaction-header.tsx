"use client";

import { TransactionType } from "@/types";
import { formatCurrency, getCategoryIconClass } from "@/lib/utils";

interface TransactionHeaderProps {
  amount: number;
  type: TransactionType;
  categoryName: string;
  categoryIcon: string;
}

export function TransactionHeader({
  amount,
  type,
  categoryName,
  categoryIcon
}: TransactionHeaderProps) {
  // 获取图标类名
  const getIconClass = (icon: string) => {
    const iconClass = getCategoryIconClass(icon);
    return `fas ${iconClass}`;
  };

  return (
    <div className="transaction-header">
      <div className="transaction-header-left">
        <div className="category-icon-container">
          <i className={getIconClass(categoryIcon)}></i>
        </div>
        <div className="category-label">
          <span>{categoryName}</span>
        </div>
      </div>
      <div className="transaction-header-right">
        <div className="transaction-type">
          {type === TransactionType.EXPENSE ? "支出" : "收入"}
        </div>
        <div className="transaction-amount">
          {formatCurrency(amount)}
        </div>
      </div>
    </div>
  );
}
