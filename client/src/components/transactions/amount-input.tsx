"use client";

import { useEffect, useRef } from "react";
import { useTransactionFormStore } from "@/store/transaction-form-store";

export function AmountInput() {
  const { amount, setAmount } = useTransactionFormStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // 处理金额输入
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 只允许输入数字和小数点
    if (/^$|^[0-9]+\.?[0-9]*$/.test(value)) {
      setAmount(value);
    }
  };

  // 组件挂载时自动聚焦
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="amount-input-container">
      <span className="currency-symbol">¥</span>
      <input
        ref={inputRef}
        type="text"
        className="amount-input"
        placeholder="0.00"
        value={amount}
        onChange={handleAmountChange}
        inputMode="decimal"
      />
    </div>
  );
}
