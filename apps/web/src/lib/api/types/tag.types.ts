/**
 * 标签相关的TypeScript类型定义
 * 与后端模型保持一致
 */

/**
 * 标签基础信息
 */
export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  accountBookId: string;
  createdBy: string;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 标签响应DTO（包含创建者信息）
 */
export interface TagResponseDto extends Tag {
  creator?: {
    id: string;
    name: string;
  };
}

/**
 * 创建标签DTO
 */
export interface CreateTagDto {
  name: string;
  color: string;
  description?: string;
  accountBookId: string;
}

/**
 * 更新标签DTO
 */
export interface UpdateTagDto {
  name?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * 标签查询参数
 */
export interface TagQueryParams {
  accountBookId: string;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'usage' | 'created';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * 标签列表响应
 */
export interface TagListResponse {
  success: boolean;
  data: {
    tags: TagResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * 标签详情响应
 */
export interface TagDetailResponse {
  success: boolean;
  data: TagResponseDto & {
    recentTransactions: Array<{
      id: string;
      amount: number;
      type: string;
      description?: string;
      date: Date;
      categoryName: string;
    }>;
    statistics: {
      totalAmount: number;
      transactionCount: number;
      categoryDistribution: Array<{
        categoryId: string;
        categoryName: string;
        count: number;
        amount: number;
      }>;
    };
  };
}

/**
 * 交易标签关联
 */
export interface TransactionTag {
  id: string;
  transactionId: string;
  tagId: string;
  createdAt: Date;
}

/**
 * 为交易添加标签DTO
 */
export interface AddTransactionTagsDto {
  tagIds: string[];
}

/**
 * 批量操作交易标签DTO
 */
export interface BatchTransactionTagsDto {
  transactionIds: string[];
  action: 'add' | 'remove' | 'replace';
  tagIds: string[];
}

/**
 * 批量操作响应
 */
export interface BatchTransactionTagsResponse {
  success: boolean;
  data: {
    processedTransactions: number;
    failedTransactions: string[];
    summary: {
      added: number;
      removed: number;
      skipped: number;
    };
  };
  message: string;
}

/**
 * 标签统计查询参数
 */
export interface TagStatisticsQuery {
  accountBookId: string;
  tagIds?: string[];
  startDate: string;
  endDate: string;
  transactionType?: 'income' | 'expense';
  categoryIds?: string[];
  budgetIds?: string[];
}

/**
 * 标签统计响应
 */
export interface TagStatisticsResponse {
  success: boolean;
  data: {
    overview: {
      totalAmount: number;
      transactionCount: number;
      tagCount: number;
    };
    tagStatistics: Array<{
      tag: TagResponseDto;
      statistics: {
        totalAmount: number;
        transactionCount: number;
        averageAmount: number;
        incomeAmount: number;
        expenseAmount: number;
        categoryBreakdown: Array<{
          categoryId: string;
          categoryName: string;
          amount: number;
          count: number;
        }>;
        monthlyTrend: Array<{
          month: string;
          amount: number;
          count: number;
        }>;
      };
    }>;
    crossAnalysis: {
      tagCombinations: Array<{
        tags: TagResponseDto[];
        count: number;
        amount: number;
      }>;
    };
  };
}

/**
 * 标签趋势查询参数
 */
export interface TagTrendsQuery {
  accountBookId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  limit?: number;
}

/**
 * 标签趋势响应
 */
export interface TagTrendsResponse {
  success: boolean;
  data: Array<{
    tag: TagResponseDto;
    trend: Array<{
      period: string;
      count: number;
      amount: number;
    }>;
    growth: {
      percentage: number;
      direction: 'up' | 'down' | 'stable';
    };
  }>;
}

/**
 * 标签建议查询参数
 */
export interface TagSuggestionsQuery {
  accountBookId: string;
  transactionId?: string;
  categoryId?: string;
  description?: string;
  limit?: number;
}

/**
 * 标签建议响应
 */
export interface TagSuggestionsResponse {
  success: boolean;
  data: Array<{
    tag: TagResponseDto;
    confidence: number;
    reason: string;
  }>;
}

/**
 * 标签验证规则
 */
export const TagValidation = {
  name: {
    minLength: 1,
    maxLength: 50,
    pattern: /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$/, // 中文、英文、数字、空格、连字符、下划线
  },
  color: {
    pattern: /^#[0-9A-Fa-f]{6}$/, // 十六进制颜色值
  },
  description: {
    maxLength: 200,
  },
} as const;

/**
 * 默认颜色预设
 */
export const DEFAULT_TAG_COLORS = [
  '#3B82F6', // 蓝色
  '#EF4444', // 红色
  '#10B981', // 绿色
  '#F59E0B', // 黄色
  '#8B5CF6', // 紫色
  '#F97316', // 橙色
  '#06B6D4', // 青色
  '#84CC16', // 青绿色
] as const;

/**
 * 标签错误码
 */
export enum TagErrorCode {
  TAG_NOT_FOUND = 'TAG_NOT_FOUND',
  TAG_NAME_EXISTS = 'TAG_NAME_EXISTS',
  INVALID_COLOR_FORMAT = 'INVALID_COLOR_FORMAT',
  TAG_IN_USE = 'TAG_IN_USE',
  INSUFFICIENT_PERMISSION = 'INSUFFICIENT_PERMISSION',
  ACCOUNT_BOOK_NOT_FOUND = 'ACCOUNT_BOOK_NOT_FOUND',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  BATCH_OPERATION_FAILED = 'BATCH_OPERATION_FAILED',
  TAG_LIMIT_EXCEEDED = 'TAG_LIMIT_EXCEEDED',
  INVALID_TAG_NAME = 'INVALID_TAG_NAME',
}

/**
 * 标签错误消息
 */
export const TagErrorMessages = {
  [TagErrorCode.TAG_NOT_FOUND]: '标签不存在',
  [TagErrorCode.TAG_NAME_EXISTS]: '标签名称已存在',
  [TagErrorCode.INVALID_COLOR_FORMAT]: '颜色格式无效',
  [TagErrorCode.TAG_IN_USE]: '标签正在使用中，无法删除',
  [TagErrorCode.INSUFFICIENT_PERMISSION]: '权限不足',
  [TagErrorCode.ACCOUNT_BOOK_NOT_FOUND]: '账本不存在',
  [TagErrorCode.TRANSACTION_NOT_FOUND]: '交易记录不存在',
  [TagErrorCode.BATCH_OPERATION_FAILED]: '批量操作部分失败',
  [TagErrorCode.TAG_LIMIT_EXCEEDED]: '标签数量超出限制',
  [TagErrorCode.INVALID_TAG_NAME]: '标签名称格式无效',
} as const;
