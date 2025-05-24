'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface PresetColor {
  label: string;
  value: string;
}

interface ColorPickerProps {
  title?: string;
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
  presets?: PresetColor[];
}

// 预设颜色
const defaultPresets: PresetColor[] = [
  { label: '主蓝色', value: '#3B82F6' },
  { label: '绿色', value: '#10B981' },
  { label: '红色', value: '#EF4444' },
  { label: '黄色', value: '#F59E0B' },
  { label: '紫色', value: '#8B5CF6' },
  { label: '粉色', value: '#EC4899' },
  { label: '青色', value: '#06B6D4' },
  { label: '橙色', value: '#F97316' },
  { label: '灰色', value: '#6B7280' },
  { label: '黑色', value: '#1F2937' },
  { label: '白色', value: '#FFFFFF' },
  { label: '深蓝', value: '#1E40AF' },
];

export function ColorPicker({
  title = '选择颜色',
  color,
  onChange,
  onClose,
  presets = defaultPresets,
}: ColorPickerProps) {
  const [currentColor, setCurrentColor] = useState(color);
  const [inputValue, setInputValue] = useState(color);
  const modalRef = useRef<HTMLDivElement>(null);

  // 初始化颜色
  useEffect(() => {
    setCurrentColor(color);
    setInputValue(color);
  }, [color]);

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // 验证颜色格式
  const isValidColor = (color: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(color);
  };

  // 处理颜色变化
  const handleColorChange = (newColor: string) => {
    setCurrentColor(newColor);
    setInputValue(newColor);
  };

  // 处理输入框变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (isValidColor(value)) {
      setCurrentColor(value);
    }
  };

  // 应用颜色
  const handleApply = () => {
    if (!isValidColor(currentColor)) {
      toast.error('请输入有效的颜色值（如：#FF0000）');
      return;
    }
    onChange(currentColor);
    onClose();
  };

  // 生成颜色网格
  const generateColorGrid = () => {
    const colors = [];
    // 生成基础色相
    for (let h = 0; h < 360; h += 30) {
      for (let s = 50; s <= 100; s += 50) {
        for (let l = 30; l <= 70; l += 20) {
          const hsl = `hsl(${h}, ${s}%, ${l}%)`;
          const hex = hslToHex(h, s, l);
          colors.push(hex);
        }
      }
    }
    return colors.slice(0, 48); // 限制数量
  };

  // HSL转HEX
  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const colorGrid = generateColorGrid();

  return (
    <div className="color-picker-modal">
      <div className="color-picker-overlay" onClick={onClose}></div>
      <div ref={modalRef} className="color-picker-container">
        <div className="color-picker-header">
          <div className="color-picker-title">{title}</div>
          <button className="color-picker-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="color-picker-body">
          {/* 当前颜色预览 */}
          <div className="color-preview-section">
            <div
              className="color-preview"
              style={{ backgroundColor: currentColor }}
            />
            <div className="color-input-container">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                className="color-input"
                placeholder="#FF0000"
                maxLength={7}
              />
            </div>
          </div>

          {/* 预设颜色 */}
          <div className="preset-section">
            <div className="section-title">预设颜色</div>
            <div className="preset-colors">
              {presets.map((preset, index) => (
                <div
                  key={index}
                  className="preset-color"
                  style={{ backgroundColor: preset.value }}
                  onClick={() => handleColorChange(preset.value)}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          {/* 颜色网格 */}
          <div className="color-grid-section">
            <div className="section-title">颜色选择</div>
            <div className="color-grid">
              {colorGrid.map((color, index) => (
                <div
                  key={index}
                  className="grid-color"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="color-picker-footer">
          <button
            onClick={onClose}
            className="color-picker-button cancel-button"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            className="color-picker-button apply-button"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
