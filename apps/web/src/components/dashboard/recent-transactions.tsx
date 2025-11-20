'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useState, useEffect, useRef } from 'react';
import { UnifiedTransactionList, TransactionType } from '../common/unified-transaction-list';
import { DeleteConfirmationDialog } from '../ui/delete-confirmation-dialog';
import { apiClient } from '@/lib/api-client';
import { hapticPresets } from '@/lib/haptic-feedback';
import { useDashboardStore } from '@/store/dashboard-store';
import { useAccountBookStore } from '@/store/account-book-store';
import '../common/unified-transaction-list.css';
import '../../app/dashboard/dashboard.css';

interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  categoryIcon?: string;
  description?: string;
  date: string;
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
  attachmentCount?: number;
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
  function RecentTransactions({
    groupedTransactions,
    onTransactionDeleted,
  }: RecentTransactionsProps) {
    const router = useRouter();
    const { currentAccountBook } = useAccountBookStore();
    const {
      isLoadingMore,
      hasMoreTransactions,
      totalTransactionsCount,
      loadMoreTransactions,
    } = useDashboardStore();

    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

    // 无限滚动相关状态
    const [isAutoLoadEnabled, setIsAutoLoadEnabled] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
    const isLoadingRef = useRef(false); // 用于防止重复触发

    // 处理记账项点击 - 触发模态框编辑
    const handleTransactionClick = (transactionId: string) => {
      // 添加交易点击的振动反馈
      hapticPresets.transactionTap();



      // 设置 localStorage 标记来触发模态框
      localStorage.setItem('showTransactionEditModal', 'true');
      localStorage.setItem('pendingTransactionEdit', transactionId);

      // 触发页面重新检查（通过触发一个自定义事件）
      window.dispatchEvent(new CustomEvent('checkTransactionEditModal'));
    };

    // 处理附件点击 - 跳转到记账详情页
    const handleAttachmentClick = (transactionId: string) => {
      router.push(`/transactions/${transactionId}`);
    };

    // 处理删除记账
    const handleDeleteClick = (transactionId: string) => {
      // 找到要删除的记账信息
      const transaction = groupedTransactions
        .flatMap((group) => group.transactions)
        .find((t) => t.id === transactionId);

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

    // 手动加载更多记录
    const handleLoadMore = async () => {

      if (currentAccountBook?.id) {
        await loadMoreTransactions(currentAccountBook.id);
      } else {
        console.error('❌ [RecentTransactions] 没有找到账本ID');
      }
    };

    // 同步 isLoadingMore 状态到 ref
    useEffect(() => {
      isLoadingRef.current = isLoadingMore;
    }, [isLoadingMore]);

    // 无限滚动逻辑
    useEffect(() => {
      if (!isAutoLoadEnabled || !loadMoreTriggerRef.current) {
        return;
      }

      // 延迟查找滚动容器，确保 DOM 已经渲染
      const timer = setTimeout(() => {
        const scrollContainer = document.querySelector('.main-content') as HTMLElement;
        if (!scrollContainer) return;

        // 使用 Intersection Observer 检测加载触发元素是否可见
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (
                entry.isIntersecting && 
                hasMoreTransactions && 
                !isLoadingRef.current &&
                currentAccountBook?.id
              ) {
                isLoadingRef.current = true;
                loadMoreTransactions(currentAccountBook.id);
              }
            });
          },
          {
            root: scrollContainer, // 使用仪表盘的main-content滚动容器
            rootMargin: '100px', // 提前100px开始加载，改善用户体验
            threshold: 0.1, // 10% 的元素可见时触发
          }
        );

        if (loadMoreTriggerRef.current) {
          observer.observe(loadMoreTriggerRef.current);
        }

        return () => {
          observer.disconnect();
        };
      }, 100);

      return () => clearTimeout(timer);
    }, [isAutoLoadEnabled, hasMoreTransactions, currentAccountBook?.id, loadMoreTransactions]);

    return (
      <section className="recent-transactions">
        <div className="section-header">
          <h2>最近记账</h2>
          <Link href="/transactions?refresh=true" className="view-all">
            查看全部
          </Link>
        </div>

        <div className="recent-transactions-content">
          <UnifiedTransactionList
            groupedTransactions={groupedTransactions}
            onTransactionClick={handleTransactionClick}
            showDateHeaders={true}
            emptyMessage="暂无记账记录"
            enableSwipeActions={true}
            onAttachmentClick={handleAttachmentClick}
            onDeleteClick={handleDeleteClick}
            onDataRefresh={onTransactionDeleted}
            isLoadingMore={isLoadingMore}
            hasMore={hasMoreTransactions}
            totalCount={totalTransactionsCount}
          />

          {/* 加载更多触发元素和手动加载按钮 */}
          {hasMoreTransactions && (
            <div ref={loadMoreTriggerRef} className="load-more-container">
              {isLoadingMore ? (
                <div className="loading-more">
                  <div className="loading-spinner"></div>
                  <span>加载中...</span>
                </div>
              ) : (
                <button
                  onClick={handleLoadMore}
                  className="load-more-button"
                >
                  加载更多记录
                </button>
              )}
            </div>
          )}

          {/* 没有更多数据提示 */}
          {!hasMoreTransactions && totalTransactionsCount > 0 && (
            <div className="no-more-data">
              已加载全部 {totalTransactionsCount} 条记录
            </div>
          )}
        </div>

        {/* 删除确认对话框 */}
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          title="删除记账"
          message="确定要删除这笔记账吗？"
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
    // 自定义比较函数，只有当记账数据真正变化时才重新渲染
    if (prevProps.groupedTransactions.length !== nextProps.groupedTransactions.length) {
      return false;
    }

    // 深度比较记账组数据
    for (let i = 0; i < prevProps.groupedTransactions.length; i++) {
      const prevGroup = prevProps.groupedTransactions[i];
      const nextGroup = nextProps.groupedTransactions[i];

      if (
        prevGroup.date !== nextGroup.date ||
        prevGroup.transactions.length !== nextGroup.transactions.length
      ) {
        return false;
      }

      // 比较每个记账
      for (let j = 0; j < prevGroup.transactions.length; j++) {
        const prevTx = prevGroup.transactions[j];
        const nextTx = nextGroup.transactions[j];

        if (
          prevTx.id !== nextTx.id ||
          prevTx.amount !== nextTx.amount ||
          prevTx.type !== nextTx.type ||
          prevTx.description !== nextTx.description ||
          prevTx.categoryName !== nextTx.categoryName ||
          prevTx.categoryIcon !== nextTx.categoryIcon
        ) {
          return false;
        }
      }
    }

    return true;
  },
);
