'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface CustomDateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (dateRange: DateRange) => void;
  className?: string;
}

// 快捷选择选项
const QUICK_RANGES = [
  {
    label: '最近7天',
    getValue: () => ({
      startDate: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
    }),
  },
  {
    label: '最近30天',
    getValue: () => ({
      startDate: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
    }),
  },
  {
    label: '最近3个月',
    getValue: () => ({
      startDate: dayjs().subtract(3, 'month').startOf('month').format('YYYY-MM-DD'),
      endDate: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
    }),
  },
  {
    label: '本月',
    getValue: () => ({
      startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
      endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    }),
  },
  {
    label: '上月',
    getValue: () => ({
      startDate: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
      endDate: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
    }),
  },
];

export function CustomDateRangePicker({
  startDate,
  endDate,
  onChange,
  className = '',
}: CustomDateRangePickerProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [error, setError] = useState<string | null>(null);

  // 同步外部传入的日期
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  // 验证日期范围
  const validateDateRange = (start: string, end: string): string | null => {
    if (!start || !end) {
      return '请选择开始和结束日期';
    }

    const startDay = dayjs(start);
    const endDay = dayjs(end);

    if (!startDay.isValid() || !endDay.isValid()) {
      return '日期格式无效';
    }

    if (startDay.isAfter(endDay)) {
      return '开始日期不能晚于结束日期';
    }

    // 限制最大时间范围为2年
    if (endDay.diff(startDay, 'year') > 2) {
      return '时间范围不能超过2年';
    }

    return null;
  };

  // 处理日期变化
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const newStartDate = type === 'start' ? value : localStartDate;
    const newEndDate = type === 'end' ? value : localEndDate;

    if (type === 'start') {
      setLocalStartDate(value);
    } else {
      setLocalEndDate(value);
    }

    const validationError = validateDateRange(newStartDate, newEndDate);
    setError(validationError);

    // 如果验证通过，触发onChange
    if (!validationError) {
      onChange({
        startDate: newStartDate,
        endDate: newEndDate,
      });
    }
  };

  // 处理快捷选择
  const handleQuickSelect = (range: DateRange) => {
    setLocalStartDate(range.startDate);
    setLocalEndDate(range.endDate);
    setError(null);
    onChange(range);
  };

  // 格式化显示日期
  const formatDisplayDate = (date: string) => {
    return dayjs(date).format('YYYY年MM月DD日');
  };

  return (
    <div className={`custom-date-range-picker ${className}`}>
      {/* 快捷选择按钮 */}
      <div className="quick-ranges">
        <div className="quick-ranges-label">快捷选择：</div>
        <div className="quick-ranges-buttons">
          {QUICK_RANGES.map((range, index) => (
            <button
              key={index}
              className="quick-range-button"
              onClick={() => handleQuickSelect(range.getValue())}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 日期输入区域 */}
      <div className="date-inputs">
        <div className="date-input-group">
          <label className="date-input-label">开始日期</label>
          <input
            type="date"
            className="date-input"
            value={localStartDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            max={localEndDate || undefined}
          />
          <div className="date-display-text">
            {localStartDate && formatDisplayDate(localStartDate)}
          </div>
        </div>

        <div className="date-range-separator">
          <i className="fas fa-arrow-right"></i>
        </div>

        <div className="date-input-group">
          <label className="date-input-label">结束日期</label>
          <input
            type="date"
            className="date-input"
            value={localEndDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            min={localStartDate || undefined}
          />
          <div className="date-display-text">
            {localEndDate && formatDisplayDate(localEndDate)}
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="date-range-error">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* 日期范围信息 */}
      {!error && localStartDate && localEndDate && (
        <div className="date-range-info">
          <i className="fas fa-info-circle"></i>
          <span>
            已选择 {dayjs(localEndDate).diff(dayjs(localStartDate), 'day') + 1} 天的数据
          </span>
        </div>
      )}
    </div>
  );
}
