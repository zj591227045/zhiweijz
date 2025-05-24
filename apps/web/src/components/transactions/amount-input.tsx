"use client";

import { useEffect, useRef, useState } from "react";
import { useTransactionFormStore } from "@/store/transaction-form-store";
import { NumericKeyboard } from "./numeric-keyboard";

export function AmountInput() {
  const { amount, setAmount } = useTransactionFormStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  // 处理金额输入
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 只允许输入数字和小数点
    if (/^$|^[0-9]+\.?[0-9]*$/.test(value)) {
      setAmount(value);
    }
  };

  // 处理输入框点击，显示虚拟键盘
  const handleInputClick = () => {
    setShowKeyboard(true);
  };

  // 处理键盘输入
  const handleKeyboardInput = (value: string) => {
    // 处理数字和小数点输入
    if (value === "." && amount.includes(".")) {
      // 已经有小数点了，不再添加
      return;
    }

    // 处理加减号
    if (value === "+" || value === "-") {
      // 如果是第一个字符，或者前一个字符是运算符，则替换
      if (amount === "" || ["+", "-"].includes(amount.slice(-1))) {
        setAmount(value);
      } else {
        // 否则追加
        setAmount(amount + value);
      }
      return;
    }

    // 处理等号 - 计算表达式
    if (value === "=") {
      try {
        // 简单的表达式计算
        const result = evaluateExpression(amount);
        if (!isNaN(result)) {
          setAmount(result.toString());
        }
      } catch (error) {
        console.error("计算表达式失败:", error);
      }
      return;
    }

    // 正常追加数字或小数点
    setAmount(amount + value);
  };

  // 处理删除
  const handleKeyboardDelete = () => {
    if (amount.length > 0) {
      setAmount(amount.slice(0, -1));
    }
  };

  // 处理完成
  const handleKeyboardComplete = () => {
    setShowKeyboard(false);
  };

  // 简单的表达式计算函数
  const evaluateExpression = (expression: string): number => {
    // 移除空格
    expression = expression.replace(/\s/g, '');
    
    // 只允许数字、小数点、加号和减号
    if (!/^[0-9+\-\.]+$/.test(expression)) {
      throw new Error('Invalid expression');
    }
    
    // 使用Function构造函数安全地计算表达式
    try {
      return Function('"use strict"; return (' + expression + ')')();
    } catch (error) {
      throw new Error('Calculation failed');
    }
  };

  // 组件挂载时自动聚焦和显示键盘
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // 自动显示键盘
      setShowKeyboard(true);
    }
  }, []);

  return (
    <>
      <div className="amount-input-container">
        <div className="amount-display">
          <span className="currency-symbol">¥</span>
          <input
            ref={inputRef}
            type="text"
            className="amount-input"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
            onClick={handleInputClick}
            readOnly // 使用虚拟键盘输入，禁用系统键盘
          />
        </div>
      </div>

      {showKeyboard && (
        <NumericKeyboard
          onInput={handleKeyboardInput}
          onDelete={handleKeyboardDelete}
          onComplete={handleKeyboardComplete}
        />
      )}
    </>
  );
}
