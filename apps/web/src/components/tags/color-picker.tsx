'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_TAG_COLORS } from '@/lib/api/types/tag.types';
import { Check, Palette } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * 颜色选择器组件
 * 支持预设颜色和自定义颜色选择
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  presetColors = DEFAULT_TAG_COLORS,
  allowCustom = true,
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 处理预设颜色选择
  const handlePresetColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  // 处理自定义颜色变化
  const handleCustomColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = event.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  // 打开自定义颜色选择器
  const handleCustomColorClick = () => {
    if (colorInputRef.current) {
      colorInputRef.current.click();
    }
  };

  // 检查颜色是否在预设列表中
  const isPresetColor = presetColors.includes(value);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* 颜色选择触发按钮 */}
      <button
        type="button"
        className={cn(
          'flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-blue-500 border-blue-500'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div
          className="w-5 h-5 rounded border border-gray-300 flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm text-gray-700">{value}</span>
        <svg
          className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 颜色选择下拉框 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* 预设颜色 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">预设颜色</h4>
              <div className="grid grid-cols-8 gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded border-2 transition-all hover:scale-110',
                      value === color ? 'border-gray-900' : 'border-gray-300'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePresetColorSelect(color)}
                    title={color}
                  >
                    {value === color && (
                      <Check className="w-4 h-4 text-white mx-auto" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义颜色 */}
            {allowCustom && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">自定义颜色</h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 border-2 border-dashed border-gray-300 rounded hover:border-gray-400 transition-colors"
                    onClick={handleCustomColorClick}
                    title="选择自定义颜色"
                  >
                    <Palette className="w-4 h-4 text-gray-400" />
                  </button>
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                          setCustomColor(newColor);
                          onChange(newColor);
                        }
                      }}
                      placeholder="#000000"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  输入十六进制颜色值，如 #FF0000
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 简化版颜色选择器（仅预设颜色）
 */
interface SimpleColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const SimpleColorPicker: React.FC<SimpleColorPickerProps> = ({
  value,
  onChange,
  colors = DEFAULT_TAG_COLORS,
  className,
  size = 'medium',
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-6 h-6';
      case 'large':
        return 'w-10 h-10';
      default:
        return 'w-8 h-8';
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            'rounded border-2 transition-all hover:scale-110',
            getSizeClasses(),
            value === color ? 'border-gray-900' : 'border-gray-300'
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          title={color}
        >
          {value === color && (
            <Check 
              className={cn(
                'text-white mx-auto',
                size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4'
              )} 
              strokeWidth={3} 
            />
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * 颜色预览组件
 */
interface ColorPreviewProps {
  color: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showLabel?: boolean;
}

export const ColorPreview: React.FC<ColorPreviewProps> = ({
  color,
  size = 'medium',
  className,
  showLabel = false,
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4';
      case 'large':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div
        className={cn('rounded border border-gray-300 flex-shrink-0', getSizeClasses())}
        style={{ backgroundColor: color }}
      />
      {showLabel && (
        <span className="text-sm text-gray-600">{color}</span>
      )}
    </div>
  );
};

export default ColorPicker;
