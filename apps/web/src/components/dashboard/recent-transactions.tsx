'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo } from 'react';
import { formatCurrency, getCategoryIconClass } from '../../lib/utils';
import { smartNavigate } from '../../lib/navigation';

// 交易类型枚举
export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

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

// 使用React.memo优化渲染性能
export const RecentTransactions = memo(
  function RecentTransactions({ groupedTransactions }: RecentTransactionsProps) {
    const router = useRouter();

    // 处理交易项点击 - 触发模态框编辑
    const handleTransactionClick = (transactionId: string) => {
      console.log('🔄 [RecentTransactions] 交易点击，ID:', transactionId);

      // 设置 localStorage 标记来触发模态框
      localStorage.setItem('showTransactionEditModal', 'true');
      localStorage.setItem('pendingTransactionEdit', transactionId);

      // 触发页面重新检查（通过触发一个自定义事件）
      window.dispatchEvent(new CustomEvent('checkTransactionEditModal'));
    };

    // 获取图标类名
    const getIconClass = (iconName: string, type: TransactionType) => {
      // 如果是收入类型且没有图标名称，使用默认收入图标
      if (type === TransactionType.INCOME && !iconName) {
        return 'fa-money-bill-wave';
      }

      return getCategoryIconClass(iconName);
    };

    return (
      <section className="recent-transactions">
        <div className="section-header">
          <h2>最近交易</h2>
          <Link href="/transactions?refresh=true" className="view-all">
            查看全部
          </Link>
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
                      <i
                        className={`fas ${getIconClass(transaction.categoryIcon || '', transaction.type)}`}
                      ></i>
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-title">
                        {transaction.description || transaction.categoryName}
                      </div>
                      <div className="transaction-category">{transaction.categoryName}</div>
                    </div>
                    <div
                      className={`transaction-amount ${transaction.type === TransactionType.EXPENSE ? 'expense' : 'income'}`}
                    >
                      {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="transaction-list text-center">暂无交易记录</div>
        )}
      </section>
    );
  },
  (prevProps, nextProps) => {
    // 自定义比较函数，只有当交易数据真正变化时才重新渲染
    if (prevProps.groupedTransactions.length !== nextProps.groupedTransactions.length) {
      return false;
    }

    // 深度比较交易组数据
    for (let i = 0; i < prevProps.groupedTransactions.length; i++) {
      const prevGroup = prevProps.groupedTransactions[i];
      const nextGroup = nextProps.groupedTransactions[i];

      if (
        prevGroup.date !== nextGroup.date ||
        prevGroup.transactions.length !== nextGroup.transactions.length
      ) {
        return false;
      }

      // 比较每个交易
      for (let j = 0; j < prevGroup.transactions.length; j++) {
        const prevTx = prevGroup.transactions[j];
        const nextTx = nextGroup.transactions[j];

        if (
          prevTx.id !== nextTx.id ||
          prevTx.amount !== nextTx.amount ||
          prevTx.type !== nextTx.type
        ) {
          return false;
        }
      }
    }

    return true;
  },
);
