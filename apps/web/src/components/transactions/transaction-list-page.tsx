'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { formatCurrency, getCategoryIconClass } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import dayjs from 'dayjs';
import { smartNavigate } from '@/lib/navigation';
import TransactionEditModal from '@/components/transaction-edit-modal';
import { UnifiedTransactionList } from '../common/unified-transaction-list';
import '../common/unified-transaction-list.css';

// 导入交易类型枚举
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

  // 交易编辑模态框状态
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingTransactionData, setEditingTransactionData] = useState<any>(null);

  // 从URL参数获取预算ID
  const budgetId = searchParams.get('budgetId');

  // 筛选条件状态
  const [filters, setFilters] = useState({
    startDate: getCurrentMonthRange().startDate,
    endDate: getCurrentMonthRange().endDate,
    transactionType: 'ALL',
    categoryIds: [],
    accountBookId: null,
    isFilterPanelOpen: false,
  });

  // 筛选选项状态
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    budgets: [],
  });

  // 创建滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 获取交易数据的函数（重置数据）
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
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: resetData ? 1 : pagination.currentPage + 1,
        limit: 20,
        sort: 'date:desc',
      };

      if (filters.transactionType !== 'ALL') {
        queryParams.type = filters.transactionType;
      }

      if (filters.categoryIds.length > 0) {
        queryParams.categoryIds = filters.categoryIds.join(',');
      }

      if (filters.accountBookId) {
        queryParams.accountBookId = filters.accountBookId;
      }

      // 添加预算ID参数
      if (budgetId) {
        queryParams.budgetId = budgetId;
      }

      // 获取交易数据
      const response = await apiClient.get('/transactions', {
        params: queryParams,
      });

      if (response && response.data) {
        const newTransactions = response.data;
        const newTotal = response.total || 0;
        const currentPage = queryParams.page;
        const hasMore = newTransactions.length === queryParams.limit && (currentPage * queryParams.limit) < newTotal;

        if (resetData) {
          setTransactions(newTransactions);
          // 获取统计数据（只在重置时获取）
          const statsResponse = await apiClient.get('/statistics/overview', {
            params: {
              startDate: filters.startDate,
              endDate: filters.endDate,
              accountBookId: filters.accountBookId || undefined,
              type: filters.transactionType !== 'ALL' ? filters.transactionType : undefined,
              categoryIds: filters.categoryIds.length > 0 ? filters.categoryIds.join(',') : undefined,
              budgetId: budgetId || undefined,
            },
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
          setTransactions(prev => {
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
      console.error('获取交易数据失败:', error);
      setError('获取交易数据失败，请重试');
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

  // 获取交易数据
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTransactions(true);
  }, [isAuthenticated, filters, budgetId]);

  // 获取筛选选项数据
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // 获取分类数据
        const categoriesResponse = await apiClient.get('/categories');
        if (categoriesResponse && categoriesResponse.data) {
          setFilterOptions((prev) => ({
            ...prev,
            categories: categoriesResponse.data,
          }));
        }

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

  // 按日期分组交易 - 转换为统一组件格式
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
        transactions: transactions.map(transaction => ({
          id: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          categoryName: transaction.categoryName || transaction.category?.name,
          categoryIcon: transaction.categoryIcon || transaction.category?.icon,
          description: transaction.description || transaction.title,
          date: dayjs(transaction.date).format('HH:mm')
        }))
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

  // 处理交易项点击 - 多选模式下选择，否则打开编辑模态框
  const handleTransactionClick = (transactionId: string) => {
    if (isMultiSelectMode) {
      handleTransactionSelect(transactionId);
    } else {
      // 找到对应的交易数据
      const transactionData = transactions.find(t => t.id === transactionId);
      setEditingTransactionId(transactionId);
      setEditingTransactionData(transactionData);
    }
  };

  // 处理交易选择
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

      console.log(`成功删除 ${selectedTransactions.size} 条交易记录`);
    } catch (error) {
      console.error('批量删除失败:', error);
    } finally {
      setIsDeleting(false);
    }
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
          <button className="icon-button">
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

  // 处理分类筛选
  const handleCategoryFilter = (categoryId: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      categoryIds: checked
        ? [...prev.categoryIds, categoryId]
        : prev.categoryIds.filter((id) => id !== categoryId),
    }));
  };

  // 重置筛选条件
  const resetFilters = () => {
    setFilters({
      startDate: getCurrentMonthRange().startDate,
      endDate: getCurrentMonthRange().endDate,
      transactionType: 'ALL',
      categoryIds: [],
      accountBookId: null,
      isFilterPanelOpen: false,
    });
  };

  // 关闭交易编辑模态框
  const handleCloseEditModal = () => {
    setEditingTransactionId(null);
    setEditingTransactionData(null);
  };

  // 处理交易保存成功
  const handleTransactionSaved = () => {
    // 重新获取交易数据
    fetchTransactions();
    // 关闭模态框
    handleCloseEditModal();
  };

  return (
    <PageContainer
      title={budgetId ? '预算交易记录' : '交易记录'}
      rightActions={rightActions}
      activeNavItem="profile"
    >
      <div className="transactions-page">
        <div ref={scrollContainerRef} style={{ height: '100vh', overflowY: 'auto' }}>
        {/* 筛选区域 - 简化版 */}
        {filters.isFilterPanelOpen && (
          <div className="filter-panel">
            <div className="filter-header">
              <h3>筛选条件</h3>
              <div className="filter-actions">
                <button onClick={resetFilters} className="reset-button">
                  重置
                </button>
                <button onClick={toggleFilterPanel} className="close-button">
                  关闭
                </button>
              </div>
            </div>

            <div className="filter-content">
              {/* 时间范围筛选 */}
              <div className="filter-section">
                <h4>时间范围</h4>
                <div className="date-range">
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="date-input"
                  />
                  <span>至</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="date-input"
                  />
                </div>
              </div>

              {/* 交易类型筛选 */}
              <div className="filter-section">
                <h4>交易类型</h4>
                <div className="transaction-type-filter">
                  <label>
                    <input
                      type="radio"
                      name="transactionType"
                      value="ALL"
                      checked={filters.transactionType === 'ALL'}
                      onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                    />
                    全部
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="transactionType"
                      value="INCOME"
                      checked={filters.transactionType === 'INCOME'}
                      onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                    />
                    收入
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="transactionType"
                      value="EXPENSE"
                      checked={filters.transactionType === 'EXPENSE'}
                      onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                    />
                    支出
                  </label>
                </div>
              </div>

              {/* 分类筛选 */}
              <div className="filter-section">
                <h4>分类</h4>
                <div className="category-filter">
                  {filterOptions.categories.map((category: any) => (
                    <label key={category.id} className="category-item">
                      <input
                        type="checkbox"
                        checked={filters.categoryIds.includes(category.id)}
                        onChange={(e) => handleCategoryFilter(category.id, e.target.checked)}
                      />
                      <i className={`fas ${getCategoryIconClass(category.icon)}`}></i>
                      {category.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* 预算筛选 */}
              {budgetId && (
                <div className="filter-section">
                  <h4>当前预算</h4>
                  <div className="budget-info">
                    {filterOptions.budgets.find((budget: any) => budget.id === budgetId)?.name ||
                      '未知预算'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 交易统计摘要 */}
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

        {/* 交易列表 */}
        <UnifiedTransactionList
          groupedTransactions={groupedTransactions}
          onTransactionClick={handleTransactionClick}
          showDateHeaders={true}
          emptyMessage="暂无交易记录"
          isLoading={isLoading}
          error={error}
          isMultiSelectMode={isMultiSelectMode}
          selectedTransactions={selectedTransactions}
          onTransactionSelect={handleTransactionSelect}
          isLoadingMore={isLoadingMore}
          hasMore={pagination.hasMore}
          totalCount={pagination.total}
          className="transactions-page"
        />

        {/* 批量删除确认对话框 */}
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>确认删除</h3>
              </div>
              <div className="modal-body">
                <p>确定要删除选中的 {selectedTransactions.size} 条交易记录吗？</p>
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
                <button className="btn-danger" onClick={handleBatchDelete} disabled={isDeleting}>
                  {isDeleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 交易编辑模态框 */}
        {editingTransactionId && (
          <TransactionEditModal
            transactionId={editingTransactionId}
            transactionData={editingTransactionData}
            onClose={handleCloseEditModal}
            onSave={handleTransactionSaved}
          />
        )}
        </div>
      </div>
    </PageContainer>
  );
}
