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
}

export function RecentTransactions({ transactions, budgetId }: RecentTransactionsProps) {
  const router = useRouter();

  // 处理交易项点击 - 直接进入编辑页面
  const handleTransactionClick = (transactionId: string) => {
    router.push(`/transactions/edit/${transactionId}`);
  };

  // 处理查看全部按钮点击
  const handleViewAll = () => {
    // 构建查询参数
    const params = new URLSearchParams();

    if (budgetId) {
      params.set('budgetId', budgetId);
    }

    // 重定向到交易列表页面
    const url = `/transactions${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
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
        <button className="view-all" onClick={handleViewAll}>
          查看全部
        </button>
      </div>

      <div className="transaction-list">
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="transaction-item"
              onClick={() => handleTransactionClick(transaction.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="transaction-icon">
                <i
                  className={`fas ${getCategoryIconClass(transaction.category?.icon || transaction.categoryIcon || 'receipt')}`}
                ></i>
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
