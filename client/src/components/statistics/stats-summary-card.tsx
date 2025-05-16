"use client";

import { formatCurrency } from "@/lib/utils";

interface StatsSummaryCardProps {
  income: number;
  expense: number;
  balance: number;
  isLoading: boolean;
}

export function StatsSummaryCard({
  income,
  expense,
  balance,
  isLoading
}: StatsSummaryCardProps) {
  console.log('StatsSummaryCard 组件收到的数据:', { income, expense, balance, isLoading });

  return (
    <div className="summary-card">
      <div className="summary-header">收支概览</div>
      {isLoading ? (
        <div className="flex h-16 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : (
        <div className="summary-content">
          <div className="summary-item">
            <div className="summary-label">收入</div>
            <div className="summary-value income">{formatCurrency(income)}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">支出</div>
            <div className="summary-value expense">{formatCurrency(expense)}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">结余</div>
            <div className="summary-value">{formatCurrency(balance)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
