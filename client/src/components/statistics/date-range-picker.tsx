"use client";

import { useStatisticsStore } from "@/store/statistics-store";
import { getCurrentMonthRange, getPreviousMonthRange, getNextMonthRange } from "@/lib/api-services";

interface DateRangePickerProps {
  currentDate: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function DateRangePicker({ 
  currentDate,
  onPrevMonth,
  onNextMonth 
}: DateRangePickerProps) {
  const { setDateRange } = useStatisticsStore();

  // 处理上个月按钮点击
  const handlePrevMonth = () => {
    const { startDate, endDate } = getPreviousMonthRange(new Date(useStatisticsStore.getState().dateRange.startDate));
    setDateRange({ startDate, endDate });
    onPrevMonth();
  };

  // 处理下个月按钮点击
  const handleNextMonth = () => {
    const { startDate, endDate } = getNextMonthRange(new Date(useStatisticsStore.getState().dateRange.startDate));
    setDateRange({ startDate, endDate });
    onNextMonth();
  };

  return (
    <div className="date-selector">
      <button className="date-arrow" onClick={handlePrevMonth}>
        <i className="fas fa-chevron-left"></i>
      </button>
      <div className="date-display">{currentDate}</div>
      <button className="date-arrow" onClick={handleNextMonth}>
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}
