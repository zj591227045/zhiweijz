"use client";

import { useTransactionFormStore } from "@/store/transaction-form-store";
import { TransactionType } from "@/types";
import { cn } from "@/lib/utils";

export function TransactionTypeToggle() {
  const { type, setType } = useTransactionFormStore();

  return (
    <div className="transaction-type-toggle">
      <button
        className={cn(
          "type-button expense",
          type === TransactionType.EXPENSE && "active"
        )}
        onClick={() => setType(TransactionType.EXPENSE)}
      >
        支出
      </button>
      <button
        className={cn(
          "type-button income",
          type === TransactionType.INCOME && "active"
        )}
        onClick={() => setType(TransactionType.INCOME)}
      >
        收入
      </button>
    </div>
  );
}
