'use client';

import { useBudgetEditStore } from '@/store/budget-edit-store';

export function BudgetBasicInfoForm() {
  const { name, amount, setName, setAmount } = useBudgetEditStore();
  
  // 处理名称变更
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };
  
  // 处理金额变更
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setAmount(value);
    } else {
      setAmount(0);
    }
  };
  
  return (
    <>
      <div className="form-group">
        <label htmlFor="budget-name">预算名称</label>
        <input
          type="text"
          id="budget-name"
          value={name}
          onChange={handleNameChange}
          placeholder="输入预算名称"
          maxLength={50}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="budget-amount">预算金额</label>
        <div className="amount-input">
          <span className="currency-symbol">¥</span>
          <input
            type="number"
            id="budget-amount"
            value={amount || ''}
            onChange={handleAmountChange}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            required
          />
        </div>
      </div>
    </>
  );
}
