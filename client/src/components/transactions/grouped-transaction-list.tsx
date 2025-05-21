"use client";

import { TransactionItem } from "./transaction-item";
import { Transaction } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";

interface TransactionGroup {
  date: string;
  transactions: Transaction[];
}

interface GroupedTransactionListProps {
  groups: TransactionGroup[];
}

export function GroupedTransactionList({ groups }: GroupedTransactionListProps) {
  // 格式化日期显示
  const formatDateDisplay = (dateStr: string) => {
    const date = dayjs(dateStr);
    const today = dayjs().startOf("day");
    const yesterday = today.subtract(1, "day");

    if (date.isSame(today, "day")) {
      return "今天";
    } else if (date.isSame(yesterday, "day")) {
      return "昨天";
    } else {
      return date.format("MM月DD日");
    }
  };

  // 计算每组的总金额
  const calculateDailyTotal = (transactions: Transaction[]) => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === "EXPENSE") {
          acc.expense += transaction.amount;
        } else {
          acc.income += transaction.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  };

  return (
    <div className="recent-transactions">
      {groups.map((group) => {
        const { income, expense } = calculateDailyTotal(group.transactions);
        const balance = income - expense;

        return (
          <div key={group.date} className="transaction-group">
            <div className="transaction-date">
              <span>{formatDateDisplay(group.date)}</span>
              <div className="daily-totals">
                <span className="daily-income">收入 <span className="amount">{formatCurrency(income)}</span></span>
                <span className="daily-expense">支出 <span className="amount">{formatCurrency(expense)}</span></span>
              </div>
            </div>
            <div className="transaction-list">
              {group.transactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
