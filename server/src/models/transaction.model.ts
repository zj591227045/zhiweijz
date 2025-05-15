import { Transaction, TransactionType } from '@prisma/client';
import { CategoryResponseDto } from './category.model';

/**
 * 交易记录创建DTO
 */
export interface CreateTransactionDto {
  amount: number;
  type: TransactionType;
  categoryId: string;
  description?: string;
  date: Date;
  familyId?: string;
  familyMemberId?: string;
}

/**
 * 交易记录更新DTO
 */
export interface UpdateTransactionDto {
  amount?: number;
  categoryId?: string;
  description?: string;
  date?: Date;
  familyMemberId?: string;
}

/**
 * 交易记录查询参数
 */
export interface TransactionQueryParams {
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  familyId?: string;
  familyMemberId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 交易记录导出格式
 */
export enum TransactionExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

/**
 * 交易记录导出请求DTO
 */
export interface TransactionExportRequestDto {
  format: TransactionExportFormat;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}

/**
 * 交易记录导入请求DTO
 */
export interface TransactionImportRequestDto {
  format: TransactionExportFormat;
  fileContent: string;
}

/**
 * 交易记录导入响应DTO
 */
export interface TransactionImportResponseDto {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

/**
 * 交易记录响应DTO
 */
export interface TransactionResponseDto {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  category?: CategoryResponseDto;
  description?: string;
  date: Date;
  userId: string;
  familyId?: string;
  familyMemberId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 交易记录分页响应DTO
 */
export interface TransactionPaginatedResponseDto {
  total: number;
  page: number;
  limit: number;
  data: TransactionResponseDto[];
}

/**
 * 将交易记录实体转换为响应DTO
 */
export function toTransactionResponseDto(transaction: Transaction, category?: CategoryResponseDto): TransactionResponseDto {
  return {
    id: transaction.id,
    amount: Number(transaction.amount),
    type: transaction.type,
    categoryId: transaction.categoryId,
    category,
    description: transaction.description || undefined,
    date: transaction.date,
    userId: transaction.userId,
    familyId: transaction.familyId || undefined,
    familyMemberId: transaction.familyMemberId || undefined,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}
