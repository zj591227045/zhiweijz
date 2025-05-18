'use client';

import { useRouter } from 'next/navigation';
import { Transaction } from '@/store/budget-detail-store';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

interface RelatedTransactionsProps {
  transactions: Transaction[];
  budgetId: string;
}

export function RelatedTransactions({ transactions, budgetId }: RelatedTransactionsProps) {
  const router = useRouter();

  // 获取图标类名
  const getIconClass = (icon: string) => {
    return icon.startsWith('fa-') ? icon : `fa-${icon}`;
  };

  // 处理交易点击
  const handleTransactionClick = (transactionId: string) => {
    router.push(`/transactions/${transactionId}`);
  };

  // 查看全部交易
  const handleViewAll = () => {
    router.push(`/transactions?budgetId=${budgetId}`);
  };

  return (
    <div className="related-transactions">
      <h2 className="section-title mb-4">相关交易</h2>

      {transactions.length > 0 ? (
        <div>
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="transaction-item cursor-pointer"
              onClick={() => handleTransactionClick(transaction.id)}
            >
              <div className="transaction-icon">
                <i className={`fas ${getIconClass(transaction.categoryIcon)}`}></i>
              </div>
              <div className="transaction-info">
                <div className="transaction-title">{transaction.title}</div>
                <div className="transaction-date">
                  {dayjs(transaction.date).format('M月D日 HH:mm')}
                </div>
              </div>
              <div className="transaction-amount expense">
                -{formatCurrency(transaction.amount)}
              </div>
            </div>
          ))}

          <button
            className="view-all-button"
            onClick={handleViewAll}
          >
            查看全部
          </button>
        </div>
      ) : (
        <div className="transaction-empty">
          暂无相关交易
        </div>
      )}
    </div>
  );
}
