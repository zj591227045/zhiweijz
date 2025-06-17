export interface SmartAccountingResult {
  amount: number;
  date: Date;
  categoryId: string;
  categoryName: string;
  type: 'EXPENSE' | 'INCOME';
  note: string;
  accountId: string;
  accountName: string;
  accountType: string;
  budgetId?: string;
  budgetName?: string;
  budgetOwnerName?: string;
  budgetType?: string;
  userId: string;
  confidence: number;
  createdAt: Date;
  originalDescription: string;
}

export interface SmartAccountingError {
  error: string;
}

export type SmartAccountingResponse = SmartAccountingResult | SmartAccountingError | null;