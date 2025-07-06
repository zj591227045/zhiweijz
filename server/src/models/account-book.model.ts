import { AccountBook, AccountBookType } from '@prisma/client';

/**
 * 账本创建DTO
 */
export interface CreateAccountBookDto {
  name: string;
  description?: string;
  isDefault?: boolean;
  type?: AccountBookType;
  familyId?: string;
}

/**
 * 账本更新DTO
 */
export interface UpdateAccountBookDto {
  name?: string;
  description?: string;
  isDefault?: boolean;
  type?: AccountBookType;
  familyId?: string;
}

/**
 * 账本查询参数
 */
export interface AccountBookQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  type?: AccountBookType;
  familyId?: string;
}

/**
 * 账本响应DTO
 */
export interface AccountBookResponseDto {
  id: string;
  name: string;
  description?: string;
  userId: string;
  type: AccountBookType;
  familyId?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  // 统计信息
  transactionCount?: number;
  categoryCount?: number;
  budgetCount?: number;
}

/**
 * 账本分页响应DTO
 */
export interface AccountBookPaginatedResponseDto {
  total: number;
  page: number;
  limit: number;
  data: AccountBookResponseDto[];
}

/**
 * 将账本实体转换为响应DTO
 */
export function toAccountBookResponseDto(
  accountBook: AccountBook,
  transactionCount?: number,
  categoryCount?: number,
  budgetCount?: number,
): AccountBookResponseDto {
  const { id, name, description, userId, type, familyId, isDefault, createdAt, updatedAt } =
    accountBook;

  return {
    id,
    name,
    description: description || undefined,
    userId,
    type,
    familyId: familyId || undefined,
    isDefault,
    createdAt,
    updatedAt,
    transactionCount,
    categoryCount,
    budgetCount,
  };
}
