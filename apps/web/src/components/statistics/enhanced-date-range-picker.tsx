'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekday from 'dayjs/plugin/weekday';
import { TimeRangeTypeSelector, TimeRangeType } from './time-range-type-selector';
import { CustomDateRangePicker } from './custom-date-range-picker';

// 加载dayjs插件
dayjs.extend(weekOfYear);
dayjs.extend(weekday);

// 设置周一为一周的开始
dayjs.Ls.en.weekStart = 1;

interface DateRange {
  startDate: string;
  endDate: string;
}

interface EnhancedDateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (dateRange: DateRange, rangeType: TimeRangeType) => void;
  className?: string;
}

export function EnhancedDateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
  className = '',
}: EnhancedDateRangePickerProps) {
  const [rangeType, setRangeType] = useState<TimeRangeType>('month');
  const [currentPeriod, setCurrentPeriod] = useState<{
    year: number;
    month?: number;
    week?: number;
  }>(() => {
    const date = dayjs(startDate || new Date());
    return {
      year: date.year(),
      month: date.month() + 1, // dayjs月份从0开始
      week: date.week(),
    };
  });

  // 格式化显示文本
  const getDisplayText = () => {
    switch (rangeType) {
      case 'week': {
        // 使用与calculateDateRange相同的逻辑计算周的开始和结束
        const yearStart = dayjs().year(currentPeriod.year).startOf('year');
        const weekStart = yearStart.add((currentPeriod.week || 1) - 1, 'week').startOf('week');
        const weekEnd = weekStart.endOf('week');
        const startStr = weekStart.format('M-D');
        const endStr = weekEnd.format('M-D');
        return (
          <div className="week-display">
            <span className="week-date-start">{startStr}</span>
            <span className="week-main">
              {currentPeriod.year}年第{currentPeriod.week || 1}周
            </span>
            <span className="week-date-end">{endStr}</span>
          </div>
        );
      }
      case 'month':
        return `${currentPeriod.year}年${currentPeriod.month || 1}月`;
      case 'year':
        return `${currentPeriod.year}年`;
      case 'custom':
        if (!startDate || !endDate) {
          return '自定义范围';
        }
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        if (start.year() === end.year() && start.month() === end.month()) {
          return `${start.year()}年${start.month() + 1}月`;
        }
        // 如果时间范围较短，显示完整日期
        if (end.diff(start, 'day') <= 31) {
          return `${start.format('MM/DD')} - ${end.format('MM/DD')}`;
        }
        return `${start.format('YYYY/MM')} - ${end.format('YYYY/MM')}`;
      default:
        return `${currentPeriod.year}年${currentPeriod.month || 1}月`;
    }
  };

  // 计算日期范围
  const calculateDateRange = (type: TimeRangeType, period: typeof currentPeriod): DateRange => {
    switch (type) {
      case 'week': {
        // 创建指定年份第一天，然后计算指定周
        const yearStart = dayjs().year(period.year).startOf('year');
        const weekStart = yearStart.add((period.week || 1) - 1, 'week').startOf('week');
        const weekEnd = weekStart.endOf('week');
        return {
          startDate: weekStart.format('YYYY-MM-DD'),
          endDate: weekEnd.format('YYYY-MM-DD'),
        };
      }
      case 'month': {
        const monthStart = dayjs()
          .year(period.year)
          .month((period.month || 1) - 1)
          .startOf('month');
        const monthEnd = monthStart.endOf('month');
        return {
          startDate: monthStart.format('YYYY-MM-DD'),
          endDate: monthEnd.format('YYYY-MM-DD'),
        };
      }
      case 'year': {
        const yearStart = dayjs().year(period.year).startOf('year');
        const yearEnd = yearStart.endOf('year');
        return {
          startDate: yearStart.format('YYYY-MM-DD'),
          endDate: yearEnd.format('YYYY-MM-DD'),
        };
      }
      case 'custom':
      default:
        return { startDate, endDate };
    }
  };

  // 处理时间范围类型变化
  const handleRangeTypeChange = (type: TimeRangeType) => {
    setRangeType(type);

    if (type !== 'custom') {
      // 根据新的类型重新设置当前周期
      const now = dayjs();
      let newPeriod = { year: now.year() };

      switch (type) {
        case 'week':
          newPeriod = { ...newPeriod, week: now.week() };
          break;
        case 'month':
          newPeriod = { ...newPeriod, month: now.month() + 1 };
          break;
        case 'year':
          // 年份已经设置
          break;
      }

      setCurrentPeriod(newPeriod);
      const newDateRange = calculateDateRange(type, newPeriod);
      onDateRangeChange(newDateRange, type);
    }
  };

  // 处理上一个时间段
  const handlePrevious = () => {
    if (rangeType === 'custom') return;

    const newPeriod = { ...currentPeriod };

    switch (rangeType) {
      case 'week':
        if ((newPeriod.week || 1) <= 1) {
          // 跳到上一年的最后一周
          newPeriod.year -= 1;
          // 上一年通常有52周，但可能有53周
          const prevYearStart = dayjs().year(newPeriod.year).startOf('year');
          const week53Start = prevYearStart.add(52, 'week').startOf('week');
          const hasWeek53 = week53Start.year() === newPeriod.year;
          newPeriod.week = hasWeek53 ? 53 : 52;
        } else {
          newPeriod.week = (newPeriod.week || 1) - 1;
        }
        break;
      case 'month':
        if ((newPeriod.month || 1) <= 1) {
          newPeriod.year -= 1;
          newPeriod.month = 12;
        } else {
          newPeriod.month = (newPeriod.month || 1) - 1;
        }
        break;
      case 'year':
        newPeriod.year -= 1;
        break;
    }

    setCurrentPeriod(newPeriod);
    const newDateRange = calculateDateRange(rangeType, newPeriod);
    onDateRangeChange(newDateRange, rangeType);
  };

  // 处理下一个时间段
  const handleNext = () => {
    if (rangeType === 'custom') return;

    const newPeriod = { ...currentPeriod };

    switch (rangeType) {
      case 'week':
        // 简化逻辑：一年最多53周，通常是52周
        const currentWeek = newPeriod.week || 1;
        if (currentWeek >= 52) {
          // 检查是否真的有第53周
          const yearStart = dayjs().year(newPeriod.year).startOf('year');
          const week53Start = yearStart.add(52, 'week').startOf('week');
          const isWeek53InSameYear = week53Start.year() === newPeriod.year;

          if (currentWeek >= 53 || (currentWeek >= 52 && !isWeek53InSameYear)) {
            newPeriod.year += 1;
            newPeriod.week = 1;
          } else {
            newPeriod.week = currentWeek + 1;
          }
        } else {
          newPeriod.week = currentWeek + 1;
        }
        break;
      case 'month':
        if ((newPeriod.month || 1) >= 12) {
          newPeriod.year += 1;
          newPeriod.month = 1;
        } else {
          newPeriod.month = (newPeriod.month || 1) + 1;
        }
        break;
      case 'year':
        newPeriod.year += 1;
        break;
    }

    setCurrentPeriod(newPeriod);
    const newDateRange = calculateDateRange(rangeType, newPeriod);
    onDateRangeChange(newDateRange, rangeType);
  };

  // 处理回到当前时间段
  const handleToday = () => {
    const now = dayjs();
    let newPeriod = { year: now.year() };

    switch (rangeType) {
      case 'week':
        newPeriod = { ...newPeriod, week: now.week() };
        break;
      case 'month':
        newPeriod = { ...newPeriod, month: now.month() + 1 };
        break;
      case 'year':
        // 年份已经设置
        break;
      case 'custom':
        const todayRange = {
          startDate: now.startOf('month').format('YYYY-MM-DD'),
          endDate: now.endOf('month').format('YYYY-MM-DD'),
        };
        onDateRangeChange(todayRange, rangeType);
        return;
    }

    setCurrentPeriod(newPeriod);
    const newDateRange = calculateDateRange(rangeType, newPeriod);
    onDateRangeChange(newDateRange, rangeType);
  };

  // 处理自定义日期范围变化
  const handleCustomDateRangeChange = (customRange: DateRange) => {
    onDateRangeChange(customRange, 'custom');
  };

  return (
    <div className={`enhanced-date-range-picker ${className}`}>
      {/* 水平布局的时间范围控制器 */}
      <div className="time-range-controls-horizontal">
        {/* 时间范围类型选择器 */}
        <TimeRangeTypeSelector
          value={rangeType}
          onChange={handleRangeTypeChange}
          className="time-range-type-compact"
        />

        {/* 日期导航器 */}
        <div className="date-navigator-horizontal">
          {rangeType !== 'custom' ? (
            <>
              <button
                className="date-arrow"
                onClick={handlePrevious}
                aria-label="上一个时间段"
                disabled={rangeType === 'custom'}
              >
                <i className="fas fa-chevron-left"></i>
              </button>

              <button className="date-display" onClick={handleToday} title="回到当前时间段">
                {getDisplayText()}
              </button>

              <button
                className="date-arrow"
                onClick={handleNext}
                aria-label="下一个时间段"
                disabled={rangeType === 'custom'}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </>
          ) : (
            <div className="custom-date-display">{getDisplayText()}</div>
          )}
        </div>
      </div>

      {/* 自定义日期范围选择器 */}
      {rangeType === 'custom' && (
        <CustomDateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={handleCustomDateRangeChange}
        />
      )}
    </div>
  );
}
