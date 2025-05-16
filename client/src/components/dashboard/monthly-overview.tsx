"use client";

import { formatCurrency } from "@/lib/utils";

interface MonthlyOverviewProps {
  income: number;
  expense: number;
  balance: number;
  month: string;
}

export function MonthlyOverview({ income, expense, balance, month }: MonthlyOverviewProps) {
  return (
    <section className="balance-card bg-blue-600 text-white rounded-lg p-4">
      <div className="balance-header flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">本月概览</h2>
        <span className="date text-sm">{month}</span>
      </div>
      <div className="balance-details flex justify-between items-center">
        <div className="balance-item income flex flex-col items-center flex-1">
          <span className="label text-sm opacity-90">收入</span>
          <span className="amount text-lg font-semibold mt-1">{formatCurrency(income)}</span>
        </div>
        <div className="balance-divider w-px h-10 bg-white bg-opacity-30"></div>
        <div className="balance-item expense flex flex-col items-center flex-1">
          <span className="label text-sm opacity-90">支出</span>
          <span className="amount text-lg font-semibold mt-1">{formatCurrency(expense)}</span>
        </div>
        <div className="balance-divider w-px h-10 bg-white bg-opacity-30"></div>
        <div className="balance-item remaining flex flex-col items-center flex-1">
          <span className="label text-sm opacity-90">结余</span>
          <span className="amount text-lg font-semibold mt-1">{formatCurrency(balance)}</span>
        </div>
      </div>
    </section>
  );
}
