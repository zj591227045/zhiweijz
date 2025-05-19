"use client";

import { useState } from "react";

interface NumericKeyboardProps {
  onInput: (value: string) => void;
  onDelete: () => void;
  onComplete: () => void;
}

export function NumericKeyboard({ onInput, onDelete, onComplete }: NumericKeyboardProps) {
  // 处理数字按钮点击
  const handleNumberClick = (number: string) => {
    onInput(number);
  };

  // 处理删除按钮点击
  const handleDeleteClick = () => {
    onDelete();
  };

  // 处理完成按钮点击
  const handleCompleteClick = () => {
    onComplete();
  };

  // 处理加号按钮点击
  const handlePlusClick = () => {
    onInput("+");
  };

  // 处理减号按钮点击
  const handleMinusClick = () => {
    onInput("-");
  };

  // 处理等号按钮点击
  const handleEqualsClick = () => {
    // 发送等号，让输入组件处理计算逻辑
    onInput("=");
  };

  return (
    <div className="numeric-keyboard" style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      backgroundColor: 'var(--background-color)',
      borderTop: '1px solid var(--border-color)',
      zIndex: '9999',
      maxWidth: '480px',
      margin: '0 auto',
      padding: '8px 0',
      boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
    }}>
      <div className="keyboard-row" style={{ display: 'flex', width: '100%' }}>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("7")}>7</button>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("8")}>8</button>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("9")}>9</button>
        <button className="keyboard-key function-key" style={{
          flex: '1',
          height: '60px',
          border: 'none',
          backgroundColor: 'var(--card-background)',
          fontSize: '24px',
          fontWeight: '500',
          color: 'var(--primary-color)',
          borderRadius: '4px',
          margin: '2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent'
        }} onClick={handleEqualsClick}>=</button>
      </div>
      <div className="keyboard-row" style={{ display: 'flex', width: '100%' }}>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("4")}>4</button>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("5")}>5</button>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("6")}>6</button>
        <button className="keyboard-key function-key" style={{
          flex: '1',
          height: '60px',
          border: 'none',
          backgroundColor: 'var(--card-background)',
          fontSize: '24px',
          fontWeight: '500',
          color: 'var(--primary-color)',
          borderRadius: '4px',
          margin: '2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent'
        }} onClick={handlePlusClick}>+</button>
      </div>
      <div className="keyboard-row" style={{ display: 'flex', width: '100%' }}>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("1")}>1</button>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("2")}>2</button>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("3")}>3</button>
        <button className="keyboard-key function-key" style={{
          flex: '1',
          height: '60px',
          border: 'none',
          backgroundColor: 'var(--card-background)',
          fontSize: '24px',
          fontWeight: '500',
          color: 'var(--primary-color)',
          borderRadius: '4px',
          margin: '2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent'
        }} onClick={handleMinusClick}>-</button>
      </div>
      <div className="keyboard-row" style={{ display: 'flex', width: '100%' }}>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick(".")}>.</button>
        <button className="keyboard-key" style={{
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
          WebkitTapHighlightColor: 'transparent'
        }} onClick={() => handleNumberClick("0")}>0</button>
        <button className="keyboard-key function-key" style={{
          flex: '1',
          height: '60px',
          border: 'none',
          backgroundColor: 'var(--card-background)',
          fontSize: '24px',
          fontWeight: '500',
          color: 'var(--primary-color)',
          borderRadius: '4px',
          margin: '2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent'
        }} onClick={handleDeleteClick}>
          <i className="fas fa-backspace"></i>
        </button>
        <button className="keyboard-key complete-key" style={{
          flex: '1',
          height: '60px',
          border: 'none',
          backgroundColor: 'var(--primary-color)',
          fontSize: '18px',
          fontWeight: '500',
          color: 'white',
          borderRadius: '4px',
          margin: '2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent'
        }} onClick={handleCompleteClick}>完成</button>
      </div>
    </div>
  );
}
