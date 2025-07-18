'use client';

import { useState, useEffect } from 'react';
import { useBudgetFormStore } from '@/store/budget-form-store';

export function BasicInfoSection() {
  const { name, amount, errors, setName, setAmount } = useBudgetFormStore();
  const [amountInput, setAmountInput] = useState('');

  // 同步store中的amount到本地输入状态
  useEffect(() => {
    if (amount === 0 && amountInput === '') {
      // 如果store中是0且本地输入为空，保持空状态
      return;
    }
    if (amount !== parseFloat(amountInput || '0')) {
      setAmountInput(amount > 0 ? amount.toString() : '');
    }
  }, [amount, amountInput]);

  // 处理预算名称变更
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  // 处理预算金额变更
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 只允许输入数字和小数点，支持以小数点开头的输入
    if (/^$|^\d*\.?\d*$/.test(value)) {
      setAmountInput(value);

      // 更新store中的数值
      if (value === '' || value === '.') {
        setAmount(0);
      } else {
        const numericValue = parseFloat(value);
        setAmount(isNaN(numericValue) ? 0 : numericValue);
      }
    }
  };

  return (
    <div className="form-section">
      <div className="section-title">
        <i className="fas fa-info-circle"></i>
        基本信息
      </div>

      <div className="form-group">
        <label htmlFor="budget-name">预算名称</label>
        <input
          type="text"
          id="budget-name"
          placeholder="例如：餐饮月度预算"
          value={name}
          onChange={handleNameChange}
          maxLength={50}
        />
        {errors.name && <div className="error-message">{errors.name}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="budget-amount">预算金额</label>
        <div className="amount-input">
          <span className="currency-symbol">¥</span>
          <input
            type="text"
            id="budget-amount"
            placeholder="0.00"
            value={amountInput}
            onChange={handleAmountChange}
          />
        </div>
        {errors.amount && <div className="error-message">{errors.amount}</div>}
      </div>
    </div>
  );
}
