"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTransactionListStore, DateRangeType } from "@/store/transaction-list-store";
import { apiClient } from "@/lib/api";
import { Category, TransactionType } from "@/types";
import { cn, getCategoryIconClass } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import dayjs from "dayjs";

interface TransactionFiltersProps {
  isOpen: boolean;
}

export function TransactionFilters({ isOpen }: TransactionFiltersProps) {
  // 获取状态
  const {
    dateRangeType,
    startDate,
    endDate,
    transactionType,
    categoryIds,
    setDateRangeType,
    setDateRange,
    setTransactionType,
    toggleCategoryId,
    resetFilters,
  } = useTransactionListStore();

  // 本地状态用于日期选择器
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(
    startDate ? new Date(startDate) : undefined
  );
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(
    endDate ? new Date(endDate) : undefined
  );

  // 获取分类列表
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get<Category[]>("/categories");
      return response;
    },
  });

  // 处理日期范围类型变更
  const handleDateRangeTypeChange = (type: DateRangeType) => {
    setDateRangeType(type);

    // 更新本地日期状态
    if (type === "current-month") {
      const now = dayjs();
      setLocalStartDate(now.startOf("month").toDate());
      setLocalEndDate(now.endOf("month").toDate());
    } else if (type === "last-month") {
      const lastMonth = dayjs().subtract(1, "month");
      setLocalStartDate(lastMonth.startOf("month").toDate());
      setLocalEndDate(lastMonth.endOf("month").toDate());
    }
  };

  // 处理自定义日期变更
  const handleCustomDateChange = () => {
    if (localStartDate && localEndDate) {
      setDateRange(
        dayjs(localStartDate).format("YYYY-MM-DD"),
        dayjs(localEndDate).format("YYYY-MM-DD")
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="filter-bar">
      {/* 日期范围选择 */}
      <div className="filter-row">
        <button
          className={cn("filter-button", dateRangeType === "current-month" && "active")}
          onClick={() => handleDateRangeTypeChange("current-month")}
        >
          <i className="fas fa-calendar"></i>
          <span>本月</span>
        </button>
        <button
          className={cn("filter-button", dateRangeType === "last-month" && "active")}
          onClick={() => handleDateRangeTypeChange("last-month")}
        >
          <i className="fas fa-calendar-alt"></i>
          <span>上月</span>
        </button>
        <button
          className={cn("filter-button", dateRangeType === "custom" && "active")}
          onClick={() => setDateRangeType("custom")}
        >
          <i className="fas fa-calendar-plus"></i>
          <span>自定义</span>
        </button>
      </div>

      {/* 自定义日期选择器 */}
      {dateRangeType === "custom" && (
        <div className="custom-date-range">
          <div className="date-pickers">
            <DatePicker
              selected={localStartDate}
              onChange={(date) => setLocalStartDate(date || undefined)}
              placeholderText="开始日期"
              maxDate={localEndDate || undefined}
            />
            <span className="date-separator">至</span>
            <DatePicker
              selected={localEndDate}
              onChange={(date) => setLocalEndDate(date || undefined)}
              placeholderText="结束日期"
              minDate={localStartDate || undefined}
            />
          </div>
          <button
            className="apply-date-btn"
            onClick={handleCustomDateChange}
            disabled={!localStartDate || !localEndDate}
          >
            应用
          </button>
        </div>
      )}

      {/* 交易类型选择 */}
      <div className="filter-row">
        <button
          className={cn("filter-button", transactionType === "ALL" && "active")}
          onClick={() => setTransactionType("ALL")}
        >
          全部
        </button>
        <button
          className={cn("filter-button", transactionType === TransactionType.EXPENSE && "active")}
          onClick={() => setTransactionType(TransactionType.EXPENSE)}
        >
          支出
        </button>
        <button
          className={cn("filter-button", transactionType === TransactionType.INCOME && "active")}
          onClick={() => setTransactionType(TransactionType.INCOME)}
        >
          收入
        </button>
      </div>

      {/* 分类选择 */}
      {categories && categories.length > 0 && (
        <div className="category-filters">
          <div className="filter-title">分类筛选</div>
          <div className="category-grid">
            {categories.map((category) => (
              <button
                key={category.id}
                className={cn(
                  "category-filter-item",
                  categoryIds.includes(category.id) && "active"
                )}
                onClick={() => toggleCategoryId(category.id)}
              >
                <div className="category-icon">
                  <i className={`fas ${getCategoryIconClass(category.icon)}`}></i>
                </div>
                <div className="category-name">{category.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 重置按钮 */}
      <div className="filter-actions">
        <button className="reset-filters-btn" onClick={resetFilters}>
          重置筛选
        </button>
      </div>
    </div>
  );
}
