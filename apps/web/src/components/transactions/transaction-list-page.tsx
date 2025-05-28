"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { PageContainer } from "@/components/layout/page-container";
import { formatCurrency, getCategoryIconClass } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import dayjs from "dayjs";

// 交易类型枚举
export enum TransactionType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
}

// 日期范围类型
export type DateRangeType = "current-month" | "last-month" | "custom";

// 获取当前月份的开始和结束日期
const getCurrentMonthRange = () => {
  const now = dayjs();
  return {
    startDate: now.startOf("month").format("YYYY-MM-DD"),
    endDate: now.endOf("month").format("YYYY-MM-DD"),
  };
};

export function TransactionListPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    income: 0,
    expense: 0,
    balance: 0
  });

  // 筛选条件状态
  const [filters, setFilters] = useState({
    startDate: getCurrentMonthRange().startDate,
    endDate: getCurrentMonthRange().endDate,
    transactionType: "ALL",
    categoryIds: [],
    accountBookId: null,
    isFilterPanelOpen: false
  });

  // 创建滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  // 获取交易数据
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 构建查询参数
        const queryParams: Record<string, any> = {
          startDate: filters.startDate,
          endDate: filters.endDate,
          limit: 20,
          sort: "date:desc"
        };

        if (filters.transactionType !== "ALL") {
          queryParams.type = filters.transactionType;
        }

        if (filters.categoryIds.length > 0) {
          queryParams.categoryIds = filters.categoryIds.join(",");
        }

        if (filters.accountBookId) {
          queryParams.accountBookId = filters.accountBookId;
        }

        // 获取交易数据
        const response = await apiClient.get("/transactions", {
          params: queryParams
        });

        // 获取统计数据
        const statsResponse = await apiClient.get("/statistics/overview", {
          params: {
            startDate: filters.startDate,
            endDate: filters.endDate,
            accountBookId: filters.accountBookId || undefined,
            type: filters.transactionType !== "ALL" ? filters.transactionType : undefined,
            categoryIds: filters.categoryIds.length > 0 ? filters.categoryIds.join(",") : undefined
          }
        });

        if (response && response.data) {
          setTransactions(response.data);

          // 按日期分组交易
          const grouped = groupTransactionsByDate(response.data);
          setGroupedTransactions(grouped);
        }

        if (statsResponse) {
          setStatistics({
            income: statsResponse.income || 0,
            expense: statsResponse.expense || 0,
            balance: (statsResponse.income || 0) - (statsResponse.expense || 0)
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error("获取交易数据失败:", error);
        setError("获取交易数据失败，请重试");
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [isAuthenticated, filters]);

  // 按日期分组交易
  const groupTransactionsByDate = (transactions: any[]) => {
    if (!Array.isArray(transactions)) return [];

    const groups: Record<string, any[]> = {};

    transactions.forEach(transaction => {
      const date = dayjs(transaction.date).format("YYYY-MM-DD");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });

    return Object.entries(groups)
      .map(([date, transactions]) => ({
        date: dayjs(date).format("MM月DD日"),
        transactions
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // 切换筛选面板
  const toggleFilterPanel = () => {
    setFilters(prev => ({
      ...prev,
      isFilterPanelOpen: !prev.isFilterPanelOpen
    }));
  };

  // 处理交易项点击 - 直接进入编辑页面
  const handleTransactionClick = (transactionId: string) => {
    router.push(`/transactions/edit/${transactionId}`);
  };

  // 右侧操作按钮
  const rightActions = (
    <>
      <button className="icon-button">
        <i className="fas fa-search"></i>
      </button>
      <button className="icon-button" onClick={toggleFilterPanel}>
        <i className="fas fa-filter"></i>
      </button>
    </>
  );

  return (
    <PageContainer title="交易记录" rightActions={rightActions} activeNavItem="profile">
      <div ref={scrollContainerRef}>
        {/* 筛选区域 - 简化版 */}
        {filters.isFilterPanelOpen && (
          <div className="filter-panel">
            <div className="filter-header">
              <h3>筛选条件</h3>
              <button onClick={toggleFilterPanel}>关闭</button>
            </div>
            {/* 这里可以添加筛选控件 */}
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
        {isLoading ? (
          <div className="loading-state">加载中...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : groupedTransactions.length > 0 ? (
          <div className="transaction-groups">
            {groupedTransactions.map((group) => (
              <div key={group.date} className="transaction-group">
                <div className="transaction-date">{group.date}</div>
                <div className="transaction-list">
                  {group.transactions.map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className="transaction-item"
                      onClick={() => handleTransactionClick(transaction.id)}
                    >
                      <div className="transaction-icon">
                        <i className={`fas ${getCategoryIconClass(transaction.category?.icon)}`}></i>
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-title">{transaction.description || transaction.category?.name || '未分类'}</div>
                        <div className="transaction-category">{transaction.category?.name || '未分类'}</div>
                      </div>
                      <div className={`transaction-amount ${transaction.type === TransactionType.EXPENSE ? 'expense' : 'income'}`}>
                        {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-receipt"></i>
            </div>
            <div className="empty-text">暂无交易记录</div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
