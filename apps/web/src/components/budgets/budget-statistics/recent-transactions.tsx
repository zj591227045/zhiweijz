'use client';

import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { getCategoryIconClass } from '@/lib/utils';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  type: 'EXPENSE' | 'INCOME';
  description?: string;
  category?: {
    id: string;
    name: string;
    icon: string;
  };
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  budgetId: string | null;
  familyMemberId?: string;
}

export function RecentTransactions({ transactions, budgetId, familyMemberId }: RecentTransactionsProps) {
  const router = useRouter();

  // 处理查看全部按钮点击
  const handleViewAll = () => {
    if (budgetId) {
      // 如果有家庭成员ID，添加到URL参数中
      const url = familyMemberId
        ? `/budgets/${budgetId}/transactions?familyMemberId=${familyMemberId}`
        : `/budgets/${budgetId}/transactions`;
      router.push(url);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('M月D日 HH:mm');
  };

  // 格式化金额
  const formatAmount = (amount: number, type: 'EXPENSE' | 'INCOME') => {
    const prefix = type === 'EXPENSE' ? '-' : '+';
    return `${prefix}¥${amount.toLocaleString()}`;
  };

  return (
    <section className="recent-transactions">
      <div className="section-header">
        <h2>最近交易</h2>
        <button className="view-all" onClick={handleViewAll}>查看全部</button>
      </div>

      <div className="transaction-list">
        {transactions.length > 0 ? (
          transactions.map(transaction => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-icon">
                <i className={`fas ${getCategoryIconClass(transaction.category?.icon || transaction.categoryIcon || 'receipt')}`}></i>
              </div>
              <div className="transaction-info">
                <div className="transaction-title">{transaction.title}</div>
                {transaction.description && (
                  <div className="transaction-description">{transaction.description}</div>
                )}
                <div className="transaction-date">{formatDate(transaction.date)}</div>
              </div>
              <div className={`transaction-amount ${transaction.type.toLowerCase()}`}>
                {formatAmount(transaction.amount, transaction.type)}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-message">
            <p>暂无交易记录</p>
          </div>
        )}
      </div>
    </section>
  );
}
