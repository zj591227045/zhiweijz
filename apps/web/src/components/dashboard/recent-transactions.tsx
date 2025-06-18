'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo } from 'react';
import { UnifiedTransactionList, TransactionType } from '../common/unified-transaction-list';
import '../common/unified-transaction-list.css';

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

    return (
      <section className="recent-transactions">
        <div className="section-header">
          <h2>最近交易</h2>
          <Link href="/transactions?refresh=true" className="view-all">
            查看全部
          </Link>
        </div>

        <UnifiedTransactionList
          groupedTransactions={groupedTransactions}
          onTransactionClick={handleTransactionClick}
          showDateHeaders={true}
          emptyMessage="暂无交易记录"
        />
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
