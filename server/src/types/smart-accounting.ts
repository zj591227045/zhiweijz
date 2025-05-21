export interface SmartAccountingResult {
  amount: number;
  date: Date;
  categoryId: string;
  categoryName: string;
  type: string;
  note: string;
  accountId: string;
  accountName: string;
  accountType: string;
  budgetId?: string;
  budgetName?: string;
  budgetType?: string;
  userId: string;
  confidence: number;
  createdAt: Date;
  originalDescription: string;
}