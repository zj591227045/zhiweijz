import { TransactionType } from './transaction';

/**
 * 分类相关类型
 */
export { TransactionType };
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  accountBookId?: string;
  isDefault?: boolean;
  isHidden?: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  accountBookId: string;
}

export interface UpdateCategoryData {
  name?: string;
  icon?: string;
  color?: string;
  isHidden?: boolean;
  displayOrder?: number;
}
