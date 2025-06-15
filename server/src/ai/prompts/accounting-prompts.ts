import { PromptTemplate } from './base-prompts';

/**
 * 记账相关提示模板
 */
export const ACCOUNTING_PROMPTS: Record<string, PromptTemplate> = {
  /**
   * 交易分类提示模板
   */
  transactionClassification: {
    name: 'transactionClassification',
    description: '交易分类',
    systemMessage: '你是一个专业的财务分析助手，能够根据交易描述、金额和日期将交易分类到最合适的类别。请根据提供的类别列表选择最匹配的类别，并简要解释你的选择理由。',
    userMessageTemplate: `请将以下交易分类到最合适的类别：

交易描述: {description}
金额: {amount}
日期: {date}

可用类别:
{categories}

请以JSON格式返回结果，包含以下字段：
- categoryId: 选择的类别ID
- confidence: 你对这个分类的置信度(0-1)
- reasoning: 简要解释你为什么选择这个类别`,
    exampleInput: {
      description: '星巴克咖啡',
      amount: 35,
      date: '2023-05-15',
      categories: '1. 餐饮 2. 购物 3. 交通 4. 娱乐',
    },
    exampleOutput: `{
  "categoryId": "1",
  "confidence": 0.95,
  "reasoning": "这笔交易是在星巴克咖啡店消费，属于餐饮类别。金额35元符合咖啡饮品的价格范围。"
}`,
  },

  /**
   * 预算建议提示模板
   */
  budgetSuggestion: {
    name: 'budgetSuggestion',
    description: '预算建议',
    systemMessage: '你是一个专业的财务顾问，能够根据用户的历史消费数据提供个性化的预算建议。请分析用户的消费模式，并为每个类别提供合理的预算分配建议。',
    userMessageTemplate: `请根据以下历史消费数据，为用户提供预算建议：

历史消费数据(过去3个月):
{spendingData}

用户月收入: {income}
储蓄目标: {savingsGoal}

请为每个消费类别提供预算建议，并简要解释你的建议理由。`,
    exampleInput: {
      spendingData: '餐饮: 平均每月2000元\n购物: 平均每月1500元\n交通: 平均每月800元\n娱乐: 平均每月1200元',
      income: 10000,
      savingsGoal: '每月储蓄2000元',
    },
    exampleOutput: `基于你的历史消费数据和储蓄目标，以下是我的预算建议：

1. 餐饮: 1800元/月 (略微减少当前支出)
2. 购物: 1300元/月 (略微减少当前支出)
3. 交通: 800元/月 (保持当前水平)
4. 娱乐: 1000元/月 (略微减少当前支出)
5. 储蓄: 2000元/月 (达到你的储蓄目标)
6. 其他/应急: 3100元/月

总计: 10000元/月

建议理由:
- 我略微减少了餐饮、购物和娱乐的预算，因为这些类别有一些优化空间
- 交通预算保持不变，因为这通常是必要支出
- 预留了31%的收入用于其他支出和应急情况
- 这个预算方案可以让你达到每月储蓄2000元的目标`,
  },

  /**
   * 智能记账提示模板
   */
  smartAccounting: {
    name: 'smartAccounting',
    description: '智能记账',
    systemMessage: '你是一个专业的财务助手，能够从用户的自然语言描述中提取交易信息，包括金额、类别、日期、备注等。请尽可能准确地提取这些信息，并在信息不完整时做出合理的推断。',
    userMessageTemplate: `请从以下描述中提取交易信息：

用户描述: {input}

可用类别:
{categories}

请以JSON格式返回结果，包含以下字段：
- amount: 交易金额
- categoryId: 最匹配的类别ID
- date: 交易日期(YYYY-MM-DD格式，如果未提供则使用今天)
- note: 交易备注(基于描述提炼)
- isExpense: 是否为支出(true/false)`,
    exampleInput: {
      input: '昨天在沃尔玛买了日用品，花了128.5元',
      categories: '1. 餐饮 2. 购物 3. 日用 4. 交通',
    },
    exampleOutput: `{
  "amount": 128.5,
  "categoryId": "3",
  "date": "2023-05-14",
  "note": "沃尔玛日用品",
  "isExpense": true
}`,
  },
};

/**
 * 智能记账系统提示（优化版 - 减少token消耗）
 */
export const SMART_ACCOUNTING_SYSTEM_PROMPT = `
你是专业财务助手，从用户描述中提取记账信息。

分类列表：
{{categories}}

{{budgets}}

从描述中提取：
1. 金额（仅数字）
2. 日期（未提及用今日）
3. 分类（匹配上述分类）
4. 预算（若提及预算/人名则匹配）
5. 备注（简短描述）

返回JSON格式：
{
  "amount": 数字,
  "date": "YYYY-MM-DD",
  "categoryId": "分类ID",
  "categoryName": "分类名",
  "type": "EXPENSE/INCOME",
  "budgetName": "预算名(可选)",
  "confidence": 0-1小数,
  "note": "备注"
}

仅返回JSON，无其他文字。
`;

/**
 * 智能记账用户提示
 */
export const SMART_ACCOUNTING_USER_PROMPT = `
用户描述: {{description}}
当前日期: {{currentDate}}
`;
