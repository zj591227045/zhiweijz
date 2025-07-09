'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { PageContainer } from '@/components/layout/page-container';
import { MonthlyOverview } from '@/components/dashboard/monthly-overview';
import { BudgetProgress } from '@/components/dashboard/budget-progress';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { CalendarView } from '@/components/dashboard/calendar/calendar-view';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  accountBookService,
  statisticsService,
  budgetService,
  transactionService,
} from '@/lib/api-services';
import dayjs from 'dayjs';
import { TransactionType } from '@/components/dashboard/recent-transactions';
import { useDashboardStore } from '@/store/dashboard-store';
import TransactionEditModal from '@/components/transaction-edit-modal';
import { useNotificationStore } from '@/store/notification-store';
import { NotificationModal } from '@/components/notifications/NotificationModal';

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const {
    monthlyStats,
    budgetCategories,
    totalBudget,
    groupedTransactions,
    isLoading,
    error,
    fetchDashboardData,
    refreshDashboardData,
    setupTransactionListener,
    cleanupTransactionListener,
  } = useDashboardStore();

  const {
    unreadCount,
    isModalOpen,
    openModal,
    closeModal,
    checkUnreadOnLogin
  } = useNotificationStore();

  // 交易编辑模态框状态
  const [showTransactionEditModal, setShowTransactionEditModal] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<any>(null);
  
  // 视图切换状态
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar'>('dashboard');

  // 认证检查和初始数据加载
  useEffect(() => {
    console.log('🏠 [Dashboard] useEffect 触发，认证状态:', isAuthenticated, '用户:', user);

    // 检查用户是否已登录
    if (!isAuthenticated) {
      console.log('🏠 [Dashboard] 用户未登录，重定向到登录页面');
      router.push('/auth/login');
      return;
    }

    console.log('🏠 [Dashboard] 用户已登录，开始获取账本列表');
    // 获取账本列表
    fetchAccountBooks();
  }, [isAuthenticated, router]); // 移除函数依赖

  // 当账本变化时获取仪表盘数据
  useEffect(() => {
    console.log('🏠 [Dashboard] 账本变化检测:', {
      isAuthenticated,
      currentAccountBook,
      accountBookId: currentAccountBook?.id,
    });

    if (isAuthenticated && currentAccountBook?.id) {
      console.log('🏠 [Dashboard] 当前账本存在，获取仪表盘数据:', currentAccountBook);
      fetchDashboardData(currentAccountBook.id);
    } else {
      console.log('🏠 [Dashboard] 条件不满足，不获取仪表盘数据:', {
        isAuthenticated,
        hasCurrentAccountBook: !!currentAccountBook,
        accountBookId: currentAccountBook?.id,
      });
    }
  }, [currentAccountBook?.id, isAuthenticated]); // 只依赖账本ID和认证状态

  // 用户登录后检查未读通知
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🏠 [Dashboard] 用户已登录，检查未读通知');
      checkUnreadOnLogin();
    }
  }, [isAuthenticated, user, checkUnreadOnLogin]);

  // 设置交易变化监听器
  useEffect(() => {
    console.log('仪表盘页面：设置交易变化监听器');
    setupTransactionListener();

    return () => {
      console.log('仪表盘页面：清理交易变化监听器');
      cleanupTransactionListener();
    };
  }, []); // 只在组件挂载时设置一次

  // 监听页面可见性变化，当页面重新获得焦点时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentAccountBook?.id) {
        console.log('页面重新获得焦点，刷新仪表盘数据');
        refreshDashboardData(currentAccountBook.id);
      }
    };

    const handleFocus = () => {
      if (currentAccountBook?.id) {
        console.log('窗口重新获得焦点，刷新仪表盘数据');
        refreshDashboardData(currentAccountBook.id);
      }
    };

    // 监听localStorage变化（用于跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboard_refresh_signal' && e.newValue && currentAccountBook?.id) {
        try {
          const signal = JSON.parse(e.newValue);
          console.log('监听到localStorage刷新信号:', signal);

          // 检查信号是否是最近5秒内的
          if (
            Date.now() - signal.timestamp < 5000 &&
            signal.accountBookId === currentAccountBook.id
          ) {
            console.log('根据storage事件刷新仪表盘数据');
            refreshDashboardData(signal.accountBookId);
          }
        } catch (error) {
          console.error('处理storage事件失败:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentAccountBook?.id]); // 只依赖账本ID

  // 监听路由变化，当进入仪表盘页面时处理刷新信号
  useEffect(() => {
    if (pathname === '/dashboard' && currentAccountBook?.id) {
      console.log('进入仪表盘页面，检查刷新信号');

      // 检查localStorage中的刷新信号
      const checkRefreshSignal = () => {
        try {
          const signalStr = localStorage.getItem('dashboard_refresh_signal');
          if (signalStr) {
            const signal = JSON.parse(signalStr);
            console.log('检测到仪表盘刷新信号:', signal);

            // 检查信号是否是最近5秒内的（避免处理过期信号）
            if (Date.now() - signal.timestamp < 5000) {
              console.log('处理仪表盘刷新信号，账本ID:', signal.accountBookId);

              // 清除信号
              localStorage.removeItem('dashboard_refresh_signal');

              // 刷新数据
              if (signal.accountBookId && currentAccountBook?.id === signal.accountBookId) {
                console.log('根据localStorage信号刷新仪表盘数据');
                refreshDashboardData(signal.accountBookId);
                return true; // 表示已处理刷新信号
              }
            } else {
              // 清除过期信号
              localStorage.removeItem('dashboard_refresh_signal');
              console.log('清除过期的仪表盘刷新信号');
            }
          }
        } catch (error) {
          console.error('处理仪表盘刷新信号失败:', error);
          localStorage.removeItem('dashboard_refresh_signal');
        }
        return false;
      };

      // 检查刷新信号，如果没有信号则不执行额外刷新
      checkRefreshSignal();
    }
  }, [pathname, currentAccountBook?.id]); // 移除函数依赖

  // 检测交易编辑模态框标记
  useEffect(() => {
    const checkTransactionEditModal = () => {
      if (typeof window !== 'undefined') {
        const showModal = localStorage.getItem('showTransactionEditModal');
        const transactionId = localStorage.getItem('pendingTransactionEdit');

        console.log('🏠 [Dashboard] 检查交易编辑模态框标记:', { showModal, transactionId });

        if (showModal === 'true' && transactionId) {
          console.log('🏠 [Dashboard] 发现交易编辑请求，交易ID:', transactionId);

          // 清除标记
          localStorage.removeItem('showTransactionEditModal');
          localStorage.removeItem('pendingTransactionEdit');

          // 设置模态框状态
          setEditingTransactionId(transactionId);
          setShowTransactionEditModal(true);

          // 获取交易详情
          fetchTransactionData(transactionId);
        }
      }
    };

    // 监听自定义事件
    const handleCheckTransactionEditModal = () => {
      console.log('🏠 [Dashboard] 收到检查交易编辑模态框事件');
      checkTransactionEditModal();
    };

    checkTransactionEditModal();

    // 添加事件监听器
    window.addEventListener('checkTransactionEditModal', handleCheckTransactionEditModal);

    return () => {
      window.removeEventListener('checkTransactionEditModal', handleCheckTransactionEditModal);
    };
  }, [pathname]); // 当路径变化时检查

  // 获取交易详情
  const fetchTransactionData = async (transactionId: string) => {
    try {
      console.log('🏠 [Dashboard] 开始获取交易详情:', transactionId);

      // 从当前的交易列表中查找交易详情（避免 API 调用）
      const allTransactions = groupedTransactions.flatMap(group => group.transactions);
      const transaction = allTransactions.find(t => t.id === transactionId);

      if (transaction) {
        console.log('🏠 [Dashboard] 从本地数据找到交易详情:', transaction);

        // 确保数据格式正确
        const formattedTransaction = {
          id: transaction.id,
          description: transaction.description || '',
          amount: transaction.amount || 0,
          type: transaction.type || 'EXPENSE',
          date: transaction.date || new Date().toISOString(),
          categoryId: transaction.categoryId || '',
          budgetId: transaction.budgetId || '',
          category: transaction.category || { name: '未分类' }
        };

        console.log('🏠 [Dashboard] 格式化后的交易数据:', formattedTransaction);
        setTransactionData(formattedTransaction);
      } else {
        // 如果本地没有，创建一个模拟的交易对象
        console.log('🏠 [Dashboard] 本地未找到交易，创建模拟数据');
        const mockTransaction = {
          id: transactionId,
          description: '交易记录',
          amount: 0,
          type: 'EXPENSE',
          date: new Date().toISOString(),
          categoryId: '',
          budgetId: '',
          category: { name: '未分类' }
        };
        setTransactionData(mockTransaction);
      }
    } catch (error) {
      console.error('🏠 [Dashboard] 获取交易详情失败:', error);
      alert('获取交易详情失败，请重试');
      setShowTransactionEditModal(false);
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <>
      <button 
        className={`icon-button ${currentView === 'calendar' ? 'active' : ''}`}
        onClick={() => setCurrentView(currentView === 'calendar' ? 'dashboard' : 'calendar')}
        aria-label={currentView === 'calendar' ? '切换到仪表盘' : '切换到日历'}
        title={currentView === 'calendar' ? '切换到仪表盘' : '切换到日历'}
      >
        <i className={`fas ${currentView === 'calendar' ? 'fa-chart-line' : 'fa-calendar'}`}></i>
      </button>
      <button 
        className="icon-button relative" 
        onClick={openModal}
        aria-label="通知"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </>
  );

  return (
    <PageContainer 
      title={currentView === 'calendar' ? '日历视图' : '仪表盘'} 
      rightActions={rightActions} 
      activeNavItem="home"
      className="dashboard-content"
    >
      {currentView === 'calendar' ? (
        <CalendarView />
      ) : (
        <>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div
                className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
                style={{ borderColor: 'var(--primary-color)' }}
              ></div>
            </div>
          ) : error ? (
            <div
              className="px-4 py-3 rounded mb-4"
              style={{
                backgroundColor: 'rgba(var(--error-color), 0.1)',
                borderColor: 'var(--error-color)',
                color: 'var(--error-color)',
                border: '1px solid',
              }}
            >
              {error}
            </div>
          ) : (
            <>
              {/* 月度概览 */}
              <MonthlyOverview
                income={monthlyStats.income}
                expense={monthlyStats.expense}
                balance={monthlyStats.balance}
                month={monthlyStats.month}
              />

              {/* 预算执行情况 */}
              <BudgetProgress categories={budgetCategories} totalBudget={totalBudget} />

              {/* 最近交易 */}
              <RecentTransactions
                groupedTransactions={groupedTransactions}
                onTransactionDeleted={() => {
                  // 删除成功后重新获取数据
                  fetchDashboardData();
                }}
              />
            </>
          )}
        </>
      )}

      {/* 交易编辑模态框 - 使用完整的 App Router 组件 */}
      {showTransactionEditModal && transactionData && (
        <TransactionEditModal
          transactionId={editingTransactionId}
          transactionData={transactionData}
          onClose={() => {
            setShowTransactionEditModal(false);
            setTransactionData(null);
            setEditingTransactionId(null);
          }}
          onSave={() => {
            // 刷新仪表盘数据
            if (currentAccountBook?.id) {
              refreshDashboardData(currentAccountBook.id);
            }
            setShowTransactionEditModal(false);
            setTransactionData(null);
            setEditingTransactionId(null);
          }}
        />
      )}

      {/* 通知模态框 */}
      <NotificationModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </PageContainer>
  );
}
