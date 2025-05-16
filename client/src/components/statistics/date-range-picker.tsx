"use client";

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
  // 处理上个月按钮点击
  const handlePrevMonth = () => {
    onPrevMonth();
  };

  // 处理下个月按钮点击
  const handleNextMonth = () => {
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
