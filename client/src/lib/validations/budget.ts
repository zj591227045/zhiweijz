import { z } from 'zod';

// 预算周期枚举
export const BudgetPeriodEnum = z.enum(['MONTHLY', 'YEARLY']);

// 分类预算验证规则
export const categoryBudgetSchema = z.object({
  categoryId: z.string({
    required_error: '请选择分类',
  }),
  amount: z.number({
    required_error: '请输入预算金额',
  }).min(0.01, '预算金额必须大于0'),
});

// 预算表单验证规则
export const budgetFormSchema = z.object({
  // 预算名称：必填，字符串
  name: z.string({
    required_error: '请输入预算名称',
  }).min(1, '预算名称不能为空').max(50, '预算名称不能超过50个字符'),

  // 预算金额：必填，数值类型，大于等于0
  amount: z.number({
    required_error: '请输入预算金额',
  }).min(0, '预算金额不能为负数'),

  // 预算周期：必填，枚举值"MONTHLY"或"YEARLY"
  periodType: BudgetPeriodEnum,

  // 开始日期：必填，有效的日期格式
  startDate: z.string({
    required_error: '请选择开始日期',
  }),

  // 结束日期：必填，有效的日期格式
  endDate: z.string({
    required_error: '请选择结束日期',
  }),

  // 账本ID：必填，字符串
  accountBookId: z.string({
    required_error: '请选择账本',
  }),

  // 启用分类预算：布尔值
  enableCategoryBudget: z.boolean(),

  // 自动计算总预算：布尔值
  isAutoCalculated: z.boolean().optional(),

  // 分类预算列表：如果启用分类预算，则必填且至少有一项
  categoryBudgets: z.array(categoryBudgetSchema).optional(),

  // 启用结转：布尔值
  enableRollover: z.boolean(),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  },
  {
    message: '结束日期必须晚于或等于开始日期',
    path: ['endDate'],
  }
).refine(
  (data) => {
    if (data.enableCategoryBudget) {
      return data.categoryBudgets && data.categoryBudgets.length > 0;
    }
    return true;
  },
  {
    message: '启用分类预算时，至少需要添加一个分类预算',
    path: ['categoryBudgets'],
  }
).refine(
  (data) => {
    // 如果启用了自动计算总预算，则不需要验证分类预算总和
    if (data.isAutoCalculated) {
      return true;
    }

    // 如果启用分类预算且总预算金额大于0，则验证分类预算总和不超过总预算金额
    if (data.enableCategoryBudget && data.categoryBudgets && data.amount > 0) {
      const totalCategoryBudget = data.categoryBudgets.reduce(
        (sum, budget) => sum + budget.amount,
        0
      );
      return totalCategoryBudget <= data.amount;
    }
    return true;
  },
  {
    message: '分类预算总和不能超过总预算金额',
    path: ['categoryBudgets'],
  }
);

// 预算表单值类型
export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

// 创建预算DTO类型
export interface CreateBudgetDto {
  name: string;
  amount: number;
  period: 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string;
  accountBookId: string;
  rollover: boolean;
  enableCategoryBudget: boolean;
  isAutoCalculated?: boolean;
  categoryBudgets?: {
    categoryId: string;
    amount: number;
  }[];
}

// 更新预算DTO类型
export interface UpdateBudgetDto extends Partial<CreateBudgetDto> {
  id: string;
}
