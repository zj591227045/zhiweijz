'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // 检查点击是否在按钮或下拉框外部
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
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

  // 监听窗口大小变化，更新下拉框位置
  useEffect(() => {
    const handleResize = () => {
      if (isOpen && buttonRef.current) {
        setButtonRect(buttonRef.current.getBoundingClientRect());
      }
    };

    if (isOpen) {
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
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

  // 处理下拉框开关
  const handleToggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!disabled) {
      if (!isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonRect(rect);
      }
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* 颜色选择触发按钮 */}
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          'flex items-center space-x-2 px-3 py-2 border rounded-md transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2',
        )}
        style={{
          backgroundColor: 'var(--card-background, white)',
          borderColor: isOpen ? 'var(--primary-color, #3b82f6)' : 'var(--border-color, #e5e7eb)',
          boxShadow: isOpen ? '0 0 0 2px var(--primary-color-light, rgba(59, 130, 246, 0.2))' : 'none',
        }}
        onClick={handleToggleOpen}
        disabled={disabled}
      >
        <div
          className="w-5 h-5 rounded border flex-shrink-0"
          style={{
            backgroundColor: value,
            borderColor: 'var(--border-color, #e5e7eb)'
          }}
        />
        <span className="text-sm" style={{ color: 'var(--text-primary, #1f2937)' }}>{value}</span>
        <svg
          className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
          style={{ color: 'var(--text-secondary, #9ca3af)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 颜色选择下拉框 - 使用Portal确保在最上层 */}
      {isOpen && buttonRect && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed w-64 border rounded-lg shadow-lg"
          style={{
            backgroundColor: 'var(--card-background, white)',
            borderColor: 'var(--border-color, #e5e7eb)',
            zIndex: 99999,
            top: buttonRect.bottom + window.scrollY + 4,
            left: Math.max(16, Math.min(buttonRect.left + window.scrollX, window.innerWidth - 256 - 16)),
            maxWidth: 'calc(100vw - 32px)',
          }}
          ref={dropdownRef}
        >
          <div className="p-4">
            {/* 预设颜色 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary, #1f2937)' }}>
                预设颜色
              </h4>
              <div className="grid grid-cols-8 gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded border-2 transition-all hover:scale-110',
                      value === color ? 'selected' : '',
                    )}
                    style={{
                      backgroundColor: color,
                      borderColor: value === color
                        ? 'var(--primary-color, #3b82f6)'
                        : 'var(--border-color, #e5e7eb)'
                    }}
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
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary, #1f2937)' }}>
                  自定义颜色
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 border-2 border-dashed rounded transition-colors"
                    style={{
                      borderColor: 'var(--border-color, #e5e7eb)',
                    }}
                    onClick={handleCustomColorClick}
                    title="选择自定义颜色"
                  >
                    <Palette className="w-4 h-4" style={{ color: 'var(--text-secondary, #9ca3af)' }} />
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
                      className="w-full px-2 py-1 text-sm border rounded focus:ring-2"
                      style={{
                        backgroundColor: 'var(--card-background, white)',
                        borderColor: 'var(--border-color, #e5e7eb)',
                        color: 'var(--text-primary, #1f2937)',
                        boxShadow: 'focus:0 0 0 2px var(--primary-color-light, rgba(59, 130, 246, 0.2))',
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, #9ca3af)' }}>
                  输入十六进制颜色值，如 #FF0000
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Fallback: 如果Portal失败，使用普通定位 */}
      {isOpen && (!buttonRect || typeof window === 'undefined') && (
        <div
          className="color-picker-container color-picker-dropdown absolute top-full left-0 mt-1 w-64 border rounded-lg shadow-lg"
          style={{
            backgroundColor: 'var(--card-background, white)',
            borderColor: 'var(--border-color, #e5e7eb)',
            zIndex: 9999,
          }}
          ref={dropdownRef}
        >
          <div className="p-4">
            {/* 预设颜色 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary, #1f2937)' }}>
                预设颜色
              </h4>
              <div className="grid grid-cols-8 gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'color-picker-item w-8 h-8 rounded border-2 transition-all hover:scale-110',
                      value === color ? 'selected' : '',
                    )}
                    style={{
                      backgroundColor: color,
                      borderColor: value === color
                        ? 'var(--primary-color, #3b82f6)'
                        : 'var(--border-color, #e5e7eb)'
                    }}
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
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary, #1f2937)' }}>
                  自定义颜色
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 border-2 border-dashed rounded transition-colors"
                    style={{
                      borderColor: 'var(--border-color, #e5e7eb)',
                    }}
                    onClick={handleCustomColorClick}
                    title="选择自定义颜色"
                  >
                    <Palette className="w-4 h-4" style={{ color: 'var(--text-secondary, #9ca3af)' }} />
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
                      className="w-full px-2 py-1 text-sm border rounded focus:ring-2"
                      style={{
                        backgroundColor: 'var(--card-background, white)',
                        borderColor: 'var(--border-color, #e5e7eb)',
                        color: 'var(--text-primary, #1f2937)',
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, #9ca3af)' }}>
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
            value === color ? 'border-gray-900' : 'border-gray-300',
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          title={color}
        >
          {value === color && (
            <Check
              className={cn(
                'text-white mx-auto',
                size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4',
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
      {showLabel && <span className="text-sm text-gray-600">{color}</span>}
    </div>
  );
};

export default ColorPicker;
