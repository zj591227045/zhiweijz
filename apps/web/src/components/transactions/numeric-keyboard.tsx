'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { haptic } from '@/utils/haptic-feedback';

interface NumericKeyboardProps {
  onInput: (value: string) => void;
  onDelete: () => void;
  onComplete: () => void;
}

export function NumericKeyboard({ onInput, onDelete, onComplete }: NumericKeyboardProps) {
  const [mounted, setMounted] = useState(false);

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理数字按钮点击
  const handleNumberClick = (number: string) => {
    haptic.light(); // 数字按键轻微震动
    onInput(number);
  };

  // 处理删除按钮点击
  const handleDeleteClick = () => {
    haptic.light(); // 删除按键轻微震动
    onDelete();
  };

  // 处理完成按钮点击
  const handleCompleteClick = () => {
    haptic.medium(); // 完成按键中等震动
    onComplete();
  };

  // 处理加号按钮点击
  const handlePlusClick = () => {
    haptic.light(); // 运算符按键轻微震动
    onInput('+');
  };

  // 处理减号按钮点击
  const handleMinusClick = () => {
    haptic.light(); // 运算符按键轻微震动
    onInput('-');
  };

  // 处理等号按钮点击
  const handleEqualsClick = () => {
    haptic.light(); // 等号按键轻微震动
    // 发送等号，让输入组件处理计算逻辑
    onInput('=');
  };

  const keyStyle = {
    flex: '1',
    height: '60px',
    border: 'none',
    backgroundColor: 'var(--card-background)',
    fontSize: '24px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    borderRadius: '4px',
    margin: '2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  } as const;

  const functionKeyStyle = {
    ...keyStyle,
    color: 'var(--primary-color)',
  } as const;

  const completeKeyStyle = {
    ...keyStyle,
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    fontSize: '18px',
  } as const;

  const keyboardContent = (
    <div
      className="numeric-keyboard"
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: 'var(--background-color)',
        borderTop: '1px solid var(--border-color)',
        zIndex: '99999', // 使用最高的z-index
        maxWidth: '480px',
        margin: '0 auto',
        padding: '8px 0',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
        // 确保在任何iOS容器之上
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      {/* 第一行：7 8 9 = */}
      <div className="keyboard-row" style={{ display: 'flex', width: '100%' }}>
        <button style={keyStyle} onClick={() => handleNumberClick('7')}>
          7
        </button>
        <button style={keyStyle} onClick={() => handleNumberClick('8')}>
          8
        </button>
        <button style={keyStyle} onClick={() => handleNumberClick('9')}>
          9
        </button>
        <button style={functionKeyStyle} onClick={handleEqualsClick}>
          =
        </button>
      </div>

      {/* 第二行：4 5 6 + */}
      <div className="keyboard-row" style={{ display: 'flex', width: '100%' }}>
        <button style={keyStyle} onClick={() => handleNumberClick('4')}>
          4
        </button>
        <button style={keyStyle} onClick={() => handleNumberClick('5')}>
          5
        </button>
        <button style={keyStyle} onClick={() => handleNumberClick('6')}>
          6
        </button>
        <button style={functionKeyStyle} onClick={handlePlusClick}>
          +
        </button>
      </div>

      {/* 第三行：1 2 3 - */}
      <div className="keyboard-row" style={{ display: 'flex', width: '100%' }}>
        <button style={keyStyle} onClick={() => handleNumberClick('1')}>
          1
        </button>
        <button style={keyStyle} onClick={() => handleNumberClick('2')}>
          2
        </button>
        <button style={keyStyle} onClick={() => handleNumberClick('3')}>
          3
        </button>
        <button style={functionKeyStyle} onClick={handleMinusClick}>
          -
        </button>
      </div>

      {/* 第四行：. 0 删除 完成 */}
      <div className="keyboard-row" style={{ display: 'flex', width: '100%' }}>
        <button style={keyStyle} onClick={() => handleNumberClick('.')}>
          .
        </button>
        <button style={keyStyle} onClick={() => handleNumberClick('0')}>
          0
        </button>
        <button style={functionKeyStyle} onClick={handleDeleteClick}>
          <i className="fas fa-backspace"></i>
        </button>
        <button style={completeKeyStyle} onClick={handleCompleteClick}>
          完成
        </button>
      </div>
    </div>
  );

  // 只在客户端渲染，并使用Portal渲染到body
  if (!mounted) {
    return null;
  }

  return createPortal(keyboardContent, document.body);
}
