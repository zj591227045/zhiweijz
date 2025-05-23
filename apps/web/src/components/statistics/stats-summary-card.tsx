'use client';

import { formatCurrency } from '@/lib/utils';

interface StatsSummaryCardProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export function StatsSummaryCard({
  totalIncome,
  totalExpense,
  balance
}: StatsSummaryCardProps) {
  return (
    <div className="summary-card">
      <h2 className="summary-header">财务概览</h2>
      <div className="summary-content">
        <div className="summary-item">
          <span className="summary-label">收入</span>
          <span className="summary-value income">{formatCurrency(totalIncome)}</span>
        </div>
        
        <div className="summary-item">
          <span className="summary-label">支出</span>
          <span className="summary-value expense">{formatCurrency(totalExpense)}</span>
        </div>
        
        <div className="summary-item">
          <span className="summary-label">结余</span>
          <span className={`summary-value ${balance >= 0 ? 'income' : 'expense'}`}>
            {formatCurrency(balance)}
          </span>
        </div>
      </div>
    </div>
  );
}
