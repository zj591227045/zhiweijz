# 只为记账 - 预算建议系统实现 (修订版)

根据最新要求，我们将修改预算建议系统的实现方案，采用LangGraph+OpenAI API的方式，并支持每个用户和账本单独设置LLM提供商。

## 功能目标

预算建议系统旨在：

1. 基于用户的历史消费数据提供个性化的预算建议
2. 考虑用户的收入和财务目标
3. 为不同消费类别提供合理的预算分配
4. 提供可操作的预算优化建议

## 实现方案

我们将使用LangGraph构建预算建议工作流，结合历史数据分析和LLM的智能建议：

### 1. 历史数据分析

首先分析用户的历史消费数据，提取关键指标：

```typescript
// server/src/ai/analyzers/budget-data-analyzer.ts
import { Transaction, Category, Budget } from '@server/prisma/client';

export interface BudgetAnalysisData {
  // 收入数据
  averageMonthlyIncome: number;
  incomeStability: 'HIGH' | 'MEDIUM' | 'LOW';
  
  // 支出数据
  averageMonthlySpendings: number;
  spendingByCategory: Array<{
    categoryId: string;
    categoryName: string;
    averageMonthlyAmount: number;
    percentageOfTotal: number;
    monthlyVariation: number; // 月度波动
  }>;
  
  // 现有预算数据
  existingBudgets: Array<{
    categoryId: string;
    categoryName: string;
    budgetAmount: number;
    actualSpending: number;
    difference: number;
    percentUsed: number;
  }>;
  
  // 储蓄数据
  averageMonthlySavings: number;
  savingsRate: number; // 储蓄率
}

export class BudgetDataAnalyzer {
  public analyze(
    transactions: Transaction[],
    categories: Map<string, Category>,
    existingBudgets: Budget[],
    months: number = 3
  ): BudgetAnalysisData {
    // 计算分析开始日期
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - months);
    
    // 过滤时间范围内的交易
    const recentTransactions = transactions.filter(t => 
      t.date >= startDate && t.date <= today
    );
    
    // 按月分组交易
    const monthlyTransactions = this.groupTransactionsByMonth(recentTransactions);
    
    // 计算月平均收入
    const incomeTransactions = recentTransactions.filter(t => t.type === 'INCOME');
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const averageMonthlyIncome = totalIncome / months;
    
    // 计算收入稳定性
    const incomeStability = this.calculateIncomeStability(incomeTransactions, months);
    
    // 计算月平均支出
    const expenseTransactions = recentTransactions.filter(t => t.type === 'EXPENSE');
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const averageMonthlySpendings = totalExpense / months;
    
    // 计算各类别支出
    const spendingByCategory = this.calculateSpendingByCategory(
      expenseTransactions, 
      categories, 
      monthlyTransactions,
      averageMonthlySpendings
    );
    
    // 分析现有预算
    const existingBudgetsData = this.analyzeExistingBudgets(
      existingBudgets,
      expenseTransactions,
      categories
    );
    
    // 计算储蓄数据
    const averageMonthlySavings = averageMonthlyIncome - averageMonthlySpendings;
    const savingsRate = averageMonthlyIncome > 0 ? averageMonthlySavings / averageMonthlyIncome : 0;
    
    return {
      averageMonthlyIncome,
      incomeStability,
      averageMonthlySpendings,
      spendingByCategory,
      existingBudgets: existingBudgetsData,
      averageMonthlySavings,
      savingsRate
    };
  }
  
  private groupTransactionsByMonth(transactions: Transaction[]) {
    const monthlyTransactions = new Map<string, Transaction[]>();
    
    transactions.forEach(transaction => {
      const date = transaction.date;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyTransactions.has(monthKey)) {
        monthlyTransactions.set(monthKey, []);
      }
      
      monthlyTransactions.get(monthKey)?.push(transaction);
    });
    
    return monthlyTransactions;
  }
  
  private calculateIncomeStability(incomeTransactions: Transaction[], months: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    // 如果没有足够的收入交易，返回低稳定性
    if (incomeTransactions.length < months) {
      return 'LOW';
    }
    
    // 按月分组收入
    const monthlyIncome = new Map<string, number>();
    
    incomeTransactions.forEach(transaction => {
      const date = transaction.date;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const currentAmount = monthlyIncome.get(monthKey) || 0;
      monthlyIncome.set(monthKey, currentAmount + Number(transaction.amount));
    });
    
    // 计算月收入的变异系数 (CV = 标准差 / 平均值)
    const incomeValues = Array.from(monthlyIncome.values());
    const avgIncome = incomeValues.reduce((sum, val) => sum + val, 0) / incomeValues.length;
    
    if (avgIncome === 0) return 'LOW';
    
    const variance = incomeValues.reduce((sum, val) => sum + Math.pow(val - avgIncome, 2), 0) / incomeValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avgIncome;
    
    // 根据变异系数判断稳定性
    if (cv < 0.1) return 'HIGH';
    if (cv < 0.3) return 'MEDIUM';
    return 'LOW';
  }
  
  private calculateSpendingByCategory(
    expenseTransactions: Transaction[],
    categories: Map<string, Category>,
    monthlyTransactions: Map<string, Transaction[]>,
    totalMonthlyAverage: number
  ) {
    // 按分类分组交易
    const categoryTransactions = new Map<string, Transaction[]>();
    
    expenseTransactions.forEach(transaction => {
      if (!categoryTransactions.has(transaction.categoryId)) {
        categoryTransactions.set(transaction.categoryId, []);
      }
      
      categoryTransactions.get(transaction.categoryId)?.push(transaction);
    });
    
    // 计算每个分类的月平均支出和波动
    const result = Array.from(categoryTransactions.entries()).map(([categoryId, transactions]) => {
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const monthCount = monthlyTransactions.size;
      const averageMonthlyAmount = totalAmount / monthCount;
      
      // 计算月度波动
      const monthlyVariation = this.calculateMonthlyVariation(transactions, monthlyTransactions);
      
      return {
        categoryId,
        categoryName: categories.get(categoryId)?.name || '未知分类',
        averageMonthlyAmount,
        percentageOfTotal: totalMonthlyAverage > 0 ? (averageMonthlyAmount / totalMonthlyAverage) * 100 : 0,
        monthlyVariation
      };
    });
    
    // 按金额降序排序
    return result.sort((a, b) => b.averageMonthlyAmount - a.averageMonthlyAmount);
  }
  
  private calculateMonthlyVariation(
    categoryTransactions: Transaction[],
    monthlyTransactions: Map<string, Transaction[]>
  ): number {
    // 计算每月该分类的支出
    const monthlyCategorySpending = new Map<string, number>();
    
    categoryTransactions.forEach(transaction => {
      const date = transaction.date;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const currentAmount = monthlyCategorySpending.get(monthKey) || 0;
      monthlyCategorySpending.set(monthKey, currentAmount + Number(transaction.amount));
    });
    
    // 确保所有月份都有值
    monthlyTransactions.forEach((_, monthKey) => {
      if (!monthlyCategorySpending.has(monthKey)) {
        monthlyCategorySpending.set(monthKey, 0);
      }
    });
    
    // 计算变异系数
    const spendingValues = Array.from(monthlyCategorySpending.values());
    const avgSpending = spendingValues.reduce((sum, val) => sum + val, 0) / spendingValues.length;
    
    if (avgSpending === 0) return 0;
    
    const variance = spendingValues.reduce((sum, val) => sum + Math.pow(val - avgSpending, 2), 0) / spendingValues.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / avgSpending;
  }
  
  private analyzeExistingBudgets(
    budgets: Budget[],
    expenseTransactions: Transaction[],
    categories: Map<string, Category>
  ) {
    return budgets.map(budget => {
      // 找出该预算类别的所有交易
      const categoryTransactions = expenseTransactions.filter(t => 
        t.categoryId === budget.categoryId &&
        t.date >= budget.startDate &&
        t.date <= budget.endDate
      );
      
      // 计算实际支出
      const actualSpending = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // 计算差额和使用百分比
      const budgetAmount = Number(budget.amount);
      const difference = budgetAmount - actualSpending;
      const percentUsed = budgetAmount > 0 ? (actualSpending / budgetAmount) * 100 : 0;
      
      return {
        categoryId: budget.categoryId,
        categoryName: categories.get(budget.categoryId)?.name || '未知分类',
        budgetAmount,
        actualSpending,
        difference,
        percentUsed
      };
    });
  }
}
```

### 2. LangGraph工作流

使用LangGraph构建预算建议工作流：

```typescript
// server/src/ai/langgraph/budget-advisor.ts
import { createGraph } from 'langchain/langgraph';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatAnthropic } from 'langchain/chat_models/anthropic';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { LLMProviderService } from '../../services/llm-provider.service';
import { Transaction, Category, Budget } from '@server/prisma/client';
import { BudgetDataAnalyzer, BudgetAnalysisData } from '../analyzers/budget-data-analyzer';

interface BudgetAdvisorState {
  transactions: Transaction[];
  categories: Map<string, Category>;
  existingBudgets: Budget[];
  months: number;
  targetSavingsRate?: number;
  userId: string;
  accountId?: string;
  accountType?: 'personal' | 'family';
  analysisData?: BudgetAnalysisData;
  budgetSuggestions?: any;
  savingsGoal?: any;
  insights?: string;
}

export class BudgetAdvisor {
  private llmProviderService: LLMProviderService;
  private budgetDataAnalyzer: BudgetDataAnalyzer;
  
  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
    this.budgetDataAnalyzer = new BudgetDataAnalyzer();
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
  
  public async generateBudgetSuggestions(
    transactions: Transaction[],
    categories: Map<string, Category>,
    existingBudgets: Budget[],
    months: number = 3,
    targetSavingsRate?: number,
    userId: string,
    accountId?: string,
    accountType?: 'personal' | 'family'
  ) {
    // 创建LangGraph工作流
    const workflow = createGraph<BudgetAdvisorState>({
      channels: {
        transactions: {},
        categories: {},
        existingBudgets: {},
        months: {},
        targetSavingsRate: {},
        userId: {},
        accountId: {},
        accountType: {},
        analysisData: {},
        budgetSuggestions: {},
        savingsGoal: {},
        insights: {},
      },
    });
    
    // 添加数据分析节点
    workflow.addNode("analyzeData", async (state) => {
      const analysisData = this.budgetDataAnalyzer.analyze(
        state.transactions,
        state.categories,
        state.existingBudgets,
        state.months
      );
      
      return { ...state, analysisData };
    });
    
    // 添加预算建议节点
    workflow.addNode("generateBudgetSuggestions", async (state) => {
      if (!state.analysisData) return state;
      
      const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
      
      // 构建系统提示
      const systemPrompt = `
        你是一个专业的财务顾问。你的任务是基于用户的消费数据，提供个性化的预算建议。
        
        请为用户的每个主要支出类别提供合理的预算建议。考虑以下因素：
        1. 用户的收入和支出模式
        2. 各类别的历史支出
        3. 支出的必要性和灵活性
        4. 用户的储蓄目标
        
        你的回答必须是一个JSON对象，包含以下字段：
        - totalBudget: 建议的总预算金额
        - categories: 各类别的预算建议数组，每个元素包含：
          - categoryId: 类别ID
          - categoryName: 类别名称
          - suggestedAmount: 建议的预算金额
          - currentSpending: 当前平均支出
          - adjustment: 调整金额（正值表示增加，负值表示减少）
          - adjustmentPercentage: 调整百分比
          - priority: 预算优先级 (HIGH, MEDIUM, LOW)
          - reasoning: 建议理由
        
        只返回JSON对象，不要有其他文字。
      `;
      
      // 构建用户提示
      const userPrompt = `
        以下是用户的财务数据，请提供预算建议：
        
        收入信息：
        - 月平均收入: ${state.analysisData.averageMonthlyIncome}
        - 收入稳定性: ${state.analysisData.incomeStability}
        
        支出信息：
        - 月平均支出: ${state.analysisData.averageMonthlySpendings}
        - 各类别支出: ${JSON.stringify(state.analysisData.spendingByCategory, null, 2)}
        
        现有预算：
        ${JSON.stringify(state.analysisData.existingBudgets, null, 2)}
        
        储蓄信息：
        - 月平均储蓄: ${state.analysisData.averageMonthlySavings}
        - 当前储蓄率: ${(state.analysisData.savingsRate * 100).toFixed(2)}%
        ${state.targetSavingsRate ? `- 目标储蓄率: ${state.targetSavingsRate}%` : ''}
      `;
      
      try {
        // 调用LLM
        const response = await llm.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(userPrompt)
        ]);
        
        // 解析响应
        const content = response.content.toString();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const budgetSuggestions = JSON.parse(jsonMatch[0]);
          return { ...state, budgetSuggestions };
        }
      } catch (error) {
        console.error('生成预算建议错误:', error);
      }
      
      return state;
    });
    
    // 添加储蓄目标节点
    workflow.addNode("generateSavingsGoal", async (state) => {
      if (!state.analysisData || !state.budgetSuggestions) return state;
      
      const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
      
      // 构建系统提示
      const systemPrompt = `
        你是一个专业的财务顾问。你的任务是基于用户的财务数据，提供储蓄目标建议。
        
        请考虑用户的收入、支出和现有储蓄情况，提供合理的储蓄目标。
        你的回答必须是一个JSON对象，包含以下字段：
        - recommendedSavingsAmount: 建议的月储蓄金额
        - recommendedSavingsRate: 建议的储蓄率（占收入的百分比）
        - shortTermGoal: 短期储蓄目标（3-6个月）
        - longTermGoal: 长期储蓄目标
        - reasoning: 建议理由
        
        只返回JSON对象，不要有其他文字。
      `;
      
      // 构建用户提示
      const userPrompt = `
        以下是用户的财务数据，请提供储蓄目标建议：
        
        收入信息：
        - 月平均收入: ${state.analysisData.averageMonthlyIncome}
        - 收入稳定性: ${state.analysisData.incomeStability}
        
        支出信息：
        - 月平均支出: ${state.analysisData.averageMonthlySpendings}
        - 建议总预算: ${state.budgetSuggestions.totalBudget}
        
        储蓄信息：
        - 月平均储蓄: ${state.analysisData.averageMonthlySavings}
        - 当前储蓄率: ${(state.analysisData.savingsRate * 100).toFixed(2)}%
        ${state.targetSavingsRate ? `- 目标储蓄率: ${state.targetSavingsRate}%` : ''}
      `;
      
      try {
        // 调用LLM
        const response = await llm.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(userPrompt)
        ]);
        
        // 解析响应
        const content = response.content.toString();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const savingsGoal = JSON.parse(jsonMatch[0]);
          return { ...state, savingsGoal };
        }
      } catch (error) {
        console.error('生成储蓄目标错误:', error);
      }
      
      return state;
    });
    
    // 添加综合分析节点
    workflow.addNode("generateInsights", async (state) => {
      if (!state.analysisData || !state.budgetSuggestions || !state.savingsGoal) {
        return state;
      }
      
      const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
      
      // 构建系统提示
      const systemPrompt = `
        你是一个专业的财务顾问。你的任务是基于用户的财务数据和预算建议，提供有价值的洞察和实施建议。
        
        请用简洁、友好的语言，提供3-5条具体的洞察和建议。每条建议应该：
        1. 基于数据分析
        2. 具体且可操作
        3. 个性化且有帮助
        
        你的回答应该是一段文字，包含多个段落，每个段落一条洞察或建议。
      `;
      
      // 构建用户提示
      const userPrompt = `
        以下是用户的财务分析结果，请提供洞察和实施建议：
        
        收入信息：
        - 月平均收入: ${state.analysisData.averageMonthlyIncome}
        - 收入稳定性: ${state.analysisData.incomeStability}
        
        支出信息：
        - 月平均支出: ${state.analysisData.averageMonthlySpendings}
        - 各类别支出: ${JSON.stringify(state.analysisData.spendingByCategory.slice(0, 3), null, 2)}
        
        预算建议：
        - 建议总预算: ${state.budgetSuggestions.totalBudget}
        - 主要类别调整: ${JSON.stringify(state.budgetSuggestions.categories.slice(0, 3), null, 2)}
        
        储蓄目标：
        - 建议月储蓄: ${state.savingsGoal.recommendedSavingsAmount}
        - 建议储蓄率: ${state.savingsGoal.recommendedSavingsRate}%
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
    workflow.addEdge("analyzeData", "generateBudgetSuggestions");
    workflow.addEdge("generateBudgetSuggestions", "generateSavingsGoal");
    workflow.addEdge("generateSavingsGoal", "generateInsights");
    
    workflow.setEntryPoint("analyzeData");
    
    // 执行工作流
    const initialState: BudgetAdvisorState = {
      transactions,
      categories,
      existingBudgets,
      months,
      targetSavingsRate,
      userId,
      accountId,
      accountType
    };
    
    const result = await workflow.invoke(initialState);
    
    return {
      analysisData: result.analysisData,
      budgetSuggestions: result.budgetSuggestions,
      savingsGoal: result.savingsGoal,
      insights: result.insights
    };
  }
}
```

## API设计

### 获取预算建议API

```
GET /api/ai/budget-suggestions
```

**查询参数**：
- `months`: 分析的月数 (默认3)
- `targetSavingsRate`: 目标储蓄率 (可选)
- `accountId`: 账本ID (可选)
- `accountType`: 账本类型 (personal, family) (可选)

**响应**:
```json
{
  "analysisData": {
    "averageMonthlyIncome": 8000,
    "incomeStability": "HIGH",
    "averageMonthlySpendings": 5000,
    "spendingByCategory": [
      {
        "categoryId": "uuid",
        "categoryName": "住房",
        "averageMonthlyAmount": 2000,
        "percentageOfTotal": 40,
        "monthlyVariation": 0.05
      }
    ],
    "existingBudgets": [
      {
        "categoryId": "uuid",
        "categoryName": "餐饮",
        "budgetAmount": 1500,
        "actualSpending": 1200,
        "difference": 300,
        "percentUsed": 80
      }
    ],
    "averageMonthlySavings": 3000,
    "savingsRate": 0.375
  },
  "budgetSuggestions": {
    "totalBudget": 5500,
    "categories": [
      {
        "categoryId": "uuid",
        "categoryName": "住房",
        "suggestedAmount": 2000,
        "currentSpending": 2000,
        "adjustment": 0,
        "adjustmentPercentage": 0,
        "priority": "HIGH",
        "reasoning": "住房是必要支出，保持不变"
      },
      {
        "categoryId": "uuid",
        "categoryName": "餐饮",
        "suggestedAmount": 1200,
        "currentSpending": 1500,
        "adjustment": -300,
        "adjustmentPercentage": -20,
        "priority": "MEDIUM",
        "reasoning": "餐饮支出可以适当减少，考虑更多在家做饭"
      }
    ]
  },
  "savingsGoal": {
    "recommendedSavingsAmount": 2500,
    "recommendedSavingsRate": 31.25,
    "shortTermGoal": "建立3个月的应急基金，约24000元",
    "longTermGoal": "一年内积累30000元用于投资",
    "reasoning": "基于收入稳定性高，建议保持30%以上的储蓄率"
  },
  "insights": "根据您的财务数据分析，我们有以下几点建议：\n\n1. 您的收入稳定性高，这是一个很好的基础。建议将每月收入的30%左右用于储蓄，这样一年内可以积累足够的应急基金。\n\n2. 餐饮支出占比较高，可以考虑减少外出就餐频率，每月可以节省约300元。\n\n3. 您的住房支出占总支出的40%，这是一个合理的比例，建议保持不变。\n\n4. 建议设立明确的储蓄目标，如3-6个月的应急基金，这将帮助您应对突发情况并提高财务安全感。"
}
```
