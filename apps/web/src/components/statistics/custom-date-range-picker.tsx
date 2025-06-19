'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useAccountBookStore } from '@/store/account-book-store';
import './custom-date-range-picker.css';

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

export function CustomDateRangePicker({
  startDate,
  endDate,
  onChange,
  className = '',
}: CustomDateRangePickerProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [error, setError] = useState<string | null>(null);
  const [accountBookCreatedAt, setAccountBookCreatedAt] = useState<string>('2020-01-01');

  // 获取当前账本信息
  const { currentAccountBook } = useAccountBookStore();

  // 同步外部传入的日期
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  // 获取当前账本创建时间
  useEffect(() => {
    if (currentAccountBook?.createdAt) {
      setAccountBookCreatedAt(dayjs(currentAccountBook.createdAt).format('YYYY-MM-DD'));
    } else if (currentAccountBook?.id) {
      // 如果当前账本信息中没有createdAt，通过API获取详细信息
      const fetchAccountBookDetail = async () => {
        try {
          const response = await fetch(`/api/account-books/${currentAccountBook.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (response.ok) {
            const accountBookData = await response.json();
            if (accountBookData.createdAt) {
              setAccountBookCreatedAt(dayjs(accountBookData.createdAt).format('YYYY-MM-DD'));
            }
          }
        } catch (error) {
          console.error('获取账本详情失败:', error);
          // 保持默认值
        }
      };

      fetchAccountBookDetail();
    }
  }, [currentAccountBook]);

  // 快捷选择选项 - 使用userCreatedAt
  const getQuickRanges = () => [
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
        startDate: dayjs().subtract(3, 'month').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD'),
      }),
    },
    {
      label: '最近半年',
      getValue: () => ({
        startDate: dayjs().subtract(6, 'month').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD'),
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
    {
      label: '今年',
      getValue: () => ({
        startDate: dayjs().startOf('year').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD'),
      }),
    },
    {
      label: '全部记录',
      getValue: () => ({
        startDate: accountBookCreatedAt, // 使用账本创建时间
        endDate: dayjs().format('YYYY-MM-DD'),
      }),
    },
  ];

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
    <div className={`custom-date-range-picker mobile-optimized ${className}`}>
      {/* 快捷选择按钮 - 移动端优化 */}
      <div className="quick-ranges-mobile">
        <div className="quick-ranges-label-mobile">
          <i className="fas fa-clock"></i>
          <span>快捷选择</span>
        </div>
        <div className="quick-ranges-grid">
          {getQuickRanges().map((range, index) => (
            <button
              key={index}
              className="quick-range-button-mobile"
              onClick={() => handleQuickSelect(range.getValue())}
            >
              <span className="quick-range-text">{range.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 日期输入区域 - 精简版 */}
      <div className="date-inputs-compact">
        <div className="date-section-header-compact">
          <i className="fas fa-calendar-alt"></i>
          <span>自定义日期</span>
        </div>

        <div className="date-input-row">
          <div className="date-input-group-compact">
            <label className="date-input-label-compact">开始</label>
            <input
              type="date"
              className="date-input-compact"
              value={localStartDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              max={localEndDate || undefined}
            />
          </div>

          <div className="date-range-separator-compact">
            <i className="fas fa-arrow-right"></i>
          </div>

          <div className="date-input-group-compact">
            <label className="date-input-label-compact">结束</label>
            <input
              type="date"
              className="date-input-compact"
              value={localEndDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              min={localStartDate || undefined}
            />
          </div>
        </div>

        {/* 选择的日期范围显示 */}
        {localStartDate && localEndDate && (
          <div className="selected-range-display">
            {formatDisplayDate(localStartDate)} 至 {formatDisplayDate(localEndDate)}
          </div>
        )}
      </div>

      {/* 错误提示 - 精简版 */}
      {error && (
        <div className="date-range-error-compact">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* 日期范围信息 - 精简版 */}
      {!error && localStartDate && localEndDate && (
        <div className="date-range-info-compact">
          <i className="fas fa-info-circle"></i>
          <span>
            共 {dayjs(localEndDate).diff(dayjs(localStartDate), 'day') + 1} 天
          </span>
        </div>
      )}
    </div>
  );
}
