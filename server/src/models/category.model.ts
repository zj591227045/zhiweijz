import { Category, TransactionType } from '@prisma/client';

/**
 * 分类创建DTO
 */
export interface CreateCategoryDto {
  name: string;
  type: TransactionType;
  icon?: string;
  familyId?: string;
  isDefault?: boolean;
}

/**
 * 分类更新DTO
 */
export interface UpdateCategoryDto {
  name?: string;
  icon?: string;
  isDefault?: boolean;
}

/**
 * 分类响应DTO
 */
export interface CategoryResponseDto {
  id: string;
  name: string;
  type: TransactionType;
  icon?: string;
  userId?: string;
  familyId?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 将分类实体转换为响应DTO
 */
export function toCategoryResponseDto(category: Category): CategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon || undefined,
    userId: category.userId || undefined,
    familyId: category.familyId || undefined,
    isDefault: category.isDefault,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/**
 * 默认分类数据
 */
export const defaultCategories: CreateCategoryDto[] = [
  // 支出分类
  { name: '餐饮', type: TransactionType.EXPENSE, icon: 'restaurant', isDefault: true },
  { name: '购物', type: TransactionType.EXPENSE, icon: 'shopping', isDefault: true },
  { name: '交通', type: TransactionType.EXPENSE, icon: 'transport', isDefault: true },
  { name: '住房', type: TransactionType.EXPENSE, icon: 'home', isDefault: true },
  { name: '娱乐', type: TransactionType.EXPENSE, icon: 'entertainment', isDefault: true },
  { name: '医疗', type: TransactionType.EXPENSE, icon: 'medical', isDefault: true },
  { name: '教育', type: TransactionType.EXPENSE, icon: 'education', isDefault: true },
  { name: '旅行', type: TransactionType.EXPENSE, icon: 'travel', isDefault: true },
  { name: '通讯', type: TransactionType.EXPENSE, icon: 'communication', isDefault: true },
  { name: '服装', type: TransactionType.EXPENSE, icon: 'clothing', isDefault: true },
  { name: '日用品', type: TransactionType.EXPENSE, icon: 'daily', isDefault: true },
  { name: '其他支出', type: TransactionType.EXPENSE, icon: 'other', isDefault: true },
  
  // 收入分类
  { name: '工资', type: TransactionType.INCOME, icon: 'salary', isDefault: true },
  { name: '奖金', type: TransactionType.INCOME, icon: 'bonus', isDefault: true },
  { name: '投资收益', type: TransactionType.INCOME, icon: 'investment', isDefault: true },
  { name: '兼职收入', type: TransactionType.INCOME, icon: 'part-time', isDefault: true },
  { name: '礼金', type: TransactionType.INCOME, icon: 'gift', isDefault: true },
  { name: '退款', type: TransactionType.INCOME, icon: 'refund', isDefault: true },
  { name: '其他收入', type: TransactionType.INCOME, icon: 'other', isDefault: true },
];
