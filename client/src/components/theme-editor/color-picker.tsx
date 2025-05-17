'use client';

import { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { X } from 'lucide-react';
import { PresetColor } from '@/types/theme';
import { presetColors } from '@/types/theme';

interface ColorPickerProps {
  title?: string;
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
  presets?: PresetColor[];
}

/**
 * 颜色选择器组件
 */
export function ColorPicker({
  title = '选择颜色',
  color,
  onChange,
  onClose,
  presets = presetColors,
}: ColorPickerProps) {
  const [currentColor, setCurrentColor] = useState(color);
  const [colorFormat, setColorFormat] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const modalRef = useRef<HTMLDivElement>(null);

  // 初始化颜色
  useEffect(() => {
    setCurrentColor(color);
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

  // 处理颜色变化
  const handleColorChange = (newColor: string) => {
    setCurrentColor(newColor);
  };

  // 应用颜色
  const handleApply = () => {
    onChange(currentColor);
    onClose();
  };

  // 切换颜色格式
  const toggleColorFormat = () => {
    const formats: ('hex' | 'rgb' | 'hsl')[] = ['hex', 'rgb', 'hsl'];
    const currentIndex = formats.indexOf(colorFormat);
    const nextIndex = (currentIndex + 1) % formats.length;
    setColorFormat(formats[nextIndex]);
  };

  // 格式化颜色值
  const formatColorValue = (color: string): string => {
    try {
      if (colorFormat === 'hex') {
        return color;
      }

      // 将十六进制转换为RGB
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      if (colorFormat === 'rgb') {
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // 转换为HSL
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;

        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

          if (max === rNorm) {
            h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
          } else if (max === gNorm) {
            h = (bNorm - rNorm) / d + 2;
          } else {
            h = (rNorm - gNorm) / d + 4;
          }

          h = Math.round(h * 60);
        }

        s = Math.round(s * 100);
        l = Math.round(l * 100);

        return `hsl(${h}, ${s}%, ${l}%)`;
      }
    } catch (error) {
      return color;
    }
  };

  // 解析颜色输入
  const parseColorInput = (input: string): string => {
    try {
      // 如果是十六进制格式
      if (/^#[0-9A-F]{6}$/i.test(input)) {
        return input;
      }

      // 如果是RGB格式
      const rgbMatch = input.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
      }

      // 如果是HSL格式 (简化版)
      const hslMatch = input.match(/^hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/i);
      if (hslMatch) {
        // 这里应该有HSL到HEX的转换，但为简化代码，我们返回一个默认值
        return currentColor;
      }

      return currentColor;
    } catch (error) {
      return currentColor;
    }
  };

  return (
    <div className="color-picker-modal" style={{ display: 'flex' }}>
      <div
        ref={modalRef}
        className="color-picker-container"
      >
        <div className="color-picker-header">
          <div className="color-picker-title">{title}</div>
          <div className="color-picker-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </div>
        </div>

        <div className="color-picker-body">
          <div
            className="color-picker-preview"
            style={{ backgroundColor: currentColor }}
          />

          <div className="color-input-container">
            <input
              type="text"
              value={formatColorValue(currentColor)}
              onChange={(e) => handleColorChange(parseColorInput(e.target.value))}
              className="color-input"
            />
            <button
              onClick={toggleColorFormat}
              className="color-format-toggle"
            >
              {colorFormat.toUpperCase()}
            </button>
          </div>

          <HexColorPicker color={currentColor} onChange={handleColorChange} className="w-full mb-4" />

          <div className="preset-colors">
            {presets.map((preset, index) => (
              <div
                key={index}
                className="preset-color"
                style={{ backgroundColor: preset.value }}
                onClick={() => handleColorChange(preset.value)}
                title={preset.label || preset.value}
              />
            ))}
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
