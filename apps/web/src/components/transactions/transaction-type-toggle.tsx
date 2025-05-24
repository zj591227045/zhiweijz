"use client";

import { useTransactionFormStore } from "@/store/transaction-form-store";
import { TransactionType } from "@/types";

export function TransactionTypeToggle() {
  const { type, setType } = useTransactionFormStore();

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
  };

  return (
    <div className="transaction-type-toggle">
      <button
        className={`type-button expense ${type === TransactionType.EXPENSE ? 'active' : ''}`}
        onClick={() => handleTypeChange(TransactionType.EXPENSE)}
      >
        支出
      </button>
      <button
        className={`type-button income ${type === TransactionType.INCOME ? 'active' : ''}`}
        onClick={() => handleTypeChange(TransactionType.INCOME)}
      >
        收入
      </button>
    </div>
  );
}
