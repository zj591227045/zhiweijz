'use client';

import { memo } from 'react';
import dayjs from 'dayjs';
import { DateCell } from './date-cell';
import { DailyStats } from '@/store/calendar-store';
import './calendar.css';

interface CalendarProps {
  currentMonth: string; // YYYY-MM
  dailyStats: DailyStats[];
  selectedDate: string | null;
  displayMode: 'expense' | 'income';
  onDateSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
  onDisplayModeToggle: () => void;
}

export const Calendar = memo(function Calendar({
  currentMonth,
  dailyStats,
  selectedDate,
  displayMode,
  onDateSelect,
  onMonthChange,
  onDisplayModeToggle,
}: CalendarProps) {
  const monthObj = dayjs(currentMonth);
  const today = dayjs();

  // 创建每日统计数据的映射
  const statsMap = new Map<string, DailyStats>();
  dailyStats.forEach((stat) => {
    statsMap.set(stat.date, stat);
  });

  // 生成日历网格数据
  const generateCalendarGrid = () => {
    const firstDay = monthObj.startOf('month');
    const lastDay = monthObj.endOf('month');

    // 计算日历网格的起始和结束日期
    const startDate = firstDay.startOf('week');
    const endDate = lastDay.endOf('week');

    const grid = [];
    let current = startDate;

    while (current.isBefore(endDate) || current.isSame(endDate)) {
      const dateStr = current.format('YYYY-MM-DD');
      const isCurrentMonth = current.isSame(monthObj, 'month');
      const isToday = current.isSame(today, 'date');
      const isSelected = selectedDate === dateStr;
      const dailyStats = statsMap.get(dateStr);

      grid.push({
        date: current.date(),
        fullDate: dateStr,
        isCurrentMonth,
        isToday,
        isSelected,
        dailyStats,
      });

      current = current.add(1, 'day');
    }

    return grid;
  };

  const calendarGrid = generateCalendarGrid();

  // 处理月份切换
  const handlePrevMonth = () => {
    const prevMonth = monthObj.subtract(1, 'month').format('YYYY-MM');
    onMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = monthObj.add(1, 'month').format('YYYY-MM');
    onMonthChange(nextMonth);
  };

  return (
    <div className="calendar-container">
      {/* 月份导航 */}
      <div className="calendar-header">
        <button className="month-nav-btn" onClick={handlePrevMonth} aria-label="上一月">
          ‹
        </button>
        <div className="month-title-container">
          <h2 className="month-title">{monthObj.format('YYYY年MM月')}</h2>
          <button
            className={`display-mode-btn ${displayMode}`}
            onClick={onDisplayModeToggle}
            title={displayMode === 'expense' ? '切换到收入' : '切换到支出'}
          >
            {displayMode === 'expense' ? '💸' : '💰'}
          </button>
        </div>
        <button className="month-nav-btn" onClick={handleNextMonth} aria-label="下一月">
          ›
        </button>
      </div>

      {/* 星期标题 */}
      <div className="weekday-header">
        {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
          <div key={day} className="weekday-cell">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="calendar-grid">
        {calendarGrid.map((cell, index) => (
          <DateCell
            key={cell.fullDate}
            date={cell.date}
            fullDate={cell.fullDate}
            isCurrentMonth={cell.isCurrentMonth}
            isToday={cell.isToday}
            isSelected={cell.isSelected}
            dailyStats={cell.dailyStats}
            displayMode={displayMode}
            onClick={onDateSelect}
          />
        ))}
      </div>
    </div>
  );
});
