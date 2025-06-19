'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type TimeRangeType = 'week' | 'month' | 'year' | 'custom';

interface TimeRangeTypeSelectorProps {
  value: TimeRangeType;
  onChange: (type: TimeRangeType) => void;
  className?: string;
}

const TIME_RANGE_OPTIONS = [
  { value: 'week' as const, label: '周', shortLabel: '周' },
  { value: 'month' as const, label: '月', shortLabel: '月' },
  { value: 'year' as const, label: '年', shortLabel: '年' },
  { value: 'custom' as const, label: '自定义', shortLabel: '自' },
];

export function TimeRangeTypeSelector({
  value,
  onChange,
  className = '',
}: TimeRangeTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 组件挂载状态
  useEffect(() => {
    setMounted(true);
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentOption = TIME_RANGE_OPTIONS.find(option => option.value === value);

  // 计算下拉菜单位置
  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  };

  const handleSelect = (type: TimeRangeType) => {
    onChange(type);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen) {
      calculateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={`time-range-type-selector ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        className={`time-range-type-button ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={`当前选择: ${currentOption?.label || '月'}`}
      >
        <span className="time-range-type-text">
          {currentOption?.shortLabel || '月'}
        </span>
        <i className={`fas fa-chevron-down time-range-type-arrow ${isOpen ? 'open' : ''}`}></i>
      </button>

      {/* 使用Portal渲染下拉菜单到body，避免层叠上下文限制 */}
      {isOpen && mounted && createPortal(
        <div
          ref={dropdownRef}
          className="time-range-type-dropdown"
          style={dropdownStyle}
        >
          <ul className="time-range-type-options" role="listbox">
            {TIME_RANGE_OPTIONS.map((option) => (
              <li
                key={option.value}
                className={`time-range-type-option ${value === option.value ? 'active' : ''}`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
