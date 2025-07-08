'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useState } from 'react';
import { UnifiedTransactionList, TransactionType } from '../common/unified-transaction-list';
import { DeleteConfirmationDialog } from '../ui/delete-confirmation-dialog';
import { apiClient } from '@/lib/api-client';
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
  onTransactionDeleted?: () => void; // 删除成功后的回调
}

// 使用React.memo优化渲染性能
export const RecentTransactions = memo(
  function RecentTransactions({ groupedTransactions, onTransactionDeleted }: RecentTransactionsProps) {
    const router = useRouter();
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

    // 处理交易项点击 - 触发模态框编辑
    const handleTransactionClick = (transactionId: string) => {
      console.log('🔄 [RecentTransactions] 交易点击，ID:', transactionId);

      // 设置 localStorage 标记来触发模态框
      localStorage.setItem('showTransactionEditModal', 'true');
      localStorage.setItem('pendingTransactionEdit', transactionId);

      // 触发页面重新检查（通过触发一个自定义事件）
      window.dispatchEvent(new CustomEvent('checkTransactionEditModal'));
    };

    // 处理附件点击 - 跳转到交易详情页
    const handleAttachmentClick = (transactionId: string) => {
      router.push(`/transactions/${transactionId}`);
    };

    // 处理删除交易
    const handleDeleteClick = (transactionId: string) => {
      // 找到要删除的交易信息
      const transaction = groupedTransactions
        .flatMap(group => group.transactions)
        .find(t => t.id === transactionId);

      if (!transaction) return;

      setTransactionToDelete(transaction);
      setDeleteDialogOpen(true);
    };

    // 确认删除交易
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
        console.log('交易删除成功');
      } catch (error) {
        console.error('删除交易失败:', error);
        alert('删除交易失败，请重试');
      } finally {
        setDeletingTransactionId(null);
      }
    };

    // 取消删除
    const handleCancelDelete = () => {
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
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
          enableSwipeActions={true}
          onAttachmentClick={handleAttachmentClick}
          onDeleteClick={handleDeleteClick}
          onDataRefresh={onTransactionDeleted}
        />

        {/* 删除确认对话框 */}
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          title="删除交易"
          message="确定要删除这笔交易吗？"
          itemName={transactionToDelete?.description || transactionToDelete?.categoryName}
          amount={transactionToDelete?.amount}
          isLoading={deletingTransactionId === transactionToDelete?.id}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
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
