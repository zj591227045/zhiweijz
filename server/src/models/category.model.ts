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
  { name: '日用', type: TransactionType.EXPENSE, icon: 'daily', isDefault: true },
  { name: '交通', type: TransactionType.EXPENSE, icon: 'transport', isDefault: true },
  { name: '运动', type: TransactionType.EXPENSE, icon: 'sports', isDefault: true },
  { name: '娱乐', type: TransactionType.EXPENSE, icon: 'entertainment', isDefault: true },
  { name: '通讯', type: TransactionType.EXPENSE, icon: 'communication', isDefault: true },
  { name: '服饰', type: TransactionType.EXPENSE, icon: 'clothing', isDefault: true },
  { name: '美容', type: TransactionType.EXPENSE, icon: 'beauty', isDefault: true },
  { name: '居家', type: TransactionType.EXPENSE, icon: 'home', isDefault: true },
  { name: '孩子', type: TransactionType.EXPENSE, icon: 'child', isDefault: true },
  { name: '长辈', type: TransactionType.EXPENSE, icon: 'elder', isDefault: true },
  { name: '社交', type: TransactionType.EXPENSE, icon: 'social', isDefault: true },
  { name: '旅行', type: TransactionType.EXPENSE, icon: 'travel', isDefault: true },
  { name: '数码', type: TransactionType.EXPENSE, icon: 'digital', isDefault: true },
  { name: '汽车', type: TransactionType.EXPENSE, icon: 'car', isDefault: true },
  { name: '医疗', type: TransactionType.EXPENSE, icon: 'medical', isDefault: true },
  { name: '还款', type: TransactionType.EXPENSE, icon: 'repayment', isDefault: true },
  { name: '保险', type: TransactionType.EXPENSE, icon: 'insurance', isDefault: true },
  { name: '学习', type: TransactionType.EXPENSE, icon: 'education', isDefault: true },
  { name: '办公', type: TransactionType.EXPENSE, icon: 'office', isDefault: true },
  { name: '维修', type: TransactionType.EXPENSE, icon: 'repair', isDefault: true },
  { name: '利息', type: TransactionType.EXPENSE, icon: 'interest', isDefault: true },

  // 收入分类
  { name: '工资', type: TransactionType.INCOME, icon: 'salary', isDefault: true },
  { name: '兼职', type: TransactionType.INCOME, icon: 'part-time', isDefault: true },
  { name: '理财', type: TransactionType.INCOME, icon: 'investment', isDefault: true },
  { name: '奖金', type: TransactionType.INCOME, icon: 'bonus', isDefault: true },
  { name: '提成', type: TransactionType.INCOME, icon: 'commission', isDefault: true },
  { name: '其他', type: TransactionType.INCOME, icon: 'other', isDefault: true }
];
