'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { PageContainer } from '@/components/layout/page-container';
import { formatCurrency, getCategoryIconClass } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { hapticPresets } from '@/lib/haptic-feedback';
import dayjs from 'dayjs';
import { smartNavigate } from '@/lib/navigation';
import TransactionEditModal from '@/components/transaction-edit-modal';
import { UnifiedTransactionList } from '../common/unified-transaction-list';
import { DeleteConfirmationDialog } from '../ui/delete-confirmation-dialog';
import { FilterContainer } from './filter-container';
import '../common/unified-transaction-list.css';
import './budget-filter.css';
import './filter-container.css';

// 导入记账类型枚举
import { TransactionType } from '../common/unified-transaction-list';

// 日期范围类型
export type DateRangeType = 'current-month' | 'last-month' | 'custom';

// 获取当前月份的开始和结束日期
const getCurrentMonthRange = () => {
  const now = dayjs();
  return {
    startDate: now.startOf('month').format('YYYY-MM-DD'),
    endDate: now.endOf('month').format('YYYY-MM-DD'),
  };
};

export function TransactionListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    income: 0,
    expense: 0,
    balance: 0,
  });

  // 分页状态
  const [pagination, setPagination] = useState({
    currentPage: 1,
    hasMore: true,
    total: 0,
  });

  // 多选状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 单个删除状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  // 记账编辑模态框状态
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingTransactionData, setEditingTransactionData] = useState<any>(null);

  // 从URL参数获取预算ID - 添加null检查
  const budgetId = searchParams?.get('budgetId');

  // 筛选条件状态 - 避免hydration错误，初始值保持简单
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    transactionType: 'ALL',
    categoryIds: [] as string[],
    accountBookId: '',
    budgetId: '',
    isFilterPanelOpen: false,
  });

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // 组件挂载状态 - 避免hydration错误
  const [isMounted, setIsMounted] = useState(false);

  // 筛选选项状态
  const [filterOptions, setFilterOptions] = useState<{
    budgets: any[];
  }>({
    budgets: [],
  });

  // 创建滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 设置组件挂载状态
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 监听当前账本变化，更新筛选条件
  useEffect(() => {
    if (currentAccountBook?.id) {
      setFilters((prev) => ({
        ...prev,
        accountBookId: currentAccountBook.id,
      }));
    }
  }, [currentAccountBook?.id]);

  // 获取记账数据的函数（重置数据）
  const fetchTransactions = async (resetData = true) => {
    try {
      if (resetData) {
        setIsLoading(true);
        setPagination({ currentPage: 1, hasMore: true, total: 0 });
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      // 构建查询参数
      const queryParams: Record<string, any> = {
        page: resetData ? 1 : pagination.currentPage + 1,
        limit: 20,
        sort: 'date:desc',
        includeAttachments: true, // 包含附件信息
      };

      // 只有在设置了日期筛选时才添加日期参数
      if (filters.startDate) {
        queryParams.startDate = filters.startDate;
      }
      if (filters.endDate) {
        queryParams.endDate = filters.endDate;
      }

      // 添加搜索查询参数
      if (searchQuery.trim()) {
        queryParams.search = searchQuery.trim();
        console.log('搜索查询:', searchQuery.trim()); // 调试信息
      }

      if (filters.transactionType !== 'ALL') {
        queryParams.type = filters.transactionType;
      }

      if (filters.categoryIds.length > 0) {
        queryParams.categoryIds = filters.categoryIds.join(',');
      }

      if (filters.accountBookId) {
        queryParams.accountBookId = filters.accountBookId;
      }

      // 添加预算ID参数 - 优先使用筛选器中的预算ID
      const selectedBudgetId = filters.budgetId || budgetId;
      if (selectedBudgetId) {
        queryParams.budgetId = selectedBudgetId;
      }

      // 获取记账数据
      const response = await apiClient.get('/transactions', {
        params: queryParams,
      });

      if (response && response.data) {
        const newTransactions = response.data;
        const newTotal = response.total || 0;
        const currentPage = queryParams.page;
        const hasMore =
          newTransactions.length === queryParams.limit &&
          currentPage * queryParams.limit < newTotal;

        if (resetData) {
          setTransactions(newTransactions);
          // 获取统计数据（只在重置时获取）
          const statsParams: Record<string, any> = {};

          if (filters.startDate) {
            statsParams.startDate = filters.startDate;
          }
          if (filters.endDate) {
            statsParams.endDate = filters.endDate;
          }
          if (filters.accountBookId) {
            statsParams.accountBookId = filters.accountBookId;
          }
          if (filters.transactionType !== 'ALL') {
            statsParams.type = filters.transactionType;
          }
          if (filters.categoryIds.length > 0) {
            statsParams.categoryIds = filters.categoryIds.join(',');
          }
          // 添加预算ID参数 - 优先使用筛选器中的预算ID
          const selectedBudgetId = filters.budgetId || budgetId;
          if (selectedBudgetId) {
            statsParams.budgetId = selectedBudgetId;
          }
          // 注意：统计API不支持搜索参数，所以不传递search参数

          const statsResponse = await apiClient.get('/statistics/overview', {
            params: statsParams,
          });

          if (statsResponse) {
            setStatistics({
              income: statsResponse.income || 0,
              expense: statsResponse.expense || 0,
              balance: (statsResponse.income || 0) - (statsResponse.expense || 0),
            });
          }
        } else {
          // 追加新数据
          setTransactions((prev) => {
            const updatedTransactions = [...prev, ...newTransactions];
            // 立即更新分组数据
            const grouped = groupTransactionsByDate(updatedTransactions);
            setGroupedTransactions(grouped);
            return updatedTransactions;
          });
        }

        // 更新分页状态
        setPagination({
          currentPage,
          hasMore,
          total: newTotal,
        });

        // 如果是重置数据，重新分组
        if (resetData) {
          const grouped = groupTransactionsByDate(newTransactions);
          setGroupedTransactions(grouped);
        }
      }

      if (resetData) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    } catch (error) {
      console.error('获取记账数据失败:', error);

      // 如果是搜索相关的错误，显示特定的错误信息
      if (searchQuery.trim() && (error as any)?.response?.status === 400) {
        setError('搜索功能暂时不可用，请稍后重试');
      } else {
        setError('获取记账数据失败，请重试');
      }

      if (resetData) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // 加载更多数据
  const loadMoreTransactions = async () => {
    if (!pagination.hasMore || isLoadingMore || isLoading) return;
    await fetchTransactions(false);
  };

  // 滚动监听器
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 提前100px触发

      if (isNearBottom && pagination.hasMore && !isLoadingMore && !isLoading) {
        loadMoreTransactions();
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [pagination.hasMore, isLoadingMore, isLoading]);

  // 获取记账数据
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTransactions(true);
  }, [isAuthenticated, filters, budgetId, searchQuery]);

  // 获取筛选选项数据
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // 获取预算数据
        const budgetsResponse = await apiClient.get('/budgets');
        if (budgetsResponse && budgetsResponse.data) {
          setFilterOptions((prev) => ({
            ...prev,
            budgets: budgetsResponse.data,
          }));
        }
      } catch (error) {
        console.error('获取筛选选项失败:', error);
      }
    };

    if (isAuthenticated) {
      fetchFilterOptions();
    }
  }, [isAuthenticated]);

  // 按日期分组记账 - 转换为统一组件格式
  const groupTransactionsByDate = (transactions: any[]) => {
    if (!Array.isArray(transactions)) return [];

    const groups: Record<string, any[]> = {};

    transactions.forEach((transaction) => {
      const date = dayjs(transaction.date).format('YYYY-MM-DD');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });

    return Object.entries(groups)
      .map(([date, transactions]) => ({
        date: dayjs(date).format('MM月DD日'),
        transactions: transactions.map((transaction) => ({
          id: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          categoryName: transaction.categoryName || transaction.category?.name,
          categoryIcon: transaction.categoryIcon || transaction.category?.icon,
          description: transaction.description || transaction.title,
          date: dayjs(transaction.date).format('HH:mm'),
          category: transaction.category,
          tags: transaction.tags,
          attachments: transaction.attachments,
        })),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // 切换筛选面板
  const toggleFilterPanel = () => {
    setFilters((prev) => ({
      ...prev,
      isFilterPanelOpen: !prev.isFilterPanelOpen,
    }));
  };

  // 处理记账项点击 - 多选模式下选择，否则打开编辑模态框
  const handleTransactionClick = (transactionId: string) => {
    if (isMultiSelectMode) {
      // 多选模式下，点击选择记账项
      hapticPresets.itemSelect();
      handleTransactionSelect(transactionId);
    } else {
      // 正常模式下，点击打开编辑模态框
      hapticPresets.transactionTap();

      // 找到对应的记账数据
      const transactionData = transactions.find((t) => t.id === transactionId);
      setEditingTransactionId(transactionId);
      setEditingTransactionData(transactionData);
    }
  };

  // 处理附件点击 - 跳转到记账详情页查看附件
  const handleAttachmentClick = (transactionId: string) => {
    smartNavigate(router, `/transactions/${transactionId}`);
  };

  // 处理删除记账
  const handleDeleteClick = (transactionId: string) => {
    const transactionData = transactions.find((t) => t.id === transactionId);
    if (!transactionData) return;

    setTransactionToDelete(transactionData);
    setDeleteDialogOpen(true);
  };

  // 确认删除记账
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      setDeletingTransactionId(transactionToDelete.id);
      await apiClient.delete(`/transactions/${transactionToDelete.id}`);

      // 从本地状态中移除已删除的记账
      setTransactions((prev) => prev.filter((t) => t.id !== transactionToDelete.id));

      // 重新计算分组数据
      const updatedTransactions = transactions.filter((t) => t.id !== transactionToDelete.id);
      const grouped = groupTransactionsByDate(updatedTransactions);
      setGroupedTransactions(grouped);

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

  // 处理记账选择
  const handleTransactionSelect = (transactionId: string) => {
    setSelectedTransactions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  // 切换多选模式
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedTransactions(new Set());
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map((t) => t.id)));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedTransactions.size === 0) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedTransactions).map((id) =>
        apiClient.delete(`/transactions/${id}`),
      );

      await Promise.all(deletePromises);

      // 重新获取数据
      await fetchTransactions();

      // 重置选择状态
      setSelectedTransactions(new Set());
      setIsMultiSelectMode(false);
      setShowDeleteConfirm(false);

      console.log(`成功删除 ${selectedTransactions.size} 条记账记录`);
    } catch (error) {
      console.error('批量删除失败:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 切换搜索模式
  const toggleSearchMode = () => {
    setIsSearchMode(!isSearchMode);
    if (isSearchMode) {
      setSearchQuery('');
    }
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
  };

  // 右侧操作按钮
  const rightActions = (
    <>
      {isMultiSelectMode ? (
        <>
          <button
            className="icon-button"
            onClick={toggleSelectAll}
            title={selectedTransactions.size === transactions.length ? '取消全选' : '全选'}
          >
            <i
              className={`fas ${selectedTransactions.size === transactions.length ? 'fa-check-square' : 'fa-square'}`}
            ></i>
          </button>
          <button
            className="icon-button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={selectedTransactions.size === 0}
            title="批量删除"
          >
            <i className="fas fa-trash-alt"></i>
          </button>
          <button className="icon-button" onClick={toggleMultiSelectMode} title="退出多选">
            <i className="fas fa-times"></i>
          </button>
        </>
      ) : (
        <>
          <button className="icon-button" onClick={toggleMultiSelectMode} title="多选">
            <i className="fas fa-check-square"></i>
          </button>
          <button
            className={`icon-button ${isSearchMode ? 'active' : ''}`}
            onClick={toggleSearchMode}
            title="搜索"
          >
            <i className="fas fa-search"></i>
          </button>
          <button className="icon-button" onClick={toggleFilterPanel}>
            <i className="fas fa-filter"></i>
          </button>
        </>
      )}
    </>
  );

  // 处理筛选条件变化
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 重置筛选条件
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      transactionType: 'ALL',
      categoryIds: [],
      accountBookId: currentAccountBook?.id || '',
      budgetId: '',
      isFilterPanelOpen: false,
    });
  };

  // 关闭记账编辑模态框
  const handleCloseEditModal = () => {
    setEditingTransactionId(null);
    setEditingTransactionData(null);
  };

  // 处理记账保存成功
  const handleTransactionSaved = () => {
    // 重新获取记账数据
    fetchTransactions();
    // 关闭模态框
    handleCloseEditModal();
  };

  return (
    <PageContainer
      title={budgetId ? '预算记账记录' : '记账记录'}
      rightActions={rightActions}
      activeNavItem="profile"
    >
      <div className="transactions-page">
        {!isMounted ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          </div>
        ) : (
          <div ref={scrollContainerRef} style={{ height: '100vh', overflowY: 'auto' }}>
            {/* 搜索输入框 */}
            {isSearchMode && (
              <div className="search-container">
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    placeholder="搜索记账内容或日期..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="search-input"
                    autoFocus
                  />
                  <button className="search-clear-button" onClick={clearSearch} title="清除搜索">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            )}
            {/* 筛选器容器 */}
            <FilterContainer
              filters={filters}
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              onResetFilters={resetFilters}
              isOpen={filters.isFilterPanelOpen}
              onToggle={toggleFilterPanel}
              budgetId={budgetId}
            />

            {/* 记账统计摘要 */}
            <div className="transaction-summary">
              <div className="summary-item income">
                <span className="label">收入</span>
                <span className="amount">{formatCurrency(statistics.income)}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-item expense">
                <span className="label">支出</span>
                <span className="amount">{formatCurrency(statistics.expense)}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-item balance">
                <span className="label">结余</span>
                <span className="amount">{formatCurrency(statistics.balance)}</span>
              </div>
            </div>

            {/* 记账列表 */}
            <UnifiedTransactionList
              groupedTransactions={groupedTransactions}
              onTransactionClick={handleTransactionClick}
              showDateHeaders={true}
              emptyMessage="暂无记账记录"
              isLoading={isLoading}
              error={error}
              isMultiSelectMode={isMultiSelectMode}
              selectedTransactions={selectedTransactions}
              onTransactionSelect={handleTransactionSelect}
              isLoadingMore={isLoadingMore}
              hasMore={pagination.hasMore}
              totalCount={pagination.total}
              className="transactions-page"
              enableSwipeActions={true}
              onAttachmentClick={handleAttachmentClick}
              onDeleteClick={handleDeleteClick}
              onDataRefresh={() => fetchTransactions(true)}
            />

            {/* 批量删除确认对话框 */}
            {showDeleteConfirm && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>确认删除</h3>
                  </div>
                  <div className="modal-body">
                    <p>确定要删除选中的 {selectedTransactions.size} 条记账记录吗？</p>
                    <p className="warning-text">此操作不可恢复，请谨慎操作。</p>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn-cancel"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      取消
                    </button>
                    <button
                      className="btn-danger"
                      onClick={handleBatchDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? '删除中...' : '确认删除'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 单个删除确认对话框 */}
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

            {/* 记账编辑模态框 */}
            {editingTransactionId && (
              <TransactionEditModal
                transactionId={editingTransactionId}
                transactionData={editingTransactionData}
                onClose={handleCloseEditModal}
                onSave={handleTransactionSaved}
              />
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
