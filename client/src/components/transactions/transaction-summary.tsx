"use client";

import { formatCurrency } from "@/lib/utils";

interface TransactionSummaryProps {
  income: number;
  expense: number;
  balance: number;
}

export function TransactionSummary({ income, expense, balance }: TransactionSummaryProps) {
  return (
    <div className="transaction-summary">
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
  );
}
