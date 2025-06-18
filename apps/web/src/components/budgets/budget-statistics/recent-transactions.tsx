'use client';

import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { smartNavigate } from '@/lib/navigation';
import { UnifiedTransactionList, TransactionType } from '../../common/unified-transaction-list';
import '../../common/unified-transaction-list.css';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  type: TransactionType;
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
    smartNavigate(router, `/transactions/edit/${transactionId}`);
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
    smartNavigate(router, url);
  };

  // 将交易数据转换为分组格式以适配统一组件
  const groupedTransactions = transactions.length > 0 ? [{
    date: '最近交易',
    transactions: transactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      categoryName: transaction.categoryName,
      categoryIcon: transaction.categoryIcon || transaction.category?.icon,
      description: transaction.title || transaction.description,
      date: dayjs(transaction.date).format('M月D日 HH:mm')
    }))
  }] : [];

  return (
    <section className="recent-transactions">
      <div className="section-header">
        <h2>最近交易</h2>
        <button className="view-all" onClick={handleViewAll}>
          查看全部
        </button>
      </div>

      <UnifiedTransactionList
        groupedTransactions={groupedTransactions}
        onTransactionClick={handleTransactionClick}
        showDateHeaders={false}
        emptyMessage="暂无交易记录"
        className="budget-statistics-page"
      />
    </section>
  );
}
