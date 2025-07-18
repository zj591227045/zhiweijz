'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from './calendar';
import { UnifiedTransactionList, TransactionType } from '@/components/common/unified-transaction-list';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useCalendarStore } from '@/store/calendar-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { apiClient } from '@/lib/api-client';
import dayjs from 'dayjs';
import '@/components/common/unified-transaction-list.css';
import './calendar-view.css';

interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  categoryIcon?: string;
  description?: string;
  date: string;
  attachments?: any[];
}

interface GroupedTransactions {
  date: string;
  transactions: Transaction[];
}

export function CalendarView() {
  const router = useRouter();
  const { currentAccountBook } = useAccountBookStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [isLoadingToday, setIsLoadingToday] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  
  // 删除相关状态 - 与仪表盘最近记账组件保持一致
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  
  const {
    currentMonth,
    dailyStats,
    selectedDate,
    displayMode,
    isLoading,
    error,
    setCurrentMonth,
    setDisplayMode,
    fetchMonthlyStats,
    selectDate,
    clearSelectedDate,
    clearCalendarData
  } = useCalendarStore();

  // 获取指定日期的记账数据
  const fetchDateTransactions = async (accountBookId: string, date: string) => {
    try {
      setIsLoadingToday(true);
      
      console.log('🗓️ [CalendarView] 获取日期记账:', { accountBookId, date });
      
      const params = {
        accountBookId,
        startDate: date,
        endDate: date,
        sort: 'date:desc',
        limit: 50
      };
      
      const response = await apiClient.get('/transactions', { params });
      
      console.log('🗓️ [CalendarView] 获取到', response?.data?.length || 0, '笔记账记录');
      
      if (response?.data && Array.isArray(response.data)) {
        const transactions = response.data.map((tx: any) => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          description: tx.description || tx.categoryName || '未知记账',
          categoryName: tx.categoryName || tx.category?.name || '未分类',
          categoryIcon: tx.categoryIcon || tx.category?.icon || 'other',
          date: tx.date,
          createdAt: tx.createdAt || tx.date,
          attachments: tx.attachments || []
        }));
        
        setTodayTransactions(transactions);
      } else {
        setTodayTransactions([]);
      }
    } catch (error) {
      console.error('🗓️ [CalendarView] 获取日期记账失败:', error);
      setTodayTransactions([]);
    } finally {
      setIsLoadingToday(false);
    }
  };

  // 初始化和账本变化时获取数据
  useEffect(() => {
    if (currentAccountBook?.id) {
      fetchMonthlyStats(currentAccountBook.id, currentMonth);
      // 默认获取今日记账
      const today = dayjs().format('YYYY-MM-DD');
      fetchDateTransactions(currentAccountBook.id, today);
      setIsInitialized(true);
    }
  }, [currentAccountBook?.id, currentMonth, fetchMonthlyStats]);

  // 月份变化时重新获取数据
  const handleMonthChange = (month: string) => {
    setCurrentMonth(month);
    clearSelectedDate();
    if (currentAccountBook?.id) {
      fetchMonthlyStats(currentAccountBook.id, month);
    }
  };

  // 日期选择处理
  const handleDateSelect = (date: string) => {
    selectDate(date);
    setCurrentDate(date);
    if (currentAccountBook?.id) {
      fetchDateTransactions(currentAccountBook.id, date);
    }
  };

  // 处理记账项点击 - 与仪表盘最近记账组件完全一致
  const handleTransactionClick = (transactionId: string) => {
    console.log('🗓️ [CalendarView] 记账点击，ID:', transactionId);

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

  // 处理删除记账 - 与仪表盘最近记账组件完全一致
  const handleDeleteClick = (transactionId: string) => {
    // 找到要删除的记账信息
    const transaction = todayTransactions.find(t => t.id === transactionId);

    if (!transaction) return;

    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  // 确认删除记账 - 与仪表盘最近记账组件完全一致
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      setDeletingTransactionId(transactionToDelete.id);
      await apiClient.delete(`/transactions/${transactionToDelete.id}`);

      // 删除成功，重新获取数据
      if (currentAccountBook?.id) {
        await fetchDateTransactions(currentAccountBook.id, currentDate);
        // 同时更新日历统计数据
        await fetchMonthlyStats(currentAccountBook.id, currentMonth);
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

  // 取消删除 - 与仪表盘最近记账组件完全一致
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  // 数据刷新回调 - 与仪表盘最近记账组件完全一致
  const handleDataRefresh = async () => {
    if (currentAccountBook?.id) {
      await fetchDateTransactions(currentAccountBook.id, currentDate);
      // 同时更新日历统计数据
      await fetchMonthlyStats(currentAccountBook.id, currentMonth);
    }
  };

  // 分组记账数据
  const groupTransactionsByDate = (transactions: Transaction[]): GroupedTransactions[] => {
    const grouped = transactions.reduce((acc: GroupedTransactions[], transaction: Transaction) => {
      const existingGroup = acc.find(group => group.date === transaction.date);
      if (existingGroup) {
        existingGroup.transactions.push(transaction);
      } else {
        acc.push({
          date: transaction.date,
          transactions: [transaction]
        });
      }
      return acc;
    }, []);
    
    return grouped.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  };

  // 显示模式切换
  const handleDisplayModeToggle = () => {
    setDisplayMode(displayMode === 'expense' ? 'income' : 'expense');
  };

  // 清理函数
  useEffect(() => {
    return () => {
      clearCalendarData();
    };
  }, [clearCalendarData]);

  if (!currentAccountBook) {
    return (
      <div className="calendar-view-container">
        <div className="no-account-book">
          <p>请先选择账本</p>
        </div>
      </div>
    );
  }

  const groupedTransactions = groupTransactionsByDate(todayTransactions);

  return (
    <div className="calendar-view-container">

      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button 
            onClick={() => currentAccountBook && fetchMonthlyStats(currentAccountBook.id, currentMonth)}
            className="retry-btn"
          >
            重试
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && !isInitialized && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      )}

      {/* 日历组件 */}
      {!isLoading && isInitialized && (
        <Calendar
          currentMonth={currentMonth}
          dailyStats={dailyStats}
          selectedDate={selectedDate}
          displayMode={displayMode}
          onDateSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
          onDisplayModeToggle={handleDisplayModeToggle}
        />
      )}

      {/* 记账记录列表 - 与仪表盘最近记账组件完全一致 */}
      <section className="recent-transactions">
        <div className="section-header">
          <h2>{selectedDate ? dayjs(selectedDate).format('MM月DD日') : '今日'}记账记录</h2>
          <div className="transaction-actions">
            <span className="transaction-count">
              {isLoadingToday ? '加载中...' : `${todayTransactions.length} 笔`}
            </span>
            {selectedDate && (
              <button 
                className="close-btn"
                onClick={clearSelectedDate}
                title="回到今日"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {isLoadingToday ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>加载记账记录...</p>
          </div>
        ) : (
          <UnifiedTransactionList
            groupedTransactions={groupedTransactions}
            onTransactionClick={handleTransactionClick}
            showDateHeaders={false}
            emptyMessage={`${selectedDate ? dayjs(selectedDate).format('MM月DD日') : '今日'}暂无记账记录`}
            isLoading={false}
            error={null}
            className=""
            isMultiSelectMode={false}
            selectedTransactions={new Set()}
            onTransactionSelect={() => {}}
            isLoadingMore={false}
            hasMore={false}
            totalCount={todayTransactions.length}
            enableSwipeActions={true}
            onAttachmentClick={handleAttachmentClick}
            onDeleteClick={handleDeleteClick}
            onDataRefresh={handleDataRefresh}
          />
        )}
      </section>

      {/* 删除确认对话框 - 与仪表盘最近记账组件完全一致 */}
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
    </div>
  );
}