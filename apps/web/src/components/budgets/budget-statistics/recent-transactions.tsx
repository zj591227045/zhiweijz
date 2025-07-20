'use client';

import dayjs from 'dayjs';
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
  tags?: any[];
  attachments?: Array<{
    id: string;
    attachmentType: string;
    description?: string;
    file?: {
      id: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      url?: string;
    };
  }>;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  budgetId: string | null;
  onTransactionDeleted?: () => void; // 删除成功后的回调
}

export function RecentTransactions({
  transactions,
  budgetId,
  onTransactionDeleted,
}: RecentTransactionsProps) {
  // 删除功能相关状态已移除，记账列表仅作展示使用

  // 将记账数据转换为分组格式以适配统一组件
  const groupedTransactions =
    transactions.length > 0
      ? [
          {
            date: '最近记账',
            transactions: transactions.map((transaction) => ({
              id: transaction.id,
              amount: transaction.amount,
              type: transaction.type,
              categoryName: transaction.categoryName,
              categoryIcon: transaction.categoryIcon || transaction.category?.icon,
              description: transaction.title || transaction.description,
              date: dayjs(transaction.date).format('M月D日 HH:mm'),
              category: transaction.category,
              tags: transaction.tags,
              attachments: transaction.attachments,
            })),
          },
        ]
      : [];

  return (
    <section className="recent-transactions">
      <div className="section-header">
        <h2>最近记账</h2>
        {/* 移除查看全部按钮，避免导航问题 */}
      </div>

      <UnifiedTransactionList
        groupedTransactions={groupedTransactions}
        onTransactionClick={undefined} // 禁用记账项点击
        showDateHeaders={false}
        emptyMessage="暂无记账记录"
        className="budget-statistics-page"
        enableSwipeActions={false} // 禁用滑动操作，仅作展示
        onAttachmentClick={undefined} // 禁用附件点击
        onDeleteClick={undefined} // 禁用删除功能
        onDataRefresh={onTransactionDeleted}
      />
    </section>
  );
}
