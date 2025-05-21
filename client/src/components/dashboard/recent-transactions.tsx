"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  // 处理交易项点击
  const handleTransactionClick = (transactionId: string) => {
    router.push(`/transactions/${transactionId}`);
  };

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
    <section className="recent-transactions">
      <div className="section-header">
        <h2>最近交易</h2>
        <Link href="/transactions?refresh=true" className="view-all">查看全部</Link>
      </div>

      {groupedTransactions.length > 0 ? (
        groupedTransactions.map((group) => (
          <div key={group.date} className="transaction-group">
            <div className="transaction-date">{group.date}</div>
            <div className="transaction-list">
              {group.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="transaction-item"
                  onClick={() => handleTransactionClick(transaction.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="transaction-icon">
                    <i className={`fas ${getIconClass(transaction.categoryIcon || '', transaction.type)}`}></i>
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-title">{transaction.description || transaction.categoryName}</div>
                    <div className="transaction-category">{transaction.categoryName}</div>
                  </div>
                  <div className={`transaction-amount ${transaction.type === TransactionType.EXPENSE ? 'expense' : 'income'}`}>
                    {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="transaction-list text-center">
          暂无交易记录
        </div>
      )}
    </section>
  );
}
