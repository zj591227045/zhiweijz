"use client";

import { useEffect, useRef } from "react";
import {
  useInfiniteTransactionsWithStatistics,
  useGroupedTransactionsWithStatistics,
  useTransactionStatistics,
  TransactionStatistics
} from "@/hooks/use-transactions";
import { useTransactionListStore } from "@/store/transaction-list-store";
import { TransactionFilters } from "./transaction-filters";
import { TransactionSummary } from "./transaction-summary";
import { GroupedTransactionList } from "./grouped-transaction-list";
import { TransactionEmptyState } from "./transaction-empty-state";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
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

  // 获取交易数据和统计信息（使用无限滚动）
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    isError,
  } = useInfiniteTransactionsWithStatistics({
    startDate,
    endDate,
    type: transactionType !== "ALL" ? (transactionType as TransactionType) : undefined,
    categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    accountBookId: accountBookId || undefined,
    limit: 20,
  });

  // 将交易数据按日期分组
  const groupedTransactions = useGroupedTransactionsWithStatistics(infiniteData);

  // 创建滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 检查URL参数，如果有refresh=true，则刷新数据
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('refresh') === 'true') {
      // 刷新数据
      setIsRefreshing(true);
      refetch().finally(() => {
        setIsRefreshing(false);
        // 移除refresh参数，避免刷新页面时重复刷新数据
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      });
    }
  }, [refetch, setIsRefreshing]);

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

  // 注意：下拉刷新功能已通过URL参数实现

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
        {infiniteData && infiniteData.pages && infiniteData.pages.length > 0 && infiniteData.pages[0].statistics && (
          <TransactionSummary
            income={infiniteData.pages[0].statistics.totalIncome || 0}
            expense={infiniteData.pages[0].statistics.totalExpense || 0}
            balance={(infiniteData.pages[0].statistics.totalIncome || 0) - (infiniteData.pages[0].statistics.totalExpense || 0)}
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
      <BottomNavigation />
    </div>
  );
}
