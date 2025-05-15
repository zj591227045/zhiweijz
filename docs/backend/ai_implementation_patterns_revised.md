# 只为记账 - 消费模式分析实现 (修订版)

根据最新要求，我们将修改消费模式分析功能的实现方案，采用LangGraph+OpenAI API的方式，并支持每个用户和账本单独设置LLM提供商。

## 功能目标

消费模式分析功能旨在：

1. 识别用户的消费习惯和模式
2. 发现周期性支出（如月租、订阅服务）
3. 检测异常交易（金额或频率异常）
4. 分析消费趋势和变化

## 实现方案

我们将使用LangGraph构建消费模式分析工作流，结合基础统计分析和LLM的智能解读：

### 1. 基础统计分析

首先进行基础的统计分析，提取关键指标：

```typescript
// src/ai/analyzers/basic-stats-analyzer.ts
import { Transaction, Category } from '@prisma/client';

export interface BasicStatsResult {
  totalExpense: number;
  totalIncome: number;
  netIncome: number;
  expenseByCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
  expenseByDay: Array<{
    date: string;
    amount: number;
  }>;
  // 其他统计数据...
}

export class BasicStatsAnalyzer {
  public analyze(
    transactions: Transaction[],
    categories: Map<string, Category>,
    startDate: Date,
    endDate: Date
  ): BasicStatsResult {
    // 过滤时间范围内的交易
    const filteredTransactions = transactions.filter(t => 
      t.date >= startDate && t.date <= endDate
    );
    
    // 计算总支出和总收入
    const expenses = filteredTransactions.filter(t => t.type === 'EXPENSE');
    const incomes = filteredTransactions.filter(t => t.type === 'INCOME');
    
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
    const netIncome = totalIncome - totalExpense;
    
    // 按分类统计支出
    const expenseByCategory = this.calculateExpenseByCategory(expenses, categories, totalExpense);
    
    // 按日期统计支出
    const expenseByDay = this.calculateExpenseByDay(expenses, startDate, endDate);
    
    return {
      totalExpense,
      totalIncome,
      netIncome,
      expenseByCategory,
      expenseByDay,
      // 其他统计数据...
    };
  }
  
  private calculateExpenseByCategory(
    expenses: Transaction[],
    categories: Map<string, Category>,
    totalExpense: number
  ) {
    const categoryMap = new Map<string, number>();
    
    // 按分类累计金额
    expenses.forEach(transaction => {
      const currentAmount = categoryMap.get(transaction.categoryId) || 0;
      categoryMap.set(transaction.categoryId, currentAmount + Number(transaction.amount));
    });
    
    // 转换为数组并计算百分比
    return Array.from(categoryMap.entries())
      .map(([categoryId, amount]) => {
        const category = categories.get(categoryId);
        return {
          categoryId,
          categoryName: category?.name || '未知分类',
          amount,
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }
  
  private calculateExpenseByDay(
    expenses: Transaction[],
    startDate: Date,
    endDate: Date
  ) {
    const dayMap = new Map<string, number>();
    
    // 初始化日期范围内的所有日期
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      dayMap.set(dateString, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 按日期累计金额
    expenses.forEach(transaction => {
      const dateString = transaction.date.toISOString().split('T')[0];
      const currentAmount = dayMap.get(dateString) || 0;
      dayMap.set(dateString, currentAmount + Number(transaction.amount));
    });
    
    // 转换为数组
    return Array.from(dayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
```

### 2. LangGraph工作流

使用LangGraph构建消费模式分析工作流：

```typescript
// src/ai/langgraph/consumption-pattern-analyzer.ts
import { createGraph } from 'langchain/langgraph';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatAnthropic } from 'langchain/chat_models/anthropic';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { LLMProviderService } from '../../services/llm-provider.service';
import { Transaction, Category } from '@prisma/client';
import { BasicStatsAnalyzer, BasicStatsResult } from '../analyzers/basic-stats-analyzer';

interface PatternAnalysisState {
  transactions: Transaction[];
  categories: Map<string, Category>;
  startDate: Date;
  endDate: Date;
  userId: string;
  accountId?: string;
  accountType?: 'personal' | 'family';
  basicStats?: BasicStatsResult;
  periodicExpenses?: any[];
  anomalies?: any[];
  trends?: any[];
  insights?: string;
}

export class ConsumptionPatternAnalyzer {
  private llmProviderService: LLMProviderService;
  private basicStatsAnalyzer: BasicStatsAnalyzer;
  
  constructor(llmProviderService: LLMProviderService) {
    this.llmProviderService = llmProviderService;
    this.basicStatsAnalyzer = new BasicStatsAnalyzer();
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
  
  public async analyzePatterns(
    transactions: Transaction[],
    categories: Map<string, Category>,
    startDate: Date,
    endDate: Date,
    userId: string,
    accountId?: string,
    accountType?: 'personal' | 'family'
  ) {
    // 创建LangGraph工作流
    const workflow = createGraph<PatternAnalysisState>({
      channels: {
        transactions: {},
        categories: {},
        startDate: {},
        endDate: {},
        userId: {},
        accountId: {},
        accountType: {},
        basicStats: {},
        periodicExpenses: {},
        anomalies: {},
        trends: {},
        insights: {},
      },
    });
    
    // 添加基础统计节点
    workflow.addNode("calculateBasicStats", async (state) => {
      const basicStats = this.basicStatsAnalyzer.analyze(
        state.transactions,
        state.categories,
        state.startDate,
        state.endDate
      );
      
      return { ...state, basicStats };
    });
    
    // 添加周期性支出识别节点
    workflow.addNode("identifyPeriodicExpenses", async (state) => {
      if (!state.basicStats) return state;
      
      const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
      
      // 准备交易数据
      const transactionsData = state.transactions
        .filter(t => t.type === 'EXPENSE')
        .map(t => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description || '',
          category: state.categories.get(t.categoryId)?.name || '未知',
          date: t.date.toISOString().split('T')[0]
        }));
      
      // 构建系统提示
      const systemPrompt = `
        你是一个专业的财务分析师。你的任务是识别用户的周期性支出模式。
        周期性支出是指在固定时间间隔重复发生的支出，如月租、订阅服务、定期缴费等。
        
        请分析提供的交易数据，识别可能的周期性支出。
        你的回答必须是一个JSON数组，每个元素包含以下字段：
        - description: 周期性支出的描述
        - category: 支出类别
        - amount: 典型金额
        - frequency: 频率 (DAILY, WEEKLY, MONTHLY)
        - nextExpectedDate: 下一次预期支出日期
        - confidence: 你对这是周期性支出的置信度 (0-1)
        
        只返回JSON数组，不要有其他文字。
      `;
      
      // 构建用户提示
      const userPrompt = `
        以下是用户的交易记录，请识别周期性支出：
        ${JSON.stringify(transactionsData, null, 2)}
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
          const periodicExpenses = JSON.parse(jsonMatch[0]);
          return { ...state, periodicExpenses };
        }
      } catch (error) {
        console.error('识别周期性支出错误:', error);
      }
      
      return { ...state, periodicExpenses: [] };
    });
    
    // 添加异常交易检测节点
    workflow.addNode("detectAnomalies", async (state) => {
      if (!state.basicStats) return state;
      
      const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
      
      // 准备交易数据
      const transactionsData = state.transactions
        .filter(t => t.type === 'EXPENSE')
        .map(t => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description || '',
          category: state.categories.get(t.categoryId)?.name || '未知',
          date: t.date.toISOString().split('T')[0]
        }));
      
      // 构建系统提示
      const systemPrompt = `
        你是一个专业的财务分析师。你的任务是检测用户的异常交易。
        异常交易是指金额、频率或类别与用户正常消费模式显著不同的交易。
        
        请分析提供的交易数据，识别可能的异常交易。
        你的回答必须是一个JSON数组，每个元素包含以下字段：
        - transactionId: 交易ID
        - amount: 交易金额
        - description: 交易描述
        - category: 交易类别
        - date: 交易日期
        - reason: 判断为异常的原因
        - typicalAmount: 该类别的典型金额 (如果适用)
        - confidence: 你对这是异常交易的置信度 (0-1)
        
        只返回JSON数组，不要有其他文字。
      `;
      
      // 构建用户提示
      const userPrompt = `
        以下是用户的交易记录，请检测异常交易：
        ${JSON.stringify(transactionsData, null, 2)}
        
        基础统计信息：
        - 总支出: ${state.basicStats.totalExpense}
        - 总收入: ${state.basicStats.totalIncome}
        - 各类别支出: ${JSON.stringify(state.basicStats.expenseByCategory, null, 2)}
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
          const anomalies = JSON.parse(jsonMatch[0]);
          return { ...state, anomalies };
        }
      } catch (error) {
        console.error('检测异常交易错误:', error);
      }
      
      return { ...state, anomalies: [] };
    });
    
    // 添加消费趋势分析节点
    workflow.addNode("analyzeTrends", async (state) => {
      if (!state.basicStats) return state;
      
      const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
      
      // 构建系统提示
      const systemPrompt = `
        你是一个专业的财务分析师。你的任务是分析用户的消费趋势。
        
        请分析提供的统计数据，识别用户的消费趋势。
        你的回答必须是一个JSON数组，每个元素包含以下字段：
        - category: 消费类别
        - trend: 趋势类型 (INCREASING, DECREASING, STABLE)
        - changePercentage: 变化百分比
        - message: 对趋势的简短描述
        
        只返回JSON数组，不要有其他文字。
      `;
      
      // 构建用户提示
      const userPrompt = `
        以下是用户的消费统计数据，请分析消费趋势：
        
        基础统计信息：
        - 总支出: ${state.basicStats.totalExpense}
        - 总收入: ${state.basicStats.totalIncome}
        - 各类别支出: ${JSON.stringify(state.basicStats.expenseByCategory, null, 2)}
        - 每日支出: ${JSON.stringify(state.basicStats.expenseByDay, null, 2)}
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
          const trends = JSON.parse(jsonMatch[0]);
          return { ...state, trends };
        }
      } catch (error) {
        console.error('分析消费趋势错误:', error);
      }
      
      return { ...state, trends: [] };
    });
    
    // 添加综合分析节点
    workflow.addNode("generateInsights", async (state) => {
      if (!state.basicStats || !state.periodicExpenses || !state.anomalies || !state.trends) {
        return state;
      }
      
      const llm = await this.getLLM(state.userId, state.accountId, state.accountType);
      
      // 构建系统提示
      const systemPrompt = `
        你是一个专业的财务顾问。你的任务是基于用户的消费数据，提供有价值的财务洞察和建议。
        
        请用简洁、友好的语言，提供3-5条具体的洞察和建议。每条建议应该：
        1. 基于数据分析
        2. 具体且可操作
        3. 个性化且有帮助
        
        你的回答应该是一段文字，包含多个段落，每个段落一条洞察或建议。
      `;
      
      // 构建用户提示
      const userPrompt = `
        以下是用户的消费分析结果，请提供财务洞察和建议：
        
        基础统计：
        - 总支出: ${state.basicStats.totalExpense}
        - 总收入: ${state.basicStats.totalIncome}
        - 净收入: ${state.basicStats.netIncome}
        
        周期性支出：
        ${JSON.stringify(state.periodicExpenses, null, 2)}
        
        异常交易：
        ${JSON.stringify(state.anomalies, null, 2)}
        
        消费趋势：
        ${JSON.stringify(state.trends, null, 2)}
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
    workflow.addEdge("calculateBasicStats", "identifyPeriodicExpenses");
    workflow.addEdge("identifyPeriodicExpenses", "detectAnomalies");
    workflow.addEdge("detectAnomalies", "analyzeTrends");
    workflow.addEdge("analyzeTrends", "generateInsights");
    
    workflow.setEntryPoint("calculateBasicStats");
    
    // 执行工作流
    const initialState: PatternAnalysisState = {
      transactions,
      categories,
      startDate,
      endDate,
      userId,
      accountId,
      accountType
    };
    
    const result = await workflow.invoke(initialState);
    
    return {
      basicStats: result.basicStats,
      periodicExpenses: result.periodicExpenses || [],
      anomalies: result.anomalies || [],
      trends: result.trends || [],
      insights: result.insights || ""
    };
  }
}
```

## API设计

### 获取消费模式分析API

```
GET /api/v1/ai/consumption-patterns
```

**查询参数**：
- `startDate`: 开始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)
- `accountId`: 账本ID (可选)
- `accountType`: 账本类型 (personal, family) (可选)

**响应**:
```json
{
  "basicStats": {
    "totalExpense": 5000,
    "totalIncome": 8000,
    "netIncome": 3000,
    "expenseByCategory": [
      {
        "categoryId": "uuid",
        "categoryName": "餐饮",
        "amount": 2000,
        "percentage": 40
      }
    ]
  },
  "periodicExpenses": [
    {
      "description": "房租",
      "category": "住房",
      "amount": 2000,
      "frequency": "MONTHLY",
      "nextExpectedDate": "2023-06-01",
      "confidence": 0.95
    }
  ],
  "anomalies": [
    {
      "transactionId": "uuid",
      "amount": 500,
      "description": "电子产品",
      "category": "购物",
      "date": "2023-05-10",
      "reason": "金额异常",
      "typicalAmount": 100,
      "confidence": 0.85
    }
  ],
  "trends": [
    {
      "category": "餐饮",
      "trend": "INCREASING",
      "changePercentage": 15,
      "message": "餐饮支出呈上升趋势"
    }
  ],
  "insights": "根据您的消费数据，我们发现几个值得注意的点：\n\n1. 您的餐饮支出呈上升趋势，已占总支出的40%。考虑制定餐饮预算或增加在家做饭的频率，可能会帮助您控制这部分支出。\n\n2. 您有一笔固定的月租支出，占总支出的很大比例。这是必要支出，但可以考虑在合同到期时寻找更经济的选择。\n\n3. 我们检测到一笔异常的购物支出。偶尔的大额支出是正常的，但要确保它符合您的整体预算计划。"
}
```
