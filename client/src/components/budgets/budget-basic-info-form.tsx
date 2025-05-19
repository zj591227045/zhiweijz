'use client';

import { useBudgetAddStore } from '@/store/budget-add-store';

export function BudgetBasicInfoForm() {
  const {
    name,
    amount,
    errors,
    setName,
    setAmount
  } = useBudgetAddStore();

  // 处理名称变更
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  // 处理金额变更
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setAmount(isNaN(value) ? 0 : value);
  };

  return (
    <>
      <div className="form-group">
        <label htmlFor="budget-name">预算名称</label>
        <input
          type="text"
          id="budget-name"
          placeholder="输入预算名称"
          value={name}
          onChange={handleNameChange}
        />
        {errors.name && <div className="error-message">{errors.name}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="budget-amount">预算金额</label>
        <div className="amount-input">
          <span className="currency-symbol">¥</span>
          <input
            type="number"
            id="budget-amount"
            placeholder="0.00"
            value={amount || ''}
            onChange={handleAmountChange}
            step="0.01"
            min="0"
          />
        </div>
        {errors.amount && <div className="error-message">{errors.amount}</div>}
      </div>
    </>
  );
}
