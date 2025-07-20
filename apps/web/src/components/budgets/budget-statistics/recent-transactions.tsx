'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import dayjs from 'dayjs';
import { smartNavigate } from '@/lib/navigation';
import { UnifiedTransactionList, TransactionType } from '../../common/unified-transaction-list';
import { DeleteConfirmationDialog } from '../../ui/delete-confirmation-dialog';
import { apiClient } from '@/lib/api-client';
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
  const router = useRouter();
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // 处理记账项点击 - 直接进入编辑页面
  const handleTransactionClick = (transactionId: string) => {
    smartNavigate(router, `/transactions/edit/${transactionId}`);
  };

  // 处理附件点击 - 跳转到记账详情页
  const handleAttachmentClick = (transactionId: string) => {
    smartNavigate(router, `/transactions/${transactionId}`);
  };

  // 处理删除记账
  const handleDeleteClick = (transactionId: string) => {
    // 找到要删除的记账信息
    const transaction = transactions.find((t) => t.id === transactionId);

    if (!transaction) return;

    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  // 确认删除记账
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      setDeletingTransactionId(transactionToDelete.id);
      await apiClient.delete(`/transactions/${transactionToDelete.id}`);

      // 删除成功，触发回调刷新数据
      if (onTransactionDeleted) {
        onTransactionDeleted();
      }

      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      console.log('记账删除成功');
    } catch (error) {
      console.error('删除记账失败:', error);
      alert('删除记账失败，请重试');
    } finally {
      setDeletingTransactionId(null);
    }
  };

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  // 处理查看全部按钮点击
  const handleViewAll = () => {
    // 构建查询参数
    const params = new URLSearchParams();

    if (budgetId) {
      params.set('budgetId', budgetId);
    }

    // 重定向到记账列表页面
    const url = `/transactions${params.toString() ? `?${params.toString()}` : ''}`;
    smartNavigate(router, url);
  };

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
        <button className="view-all" onClick={handleViewAll}>
          查看全部
        </button>
      </div>

      <UnifiedTransactionList
        groupedTransactions={groupedTransactions}
        onTransactionClick={handleTransactionClick}
        showDateHeaders={false}
        emptyMessage="暂无记账记录"
        className="budget-statistics-page"
        enableSwipeActions={true}
        onAttachmentClick={handleAttachmentClick}
        onDeleteClick={handleDeleteClick}
        onDataRefresh={onTransactionDeleted}
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        title="删除记账"
        message="确定要删除这笔记账吗？"
        itemName={
          transactionToDelete?.title ||
          transactionToDelete?.description ||
          transactionToDelete?.categoryName
        }
        amount={transactionToDelete?.amount}
        isLoading={deletingTransactionId === transactionToDelete?.id}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </section>
  );
}
