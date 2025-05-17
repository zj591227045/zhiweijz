'use client';

import { useState } from 'react';
import { ColorVariable as ColorVariableType } from '@/types/theme';

interface ColorVariableProps {
  variable: ColorVariableType;
  onSelect: (name: string, value: string) => void;
}

/**
 * 颜色变量组件
 */
export function ColorVariable({ variable, onSelect }: ColorVariableProps) {
  const [copied, setCopied] = useState(false);

  // 复制颜色值
  const copyColorValue = () => {
    navigator.clipboard.writeText(variable.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="color-variable">
      <div
        className="color-preview"
        style={{ backgroundColor: variable.value }}
        onClick={() => onSelect(variable.name, variable.value)}
      ></div>
      <div className="variable-name">{variable.label}</div>
      <div
        className="color-value"
        onClick={copyColorValue}
        title={copied ? '已复制' : '点击复制'}
      >
        {variable.value}
        {copied && <span style={{ marginLeft: '4px', color: 'var(--success-color)' }}>✓</span>}
      </div>
    </div>
  );
}
