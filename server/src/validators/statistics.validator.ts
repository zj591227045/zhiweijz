import Joi from 'joi';

/**
 * 日期范围查询参数
 */
interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
  familyId?: string;
  accountBookId?: string;
  budgetId?: string;
  budgetIds?: string | string[];
  type?: string;
  categoryIds?: string;
  tagIds?: string | string[];
}

/**
 * 月份查询参数
 */
interface MonthQuery {
  month?: string;
  familyId?: string;
  accountBookId?: string;
  budgetType?: string;
}

/**
 * 验证日期范围查询参数
 */
export function validateDateRangeQuery(query: any) {
  const schema = Joi.object<DateRangeQuery>({
    startDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .messages({
        'string.pattern.base': '开始日期格式应为 YYYY-MM-DD',
      }),
    endDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .messages({
        'string.pattern.base': '结束日期格式应为 YYYY-MM-DD',
      }),
    groupBy: Joi.string().valid('day', 'week', 'month', 'category').messages({
      'any.only': '分组方式必须是 day, week, month 或 category',
    }),
    familyId: Joi.string().uuid().messages({
      'string.guid': '家庭ID必须是有效的UUID',
    }),
    accountBookId: Joi.string().uuid().messages({
      'string.guid': '账本ID必须是有效的UUID',
    }),
    budgetId: Joi.alternatives()
      .try(
        Joi.string().uuid(),
        Joi.string().valid('NO_BUDGET'),
        Joi.string().pattern(/^aggregated_/)
      )
      .messages({
        'string.guid': '预算ID必须是有效的UUID',
        'any.only': '预算ID必须是有效的UUID、NO_BUDGET或聚合预算ID',
      }),
    budgetIds: Joi.alternatives()
      .try(Joi.string().uuid(), Joi.array().items(Joi.string().uuid()))
      .messages({
        'string.guid': '预算ID必须是有效的UUID',
        'array.base': '预算ID必须是UUID字符串或UUID数组',
      }),
    type: Joi.string().valid('income', 'expense').messages({
      'any.only': '类型必须是 income 或 expense',
    }),
    categoryIds: Joi.string().messages({
      'string.base': 'categoryIds必须是有效的字符串',
    }),
    tagIds: Joi.alternatives()
      .try(Joi.string().uuid(), Joi.array().items(Joi.string().uuid()))
      .messages({
        'string.guid': '标签ID必须是有效的UUID',
        'array.base': '标签ID必须是UUID字符串或UUID数组',
      }),
  });

  return schema.validate(query);
}

/**
 * 验证月份查询参数
 */
export function validateMonthQuery(query: any) {
  const schema = Joi.object<MonthQuery>({
    month: Joi.string()
      .pattern(/^\d{4}-\d{2}$/)
      .messages({
        'string.pattern.base': '月份格式应为 YYYY-MM',
      }),
    familyId: Joi.string().uuid().messages({
      'string.guid': '家庭ID必须是有效的UUID',
    }),
    accountBookId: Joi.string().uuid().messages({
      'string.guid': '账本ID必须是有效的UUID',
    }),
    budgetType: Joi.string().valid('PERSONAL', 'GENERAL').messages({
      'any.only': '预算类型必须是 PERSONAL 或 GENERAL',
    }),
  });

  return schema.validate(query);
}
