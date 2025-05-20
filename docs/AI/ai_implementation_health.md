# 只为记账 - 财务健康评估实现

本文档详细描述了"只为记账"应用中财务健康评估功能的实现方案，采用LangGraph+OpenAI API的方式，并支持每个用户和账本单独设置LLM提供商。

## 功能目标

财务健康评估功能旨在：

1. 评估用户的整体财务状况
2. 计算关键财务指标
3. 提供个性化的改进建议
4. 跟踪财务健康状况的变化

## 财务健康指标

我们将计算以下关键财务指标：

1. **收入/支出比率**：收入与支出的比例，理想值>1.5
2. **储蓄率**：储蓄占收入的比例，理想值>20%
3. **紧急资金覆盖率**：紧急资金可以覆盖的月数，理想值>3个月
4. **债务/收入比率**：债务占收入的比例，理想值<36%
5. **必要支出比率**：必要支出占总支出的比例，理想值<50%
6. **预算执行率**：实际支出与预算的符合程度，理想值>80%
7. **财务多样性**：收入和资产的多样性，理想值>3个来源

## 实现方案

我们将使用LangGraph构建财务健康评估工作流，结合基础指标计算和LLM的智能分析：

### 1. 财务数据收集与指标计算

首先收集用户的财务数据并计算基础指标：

```typescript
// server/src/ai/analyzers/financial-health-analyzer.ts
import { Transaction, Category, Budget } from '@server/prisma/client';

export interface FinancialHealthMetrics {
  incomeExpenseRatio: number;
  savingsRate: number;
  emergencyFundCoverage: number;
  debtToIncomeRatio: number;
  necessaryExpenseRatio: number;
  budgetAdherenceRate: number;
  financialDiversity: number;
  
  // 指标状态评估
  metrics: Array<{
    name: string;
    value: number;
    benchmark: number;
    status: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
  }>;
  
  // 总体评分
  overallScore: number;
}

export class FinancialHealthAnalyzer {
  public calculateMetrics(
    transactions: Transaction[],
    categories: Map<string, Category>,
    budgets: Budget[],
    months: number = 6
  ): FinancialHealthMetrics {
    // 计算分析开始日期
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - months);
    
    // 过滤时间范围内的交易
    const recentTransactions = transactions.filter(t => 
      t.date >= startDate && t.date <= today
    );
    
    // 计算收入和支出
    const incomeTransactions = recentTransactions.filter(t => t.type === 'INCOME');
    const expenseTransactions = recentTransactions.filter(t => t.type === 'EXPENSE');
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    
    // 计算月平均收入和支出
    const monthlyIncome = totalIncome / months;
    const monthlyExpense = totalExpense / months;
    
    // 计算收入/支出比率
    const incomeExpenseRatio = monthlyIncome > 0 ? monthlyIncome / monthlyExpense : 0;
    
    // 计算储蓄率
    const monthlySavings = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
    
    // 计算紧急资金覆盖率（假设用户有紧急资金数据）
    // 这里使用一个假设的紧急资金数据，实际应用中应从用户数据获取
    const emergencyFund = monthlySavings * 3; // 假设用户已存了3个月的储蓄
    const emergencyFundCoverage = monthlyExpense > 0 ? emergencyFund / monthlyExpense : 0;
    
    // 计算债务/收入比率（假设用户有债务数据）
    // 这里使用一个假设的债务数据，实际应用中应从用户数据获取
    const monthlyDebtPayment = monthlyExpense * 0.2; // 假设20%的支出是债务还款
    const debtToIncomeRatio = monthlyIncome > 0 ? monthlyDebtPayment / monthlyIncome : 0;
    
    // 计算必要支出比率
    const necessaryCategories = ['住房', '水电', '食品', '医疗', '交通'];
    const necessaryExpense = expenseTransactions
      .filter(t => {
        const category = categories.get(t.categoryId);
        return category && necessaryCategories.includes(category.name);
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const necessaryExpenseRatio = totalExpense > 0 ? necessaryExpense / totalExpense : 0;
    
    // 计算预算执行率
    const budgetAdherenceRate = this.calculateBudgetAdherence(budgets, expenseTransactions);
    
    // 计算财务多样性（收入来源数量）
    const incomeCategories = new Set(incomeTransactions.map(t => t.categoryId));
    const financialDiversity = incomeCategories.size;
    
    // 评估各指标状态
    const metrics = [
      {
        name: '收入/支出比率',
        value: incomeExpenseRatio,
        benchmark: 1.5,
        status: this.evaluateMetricStatus(incomeExpenseRatio, 1.5, 1.2, 1.0)
      },
      {
        name: '储蓄率',
        value: savingsRate,
        benchmark: 0.2,
        status: this.evaluateMetricStatus(savingsRate, 0.2, 0.1, 0.05)
      },
      {
        name: '紧急资金覆盖率',
        value: emergencyFundCoverage,
        benchmark: 3,
        status: this.evaluateMetricStatus(emergencyFundCoverage, 3, 1.5, 0.5)
      },
      {
        name: '债务/收入比率',
        value: debtToIncomeRatio,
        benchmark: 0.36,
        status: this.evaluateMetricStatus(1 - debtToIncomeRatio, 0.64, 0.5, 0.3)
      },
      {
        name: '必要支出比率',
        value: necessaryExpenseRatio,
        benchmark: 0.5,
        status: this.evaluateMetricStatus(1 - necessaryExpenseRatio, 0.5, 0.3, 0.1)
      },
      {
        name: '预算执行率',
        value: budgetAdherenceRate,
        benchmark: 0.8,
        status: this.evaluateMetricStatus(budgetAdherenceRate, 0.8, 0.6, 0.4)
      },
      {
        name: '财务多样性',
        value: financialDiversity,
        benchmark: 3,
        status: this.evaluateMetricStatus(financialDiversity / 3, 1, 0.67, 0.33)
      }
    ];
    
    // 计算总体评分（0-100）
    const weights = [0.2, 0.2, 0.15, 0.15, 0.1, 0.1, 0.1]; // 各指标权重
    const statusScores = {
      'EXCELLENT': 1,
      'GOOD': 0.75,
      'NEEDS_IMPROVEMENT': 0.4,
      'CRITICAL': 0.1
    };
    
    const overallScore = metrics.reduce((score, metric, index) => {
      return score + statusScores[metric.status] * weights[index] * 100;
    }, 0);
    
    return {
      incomeExpenseRatio,
      savingsRate,
      emergencyFundCoverage,
      debtToIncomeRatio,
      necessaryExpenseRatio,
      budgetAdherenceRate,
      financialDiversity,
      metrics,
      overallScore
    };
  }
  
  private evaluateMetricStatus(
    value: number,
    excellentThreshold: number,
    goodThreshold: number,
    needsImprovementThreshold: number
  ): 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL' {
    if (value >= excellentThreshold) return 'EXCELLENT';
    if (value >= goodThreshold) return 'GOOD';
    if (value >= needsImprovementThreshold) return 'NEEDS_IMPROVEMENT';
    return 'CRITICAL';
  }
  
  private calculateBudgetAdherence(budgets: Budget[], transactions: Transaction[]): number {
    if (budgets.length === 0) return 0;
    
    let totalAdherence = 0;
    let validBudgets = 0;
    
    budgets.forEach(budget => {
      // 找出该预算类别的所有交易
      const budgetTransactions = transactions.filter(t => 
        t.categoryId === budget.categoryId &&
        t.date >= budget.startDate &&
        t.date <= budget.endDate
      );
      
      // 计算实际支出
      const actualSpending = budgetTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // 计算预算执行率
      const budgetAmount = Number(budget.amount);
      if (budgetAmount > 0) {
        // 如果实际支出小于预算，则执行率为100%；否则为预算/实际支出
        const adherence = actualSpending <= budgetAmount ? 1 : budgetAmount / actualSpending;
        totalAdherence += adherence;
        validBudgets++;
      }
    });
    
    return validBudgets > 0 ? totalAdherence / validBudgets : 0;
  }
}
```

### 2. LangGraph工作流

使用LangGraph构建财务健康评估工作流：

```typescript
// server/src/ai/langgraph/financial-health-advisor.ts
import { createGraph } from 'langchain/langgraph';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatAnthropic } from 'langchain/chat_models/anthropic';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { LLMProviderService } from '../../services/llm-provider.service';
import { Transaction, Category, Budget } from '@server/prisma/client';
import { FinancialHealthAnalyzer, FinancialHealthMetrics } from '../analyzers/financial-health-analyzer';

interface FinancialHealthState {
  transactions: Transaction[];
  categories: Map<string, Category>;
  budgets: Budget[];
  months: number;
  userId: string;
  accountId?: string;
  accountType?: 'personal' | 'family';
  healthMetrics?: FinancialHealthMetrics;
  suggestions?: any[];
  insights?: string;
}

export class FinancialHealthAdvisor {
  private llmProviderService: LLMProviderService;
  private financialHealthAnalyzer: FinancialHealthAnalyzer;
  
  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
    this.financialHealthAnalyzer = new FinancialHealthAnalyzer();
  }
  
  private async getLLM(userId: string, accountId?: string, accountType?: 'personal' | 'family') {
    // 获取用户或账本的LLM设置
    const llmSettings = await this.llmProviderService.getLLMSettings(userId, accountId, accountType);
    
    // 根据提供商创建相应的LLM实例
    switch (llmSettings.provider) {
      case 'anthropic':
        return new ChatAnthropic({
          apiKey: llmSettings.apiKey,
          modelName: llmSettings.model,
          temperature: llmSettings.temperature,
          maxTokens: llmSettings.maxTokens,
        });
      case 'openai':
      default:
        return new ChatOpenAI({
          apiKey: llmSettings.apiKey,
          modelName: llmSettings.model,
          temperature: llmSettings.temperature,
          maxTokens: llmSettings.maxTokens,
        });
    }
  }
  
  public async evaluateFinancialHealth(
    transactions: Transaction[],
    categories: Map<string, Category>,
    budgets: Budget[],
    months: number = 6,
    userId: string,
    accountId?: string,
    accountType?: 'personal' | 'family'
  ) {
    // 创建LangGraph工作流
    const workflow = createGraph<FinancialHealthState>({
      channels: {
        transactions: {},
        categories: {},
        budgets: {},
        months: {},
        userId: {},
        accountId: {},
        accountType: {},
        healthMetrics: {},
        suggestions: {},
        insights: {},
      },
    });
    
    // 添加指标计算节点
    workflow.addNode("calculateMetrics", async (state) => {
      const healthMetrics = this.financialHealthAnalyzer.calculateMetrics(
        state.transactions,
        state.categories,
        state.budgets,
        state.months
      );
      
      return { ...state, healthMetrics };
    });
    
    // 添加建议生成节点
    workflow.addNode("generateSuggestions", async (state) => {
      if (!state.healthMetrics) return state;
      
      const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
      
      // 构建系统提示
      const systemPrompt = `
        你是一个专业的财务顾问。你的任务是基于用户的财务健康指标，提供改进建议。
        
        请为用户提供具体的、可操作的建议，帮助他们改善财务状况。
        你的回答必须是一个JSON数组，每个元素包含以下字段：
        - category: 建议类别 (SAVINGS, BUDGET, DEBT, INCOME, EXPENSE, EMERGENCY_FUND, INVESTMENT)
        - title: 建议标题
        - description: 详细描述
        - actionItems: 具体行动步骤数组
        - priority: 优先级 (HIGH, MEDIUM, LOW)
        - impact: 预期影响 (HIGH, MEDIUM, LOW)
        - timeframe: 实施时间框架 (IMMEDIATE, SHORT_TERM, LONG_TERM)
        
        只返回JSON数组，不要有其他文字。
      `;
      
      // 构建用户提示
      const userPrompt = `
        以下是用户的财务健康指标，请提供改进建议：
        
        总体评分: ${state.healthMetrics.overallScore.toFixed(2)}/100
        
        详细指标:
        ${state.healthMetrics.metrics.map(m => 
          `- ${m.name}: ${m.value.toFixed(2)} (基准: ${m.benchmark.toFixed(2)}, 状态: ${m.status})`
        ).join('\n')}
        
        请特别关注状态为"NEEDS_IMPROVEMENT"和"CRITICAL"的指标。
      `;
      
      try {
        // 调用LLM
        const response = await llm.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(userPrompt)
        ]);
        
        // 解析响应
        const content = response.content.toString();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          return { ...state, suggestions };
        }
      } catch (error) {
        console.error('生成财务建议错误:', error);
      }
      
      return { ...state, suggestions: [] };
    });
    
    // 添加洞察生成节点
    workflow.addNode("generateInsights", async (state) => {
      if (!state.healthMetrics || !state.suggestions) {
        return state;
      }
      
      const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
      
      // 构建系统提示
      const systemPrompt = `
        你是一个专业的财务顾问。你的任务是基于用户的财务健康评估和建议，提供整体洞察。
        
        请用简洁、友好的语言，总结用户的财务状况，并提供鼓励性的反馈。
        你的回答应该包括：
        1. 对用户财务状况的总体评价
        2. 用户财务的主要优势和劣势
        3. 最重要的改进方向
        4. 鼓励性的结束语
        
        请使用第二人称（"您"）直接与用户交流。
      `;
      
      // 构建用户提示
      const userPrompt = `
        以下是用户的财务健康评估结果，请提供整体洞察：
        
        总体评分: ${state.healthMetrics.overallScore.toFixed(2)}/100
        
        详细指标:
        ${state.healthMetrics.metrics.map(m => 
          `- ${m.name}: ${m.value.toFixed(2)} (基准: ${m.benchmark.toFixed(2)}, 状态: ${m.status})`
        ).join('\n')}
        
        主要建议:
        ${state.suggestions.slice(0, 3).map((s, i) => 
          `${i+1}. ${s.title} (优先级: ${s.priority}, 影响: ${s.impact})`
        ).join('\n')}
      `;
      
      try {
        // 调用LLM
        const response = await llm.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(userPrompt)
        ]);
        
        // 获取洞察
        const insights = response.content.toString();
        return { ...state, insights };
      } catch (error) {
        console.error('生成洞察错误:', error);
        return { ...state, insights: "无法生成洞察，请稍后再试。" };
      }
    });
    
    // 设置工作流
    workflow.addEdge("calculateMetrics", "generateSuggestions");
    workflow.addEdge("generateSuggestions", "generateInsights");
    
    workflow.setEntryPoint("calculateMetrics");
    
    // 执行工作流
    const initialState: FinancialHealthState = {
      transactions,
      categories,
      budgets,
      months,
      userId,
      accountId,
      accountType
    };
    
    const result = await workflow.invoke(initialState);
    
    return {
      healthMetrics: result.healthMetrics,
      suggestions: result.suggestions || [],
      insights: result.insights || ""
    };
  }
}
```

## API设计

### 获取财务健康评估API

```
GET /api/ai/financial-health
```

**查询参数**：
- `months`: 评估的月数 (默认6)
- `accountId`: 账本ID (可选)
- `accountType`: 账本类型 (personal, family) (可选)

**响应**:
```json
{
  "healthMetrics": {
    "overallScore": 75,
    "metrics": [
      {
        "name": "收入/支出比率",
        "value": 1.6,
        "benchmark": 1.5,
        "status": "EXCELLENT"
      },
      {
        "name": "储蓄率",
        "value": 0.12,
        "benchmark": 0.2,
        "status": "NEEDS_IMPROVEMENT"
      },
      {
        "name": "紧急资金覆盖率",
        "value": 1.5,
        "benchmark": 3,
        "status": "NEEDS_IMPROVEMENT"
      },
      {
        "name": "债务/收入比率",
        "value": 0.25,
        "benchmark": 0.36,
        "status": "GOOD"
      },
      {
        "name": "必要支出比率",
        "value": 0.45,
        "benchmark": 0.5,
        "status": "GOOD"
      },
      {
        "name": "预算执行率",
        "value": 0.85,
        "benchmark": 0.8,
        "status": "EXCELLENT"
      },
      {
        "name": "财务多样性",
        "value": 2,
        "benchmark": 3,
        "status": "NEEDS_IMPROVEMENT"
      }
    ]
  },
  "suggestions": [
    {
      "category": "SAVINGS",
      "title": "增加储蓄率",
      "description": "您当前的储蓄率为12%，低于建议的20%。增加储蓄率将帮助您建立更强的财务安全网。",
      "actionItems": [
        "设置自动转账，将收入的20%直接存入储蓄账户",
        "减少非必要支出，如餐厅就餐和娱乐活动",
        "考虑增加额外收入来源"
      ],
      "priority": "HIGH",
      "impact": "HIGH",
      "timeframe": "IMMEDIATE"
    },
    {
      "category": "EMERGENCY_FUND",
      "title": "建立充足的紧急资金",
      "description": "您的紧急资金只能覆盖1.5个月的支出，低于建议的3个月。增加紧急资金将帮助您应对突发情况。",
      "actionItems": [
        "将储蓄的一部分专门用于紧急资金",
        "设定目标，在6个月内将紧急资金增加到3个月支出",
        "将紧急资金存入高利率但易于取用的账户"
      ],
      "priority": "HIGH",
      "impact": "MEDIUM",
      "timeframe": "SHORT_TERM"
    },
    {
      "category": "INCOME",
      "title": "增加收入多样性",
      "description": "您当前只有2个收入来源，低于建议的3个。增加收入来源将提高财务稳定性。",
      "actionItems": [
        "探索兼职或自由职业机会",
        "考虑投资产生被动收入",
        "发展新技能以增加职业机会"
      ],
      "priority": "MEDIUM",
      "impact": "HIGH",
      "timeframe": "LONG_TERM"
    }
  ],
  "insights": "您的财务健康状况总体良好，评分为75分。您在收入/支出比率和预算执行方面表现出色，这表明您有良好的收支平衡和财务纪律。\n\n您的主要优势是收入足够覆盖支出，并且您能够很好地遵守预算计划。必要支出比率和债务水平也处于健康范围内。\n\n需要改进的领域包括储蓄率、紧急资金和收入多样性。建议您优先增加储蓄率至少到20%，并逐步建立足够3个月支出的紧急资金。长期来看，发展额外的收入来源将帮助您增强财务稳定性。\n\n总的来说，您已经建立了良好的财务基础，只需要在几个关键领域加强，就能显著提高您的财务安全感和长期稳定性。继续保持良好的预算习惯，同时逐步实施我们的建议，您的财务健康将会持续改善。"
}
```

## 实现注意事项

1. **数据隐私**：
   - 确保只发送必要的财务数据到LLM
   - 不包含敏感的个人识别信息

2. **错误处理**：
   - 实施健壮的错误处理机制
   - 当LLM调用失败时提供合理的回退策略

3. **结果验证**：
   - 验证LLM返回的建议是否合理
   - 确保建议不会导致用户做出不适当的财务决策

4. **用户反馈**：
   - 收集用户对财务健康评估的反馈
   - 使用反馈改进评估算法和建议质量

5. **定期更新**：
   - 定期重新评估用户的财务健康状况
   - 跟踪指标随时间的变化
   - 提供进度报告和改进建议
