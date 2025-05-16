"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { TransactionType } from "@/types";

interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  categoryIcon?: string;
  description?: string;
  date: string;
}

interface GroupedTransactions {
  date: string;
  transactions: Transaction[];
}

interface RecentTransactionsProps {
  groupedTransactions: GroupedTransactions[];
}

export function RecentTransactions({ groupedTransactions }: RecentTransactionsProps) {
  // 获取图标类名
  const getIconClass = (iconName: string, type: TransactionType) => {
    // 这里可以根据后端返回的图标名称映射到Font Awesome图标
    const iconMap: Record<string, string> = {
      food: "fa-utensils",
      shopping: "fa-shopping-bag",
      transport: "fa-bus",
      entertainment: "fa-film",
      home: "fa-home",
      health: "fa-heartbeat",
      education: "fa-graduation-cap",
      travel: "fa-plane",
      salary: "fa-money-bill-wave",
      investment: "fa-chart-line",
      gift: "fa-gift",
      other: "fa-ellipsis-h",
    };

    // 如果是收入类型且没有找到对应图标，使用默认收入图标
    if (type === TransactionType.INCOME && !iconMap[iconName]) {
      return "fa-money-bill-wave";
    }

    return iconMap[iconName] || "fa-tag";
  };

  return (
    <section className="recent-transactions flex flex-col gap-4">
      <div className="section-header flex justify-between items-center mb-2">
        <h2 className="text-base font-semibold">最近交易</h2>
        <Link href="/transactions" className="view-all text-blue-600 text-sm">查看全部</Link>
      </div>

      {groupedTransactions.length > 0 ? (
        groupedTransactions.map((group) => (
          <div key={group.date} className="transaction-group flex flex-col gap-2">
            <div className="transaction-date text-sm text-gray-500 px-1">{group.date}</div>
            <div className="transaction-list bg-white rounded-lg shadow-sm overflow-hidden">
              {group.transactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item flex items-center p-4 border-b border-gray-200 last:border-b-0">
                  <div className="transaction-icon w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3">
                    <i className={`fas ${getIconClass(transaction.categoryIcon || '', transaction.type)}`}></i>
                  </div>
                  <div className="transaction-details flex-1">
                    <div className="transaction-title font-medium">{transaction.description || transaction.categoryName}</div>
                    <div className="transaction-category text-xs text-gray-500">{transaction.categoryName}</div>
                  </div>
                  <div className={`transaction-amount font-semibold ${transaction.type === TransactionType.EXPENSE ? 'text-red-500' : 'text-green-500'}`}>
                    {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="transaction-list bg-white rounded-lg p-4 shadow-sm text-center text-gray-500">
          暂无交易记录
        </div>
      )}
    </section>
  );
}
