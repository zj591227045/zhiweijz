'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { PageContainer } from '@/components/layout/page-container';
import { MonthlyOverview } from '@/components/dashboard/monthly-overview';
import { BudgetProgress } from '@/components/dashboard/budget-progress';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { CalendarView } from '@/components/dashboard/calendar/calendar-view';
import { createLogger } from '@/lib/logger';
import '@/lib/logger-test'; // 导入测试，会自动运行

import { useDashboardStore } from '@/store/dashboard-store';
import TransactionEditModal from '@/components/transaction-edit-modal';
import { useNotificationStore } from '@/store/notification-store';
import { NotificationModal } from '@/components/notifications/NotificationModal';
import { hapticPresets } from '@/lib/haptic-feedback';
import './dashboard.css';

// 创建模块专用 logger
const dashboardLog = createLogger('Dashboard');

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
    showBackToTop,
    setShowBackToTop,
  } = useDashboardStore();

  const { unreadCount, isModalOpen, openModal, closeModal, checkUnreadOnLogin } =
    useNotificationStore();

  // 记账编辑模态框状态
  const [showTransactionEditModal, setShowTransactionEditModal] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<any>(null);

  // 视图切换状态
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar'>('dashboard');

  // 初始化标记 - 防止重复调用数据获取
  const hasInitialized = useRef(false);

  // 返回顶部函数
  const scrollToTop = () => {
    // 触发振动反馈
    hapticPresets.navigation();
    
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // 从 store 获取 autoRefreshCount
  const { autoRefreshCount } = useDashboardStore();

  // 本地状态：是否滚动到底部
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  // 监听滚动事件
  useEffect(() => {
    const timer = setTimeout(() => {
      const mainContent = document.querySelector('.main-content') as HTMLElement;
      if (!mainContent) return;

      const handleScroll = (e: Event) => {
        const target = e.target as HTMLElement;
        const scrolledDown = target.scrollTop > 200;
        setIsScrolledDown(scrolledDown);
      };

      mainContent.addEventListener('scroll', handleScroll, { passive: true });
      
      // 初始检查一次滚动位置
      const initialScrolledDown = mainContent.scrollTop > 200;
      setIsScrolledDown(initialScrolledDown);
      
      return () => {
        mainContent.removeEventListener('scroll', handleScroll);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 根据条件计算是否显示返回顶部按钮
  useEffect(() => {
    const shouldShow = isScrolledDown && autoRefreshCount > 2;
    setShowBackToTop(shouldShow);
  }, [isScrolledDown, autoRefreshCount, setShowBackToTop]);

  // 移动端后退处理 - 完全禁用仪表盘的硬件后退处理，避免与模态框冲突
  // 这样可以让模态框的后退处理器独占硬件后退按钮
  // const { canExitApp } = useMobileBackHandler({
  //   pageId: 'dashboard',
  //   pageLevel: PageLevel.DASHBOARD,
  //   enableHardwareBack: false, // 禁用硬件后退，避免冲突
  //   enableBrowserBack: false,
  //   onBack: () => {
  //     if (currentView === 'calendar') {
  //       setCurrentView('dashboard');
  //       return true;
  //     }
  //     return false;
  //   },
  // });

  // 简单的视图切换处理
  const handleViewBack = () => {
    if (currentView === 'calendar') {
      setCurrentView('dashboard');
    }
  };

  // 认证检查和初始数据加载
  useEffect(() => {
    dashboardLog.debug('useEffect 触发，认证状态:', isAuthenticated, '用户:', user);

    // 检查用户是否已登录
    if (!isAuthenticated) {
      dashboardLog.info('用户未登录，重定向到登录页面');
      router.push('/auth/login');
      return;
    }

    dashboardLog.debug('用户已登录，开始获取账本列表');
    // 获取账本列表
    fetchAccountBooks();
  }, [isAuthenticated, router]); // 移除函数依赖

  // 当账本变化时获取仪表盘数据
  useEffect(() => {
    dashboardLog.debug('账本变化检测', {
      isAuthenticated,
      currentAccountBook,
      accountBookId: currentAccountBook?.id,
    });

    if (isAuthenticated && currentAccountBook?.id) {
      dashboardLog.debug('当前账本存在，获取仪表盘数据', currentAccountBook);
      fetchDashboardData(currentAccountBook.id);
      hasInitialized.current = true; // ✅ 标记已初始化
    } else {
      dashboardLog.debug('条件不满足，不获取仪表盘数据', {
        isAuthenticated,
        hasCurrentAccountBook: !!currentAccountBook,
        accountBookId: currentAccountBook?.id,
      });
    }
  }, [currentAccountBook?.id, isAuthenticated]); // 只依赖账本ID和认证状态

  // 用户登录后检查未读通知
  useEffect(() => {
    if (isAuthenticated && user) {
      dashboardLog.debug('用户已登录，检查未读通知');
      checkUnreadOnLogin();
    }
  }, [isAuthenticated, user]); // ✅ 移除函数依赖，避免不必要的重新执行

  // 设置记账变化监听器
  useEffect(() => {
    dashboardLog.debug('设置记账变化监听器');
    setupTransactionListener();

    return () => {
      dashboardLog.debug('清理记账变化监听器');
      cleanupTransactionListener();
    };
  }, []); // 只在组件挂载时设置一次

  // 监听页面可见性变化，当页面重新获得焦点时刷新数据
  useEffect(() => {
    // 使用防抖避免visibilitychange和focus事件同时触发
    let refreshTimeout: NodeJS.Timeout | null = null;

    const scheduleRefresh = (source: string) => {
      if (!currentAccountBook?.id) return;

      // 清除之前的定时器
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      // 延迟100ms执行，合并多个事件
      refreshTimeout = setTimeout(() => {
        console.log(`🏠 [Dashboard] ${source}触发刷新`);
        refreshDashboardData(currentAccountBook.id);
        refreshTimeout = null;
      }, 100);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && currentAccountBook?.id) {
        scheduleRefresh('页面可见性变化');
      }
    };

    // ✅ 移除focus监听，只使用visibilitychange（更可靠）
    // focus事件在某些情况下会与visibilitychange重复触发

    // 监听localStorage变化（用于跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboard_refresh_signal' && e.newValue && currentAccountBook?.id) {
        try {
          const signal = JSON.parse(e.newValue);
          dashboardLog.debug('🏠 [Dashboard] 监听到localStorage刷新信号:', signal);

          // 检查信号是否是最近5秒内的
          if (
            Date.now() - signal.timestamp < 5000 &&
            signal.accountBookId === currentAccountBook.id
          ) {
            scheduleRefresh('storage事件');
          }
        } catch (error) {
          dashboardLog.error('🏠 [Dashboard] 处理storage事件失败:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      // 清理定时器
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentAccountBook?.id]); // 只依赖账本ID

  // 监听路由变化，当进入仪表盘页面时处理刷新信号
  useEffect(() => {
    // ✅ 只在已初始化后才处理路由变化，避免重复调用
    if (!hasInitialized.current) {
      dashboardLog.debug('🏠 [Dashboard] 尚未初始化，跳过路由监听');
      return;
    }

    if (pathname === '/dashboard' && currentAccountBook?.id) {
      dashboardLog.debug('🏠 [Dashboard] 进入仪表盘页面，检查刷新信号');

      // 检查localStorage中的刷新信号
      const checkRefreshSignal = () => {
        try {
          const signalStr = localStorage.getItem('dashboard_refresh_signal');
          
          // ✅ 没有信号时直接返回，不执行任何操作
          if (!signalStr) {
            dashboardLog.debug('🏠 [Dashboard] 没有刷新信号，跳过');
            return false;
          }

          const signal = JSON.parse(signalStr);
          dashboardLog.debug('🏠 [Dashboard] 检测到刷新信号:', signal);

          // 检查信号是否是最近5秒内的（避免处理过期信号）
          if (Date.now() - signal.timestamp > 5000) {
            localStorage.removeItem('dashboard_refresh_signal');
            dashboardLog.debug('🏠 [Dashboard] 刷新信号已过期，清除');
            return false;
          }

          // 清除信号
          localStorage.removeItem('dashboard_refresh_signal');

          // ✅ 只在信号有效且账本匹配时才刷新
          if (signal.accountBookId && currentAccountBook?.id === signal.accountBookId) {
            dashboardLog.debug('🏠 [Dashboard] 根据刷新信号刷新数据');
            refreshDashboardData(signal.accountBookId);
            return true;
          }
        } catch (error) {
          dashboardLog.error('🏠 [Dashboard] 处理刷新信号失败:', error);
          localStorage.removeItem('dashboard_refresh_signal');
        }
        return false;
      };

      // 检查刷新信号
      checkRefreshSignal();
    }
  }, [pathname, currentAccountBook?.id]); // 移除函数依赖

  // 检测记账编辑模态框标记
  useEffect(() => {
    const checkTransactionEditModal = () => {
      if (typeof window !== 'undefined') {
        const showModal = localStorage.getItem('showTransactionEditModal');
        const transactionId = localStorage.getItem('pendingTransactionEdit');

        dashboardLog.debug('🏠 [Dashboard] 检查记账编辑模态框标记:', { showModal, transactionId });

        if (showModal === 'true' && transactionId) {
          dashboardLog.debug('🏠 [Dashboard] 发现记账编辑请求，记账ID:', transactionId);

          // 清除标记
          localStorage.removeItem('showTransactionEditModal');
          localStorage.removeItem('pendingTransactionEdit');

          // 设置模态框状态
          setEditingTransactionId(transactionId);
          setShowTransactionEditModal(true);

          // 获取记账详情
          fetchTransactionData(transactionId);
        }
      }
    };

    // 监听自定义事件
    const handleCheckTransactionEditModal = () => {
      dashboardLog.debug('🏠 [Dashboard] 收到检查记账编辑模态框事件');
      checkTransactionEditModal();
    };

    checkTransactionEditModal();

    // 添加事件监听器
    window.addEventListener('checkTransactionEditModal', handleCheckTransactionEditModal);

    return () => {
      window.removeEventListener('checkTransactionEditModal', handleCheckTransactionEditModal);
    };
  }, [pathname]); // 当路径变化时检查

  // 获取记账详情 - 使用apiClient调用后端API
  const fetchTransactionData = async (transactionId: string) => {
    try {
      dashboardLog.debug('🏠 [Dashboard] 从API获取记账详情:', transactionId);
      
      // 🔍 调试：显示当前所有记账ID
      const allTransactions = groupedTransactions.flatMap((group) => group.transactions);
      dashboardLog.debug('🏠 [Dashboard] 当前记账列表中的所有ID:', allTransactions.map(t => t.id));
      dashboardLog.debug('🏠 [Dashboard] 要查找的ID:', transactionId);
      dashboardLog.debug('🏠 [Dashboard] ID是否存在于列表中:', allTransactions.some(t => t.id === transactionId));
      
      // ✅ 使用apiClient而不是fetch，确保请求发送到正确的后端服务器
      const { apiClient } = await import('@/lib/api-client');
      const data = await apiClient.get(`/transactions/${transactionId}`, {
        params: { includeAttachments: true }
      });
      
      dashboardLog.debug('🏠 [Dashboard] API返回数据:', data);
      
      // ✅ 后端直接返回transaction对象
      if (data && data.id) {
        dashboardLog.debug('🏠 [Dashboard] 获取记账详情成功');
        setTransactionData(data);
      } else {
        throw new Error('记账数据格式错误');
      }
    } catch (error: any) {
      dashboardLog.error('🏠 [Dashboard] 获取记账详情失败:', error);
      
      if (error.response?.status === 404) {
        alert('该记账不存在或已被删除，请刷新页面');
        if (currentAccountBook?.id) {
          refreshDashboardData(currentAccountBook.id);
        }
      } else {
        alert('获取记账详情失败，请重试');
      }
      setShowTransactionEditModal(false);
    }
  };

  // ✅ 使用useCallback优化回调函数，避免不必要的重新渲染
  const handleEditModalClose = useCallback(() => {
    setShowTransactionEditModal(false);
    setTransactionData(null);
    setEditingTransactionId(null);
  }, []);

  const handleEditModalSave = useCallback(() => {
    // 刷新仪表盘数据
    if (currentAccountBook?.id) {
      refreshDashboardData(currentAccountBook.id);
    }
    setShowTransactionEditModal(false);
    setTransactionData(null);
    setEditingTransactionId(null);
  }, [currentAccountBook?.id, refreshDashboardData]);

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
      <button className="icon-button relative" onClick={openModal} aria-label="通知">
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
              className="px-4 py-3 rounded mb-4 mx-4"
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
            <div className="dashboard-content-wrapper">
              {/* 月度概览 */}
              <div className="dashboard-section">
                <MonthlyOverview
                  income={monthlyStats.income}
                  expense={monthlyStats.expense}
                  balance={monthlyStats.balance}
                  month={monthlyStats.month}
                />
              </div>

              {/* 预算执行情况 */}
              <div className="dashboard-section">
                <BudgetProgress categories={budgetCategories} totalBudget={totalBudget} />
              </div>

              {/* 最近记账 - 占据剩余空间 */}
              <div className="dashboard-section flex-grow">
                <RecentTransactions
                  groupedTransactions={groupedTransactions}
                  onTransactionDeleted={() => {
                    // 删除成功后重新获取数据
                    if (currentAccountBook?.id) {
                      fetchDashboardData(currentAccountBook.id);
                    }
                  }}
                />
              </div>

              {/* 底部安全区域，确保内容不被遮挡 */}
              <div style={{ height: '80px' }}></div>
            </div>
          )}
        </>
      )}

      {/* 记账编辑模态框 - 使用完整的 App Router 组件 */}
      {showTransactionEditModal && transactionData && (
        <TransactionEditModal
          key={editingTransactionId || 'new'} // ✅ 添加key，防止不必要的重新挂载
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
      <NotificationModal isOpen={isModalOpen} onClose={closeModal} />

      {/* 返回顶部按钮 */}
      <button
        onClick={scrollToTop}
        className={`back-to-top-button ${showBackToTop ? 'visible' : ''}`}
        title="返回顶部"
      >
        <i className="fas fa-arrow-up"></i>
      </button>
    </PageContainer>
  );
}
