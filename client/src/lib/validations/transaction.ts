import * as z from "zod";

// 交易类型枚举
export const TransactionTypeEnum = z.enum(["EXPENSE", "INCOME"]);

// 创建交易表单验证规则
export const transactionFormSchema = z.object({
  // 金额：必填，数值类型，大于0
  amount: z.string().min(1, "金额不能为空").refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "请输入有效的金额" }
  ),
  
  // 类型：必填，枚举值"EXPENSE"或"INCOME"
  type: TransactionTypeEnum,
  
  // 分类ID：必填，字符串
  categoryId: z.string({
    required_error: "请选择分类",
  }),
  
  // 描述：选填，字符串
  description: z.string().optional(),
  
  // 日期：必填，有效的日期格式
  date: z.date({
    required_error: "请选择日期",
  }),
  
  // 时间：必填，有效的时间格式
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "请输入有效的时间格式 HH:MM"),
  
  // 账本ID：必填，字符串
  accountBookId: z.string({
    required_error: "请选择账本",
  }),
  
  // 家庭ID：选填，字符串
  familyId: z.string().optional().nullable(),
  
  // 家庭成员ID：选填，字符串
  familyMemberId: z.string().optional().nullable(),
});

// 交易表单数据类型
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
