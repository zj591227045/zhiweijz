"use client";

import { TransactionType } from "@/types";
import { formatCurrency } from "@/lib/utils";

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
    if (!icon) return "fas fa-question";
    
    // 如果已经包含fa-前缀，直接返回
    if (icon.includes("fa-")) return icon;
    
    // 否则添加前缀
    return `fas fa-${icon}`;
  };
  
  return (
    <div className="transaction-header">
      <div className="transaction-type">
        {type === TransactionType.EXPENSE ? "支出" : "收入"}
      </div>
      <div className="transaction-amount">
        {formatCurrency(amount)}
      </div>
      <div className="transaction-category">
        <i className={getIconClass(categoryIcon)}></i>
        <span>{categoryName}</span>
      </div>
    </div>
  );
}
