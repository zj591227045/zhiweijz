"use client";

import { memo } from "react";
import { formatCurrency } from "@/lib/utils";

interface MonthlyOverviewProps {
  income: number;
  expense: number;
  balance: number;
  month: string;
}

// 使用React.memo优化渲染性能，避免不必要的重渲染
export const MonthlyOverview = memo(function MonthlyOverview({ income, expense, balance, month }: MonthlyOverviewProps) {
  return (
    <section className="balance-card">
      <div className="balance-header">
        <h2>本月概览</h2>
        <span className="date">{month}</span>
      </div>
      <div className="balance-details">
        <div className="balance-item income">
          <span className="label">收入</span>
          <span className="amount">{formatCurrency(income)}</span>
        </div>
        <div className="balance-divider"></div>
        <div className="balance-item expense">
          <span className="label">支出</span>
          <span className="amount">{formatCurrency(expense)}</span>
        </div>
        <div className="balance-divider"></div>
        <div className="balance-item remaining">
          <span className="label">结余</span>
          <span className="amount">{formatCurrency(balance)}</span>
        </div>
      </div>
    </section>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只有当属性真正变化时才重新渲染
  return prevProps.income === nextProps.income &&
         prevProps.expense === nextProps.expense &&
         prevProps.balance === nextProps.balance &&
         prevProps.month === nextProps.month;
});
