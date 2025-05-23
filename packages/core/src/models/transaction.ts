import { AccountBook } from './account-book';
import { Category } from './category';

/**
 * 交易相关类型
 */
export enum TransactionType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  category?: Category;
  description?: string;
  date: string;
  accountBookId: string;
  accountBook?: AccountBook;
  budgetId?: string;
  budget?: {
    id: string;
    name: string;
    amount: number;
    remaining: number;
  };
  familyId?: string;
  familyMemberId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionData {
  amount: number;
  type: TransactionType;
  categoryId: string;
  description?: string;
  date: string;
  accountBookId: string;
  budgetId?: string;
  familyId?: string;
  familyMemberId?: string;
}

export interface UpdateTransactionData {
  amount?: number;
  type?: TransactionType;
  categoryId?: string;
  description?: string;
  date?: string;
  budgetId?: string;
}

export interface TransactionGroup {
  date: string;
  transactions: Transaction[];
}
