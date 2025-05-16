"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useInfiniteTransactions, useGroupedTransactions, useTransactionStatistics, TransactionStatistics } from "@/hooks/use-transactions";
import { useTransactionListStore } from "@/store/transaction-list-store";
import { TransactionFilters } from "./transaction-filters";
import { TransactionSummary } from "./transaction-summary";
import { GroupedTransactionList } from "./grouped-transaction-list";
import { TransactionEmptyState } from "./transaction-empty-state";
import { formatCurrency } from "@/lib/utils";
import { TransactionType } from "@/types";

export function TransactionListPage() {
  // 获取状态
  const {
    startDate,
    endDate,
    transactionType,
    categoryIds,
    accountBookId,
    isFilterPanelOpen,
    toggleFilterPanel,
    setIsRefreshing,
    setIsLoadingMore,
  } = useTransactionListStore();

  // 获取交易数据
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    isError,
  } = useInfiniteTransactions({
    startDate,
    endDate,
    type: transactionType !== "ALL" ? (transactionType as TransactionType) : undefined,
    categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    accountBookId: accountBookId || undefined,
    limit: 20,
  });

  // 获取统计数据
  const { data: statisticsData } = useTransactionStatistics({
    startDate,
    endDate,
    accountBookId: accountBookId || undefined,
  }) as { data: TransactionStatistics };

  // 将交易数据按日期分组
  const groupedTransactions = useGroupedTransactions(infiniteData);

  // 创建滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 处理滚动加载更多
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;

    // 当滚动到底部附近时加载更多
    if (scrollBottom < 200 && hasNextPage && !isFetchingNextPage) {
      setIsLoadingMore(true);
      fetchNextPage().finally(() => setIsLoadingMore(false));
    }
  };

  // 处理下拉刷新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // 添加滚动事件监听
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, [hasNextPage, isFetchingNextPage]);

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <div className="header">
        <div className="header-title">交易记录</div>
        <div className="header-actions">
          <button className="icon-button">
            <i className="fas fa-search"></i>
          </button>
          <button className="icon-button" onClick={toggleFilterPanel}>
            <i className="fas fa-filter"></i>
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="main-content" ref={scrollContainerRef}>
        {/* 筛选区域 */}
        <TransactionFilters isOpen={isFilterPanelOpen} />

        {/* 交易统计摘要 */}
        {statisticsData && (
          <TransactionSummary
            income={statisticsData.totalIncome || 0}
            expense={statisticsData.totalExpense || 0}
            balance={(statisticsData.totalIncome || 0) - (statisticsData.totalExpense || 0)}
          />
        )}

        {/* 交易列表 */}
        {isLoading ? (
          <div className="loading-state">加载中...</div>
        ) : isError ? (
          <div className="error-state">加载失败，请重试</div>
        ) : groupedTransactions.length > 0 ? (
          <GroupedTransactionList groups={groupedTransactions} />
        ) : (
          <TransactionEmptyState />
        )}

        {/* 加载更多指示器 */}
        {isFetchingNextPage && (
          <div className="loading-more">加载更多...</div>
        )}

      </div>

      {/* 底部导航栏 */}
      <div className="bottom-nav">
        <Link href="/dashboard" className="nav-item">
          <i className="fas fa-home"></i>
          <span>首页</span>
        </Link>
        <Link href="/statistics" className="nav-item">
          <i className="fas fa-chart-pie"></i>
          <span>统计</span>
        </Link>
        <Link href="/add-transaction" className="nav-item add-button">
          <div className="add-icon">
            <i className="fas fa-plus"></i>
          </div>
          <span>添加</span>
        </Link>
        <Link href="/budget" className="nav-item">
          <i className="fas fa-wallet"></i>
          <span>预算</span>
        </Link>
        <Link href="/settings" className="nav-item">
          <i className="fas fa-user"></i>
          <span>我的</span>
        </Link>
      </div>
    </div>
  );
}
