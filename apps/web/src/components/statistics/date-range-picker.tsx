'use client';

import { useState } from 'react';
import { formatDateRange } from '@/lib/utils';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onPrevious,
  onNext,
  onToday,
}: DateRangePickerProps) {
  const [showOptions, setShowOptions] = useState(false);

  // 格式化日期范围显示
  const dateRangeText = formatDateRange(startDate, endDate);

  return (
    <div className="date-selector">
      <button className="date-arrow" onClick={onPrevious} aria-label="上一个时间段">
        <i className="fas fa-chevron-left"></i>
      </button>

      <button className="date-display" onClick={() => setShowOptions(!showOptions)}>
        {dateRangeText}
        <i className="fas fa-caret-down ml-2"></i>
      </button>

      <button className="date-arrow" onClick={onNext} aria-label="下一个时间段">
        <i className="fas fa-chevron-right"></i>
      </button>

      {showOptions && (
        <div className="date-options">
          <button
            onClick={() => {
              onToday();
              setShowOptions(false);
            }}
          >
            本月
          </button>
          {/* 可以添加更多选项，如上个月、本季度等 */}
        </div>
      )}
    </div>
  );
}
