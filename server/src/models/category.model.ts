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
  displayOrder?: number;
  isHidden?: boolean;
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
 * 默认分类数据（包含默认排序）
 */
export const defaultCategories: CreateCategoryDto[] = [
  // 支出分类（按指定顺序）
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

  // 收入分类（按指定顺序）
  { name: '工资', type: TransactionType.INCOME, icon: 'salary', isDefault: true },
  { name: '兼职', type: TransactionType.INCOME, icon: 'part-time', isDefault: true },
  { name: '理财', type: TransactionType.INCOME, icon: 'investment', isDefault: true },
  { name: '奖金', type: TransactionType.INCOME, icon: 'bonus', isDefault: true },
  { name: '提成', type: TransactionType.INCOME, icon: 'commission', isDefault: true },
  { name: '其他', type: TransactionType.INCOME, icon: 'other', isDefault: true }
];

/**
 * 默认分类排序映射
 */
export const defaultCategoryOrder: Record<string, Record<string, number>> = {
  [TransactionType.EXPENSE]: {
    '餐饮': 100,
    '购物': 200,
    '日用': 300,
    '交通': 400,
    '运动': 500,
    '娱乐': 600,
    '通讯': 700,
    '服饰': 800,
    '美容': 900,
    '居家': 1000,
    '孩子': 1100,
    '长辈': 1200,
    '社交': 1300,
    '旅行': 1400,
    '数码': 1500,
    '汽车': 1600,
    '医疗': 1700,
    '还款': 1800,
    '保险': 1900,
    '学习': 2000,
    '办公': 2100,
    '维修': 2200,
    '利息': 2300
  },
  [TransactionType.INCOME]: {
    '工资': 100,
    '兼职': 200,
    '理财': 300,
    '奖金': 400,
    '提成': 500,
    '其他': 600
  }
};
