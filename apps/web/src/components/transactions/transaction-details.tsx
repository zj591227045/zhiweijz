"use client";

import { useTransactionFormStore } from "@/store/transaction-form-store";
import { useBudgetStore } from "@/store/budget-store";
import { TransactionType } from "@/types";
import { BudgetSelector } from "./budget-selector";

interface TransactionDetailsProps {
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function TransactionDetails({ onSubmit, isSubmitting }: TransactionDetailsProps) {
  const {
    type,
    description,
    date,
    time,
    setDescription,
    setDate,
    setTime
  } = useTransactionFormStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="transaction-details-form" onSubmit={handleSubmit}>
      {/* 描述输入 */}
      <div className="form-group">
        <label className="form-label">描述</label>
        <div className="form-input">
          <textarea
            placeholder="添加描述..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* 日期和时间选择 */}
      <div className="form-group">
        <label className="form-label">日期</label>
        <div className="form-input">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">时间</label>
        <div className="form-input">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* 预算选择（仅支出类型显示） */}
      {type === TransactionType.EXPENSE && <BudgetSelector />}

      {/* 提交按钮 */}
      <div className="form-actions">
        <button
          type="submit"
          className="save-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
