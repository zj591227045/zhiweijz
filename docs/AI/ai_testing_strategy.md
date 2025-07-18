# 只为记账 - AI功能测试策略

本文档详细描述了"只为记账"应用中AI功能的测试策略，包括测试方法、工具和最佳实践。

## 测试挑战

测试基于LLM的AI功能面临以下独特挑战：

1. **输出不确定性**：LLM的输出可能因微小的输入变化而显著不同
2. **评估标准主观性**：评估LLM输出质量通常涉及主观判断
3. **API依赖**：依赖外部LLM API增加了测试复杂性
4. **成本考虑**：频繁调用LLM API可能产生显著成本
5. **版本变化**：LLM模型版本更新可能导致行为变化

## 测试策略概述

针对这些挑战，我们采用多层次的测试策略：

1. **单元测试**：测试各个组件的独立功能
2. **集成测试**：测试组件之间的交互
3. **模拟测试**：使用模拟LLM响应进行测试
4. **回归测试**：确保新变更不破坏现有功能
5. **端到端测试**：测试完整的用户流程
6. **人工评估**：对LLM输出质量进行人工评估

## 测试环境

我们将使用以下测试环境：

1. **开发环境**：用于开发人员本地测试
2. **测试环境**：用于自动化测试和集成测试
3. **模拟环境**：使用模拟的LLM API响应
4. **生产环境**：用于最终验证

## 测试方法

### 1. 单元测试

单元测试关注各个组件的独立功能，不涉及实际的LLM API调用。

**测试对象**：
- 数据预处理函数
- 结果解析函数
- 工具函数
- 非LLM依赖的业务逻辑

**示例**：测试财务健康指标计算

```typescript
// server/src/__tests__/unit/ai/analyzers/financial-health-analyzer.test.ts
import { FinancialHealthAnalyzer } from '../../../../server/src/ai/analyzers/financial-health-analyzer';

describe('FinancialHealthAnalyzer', () => {
  let analyzer: FinancialHealthAnalyzer;
  
  beforeEach(() => {
    analyzer = new FinancialHealthAnalyzer();
  });
  
  describe('calculateMetrics', () => {
    it('should calculate income/expense ratio correctly', () => {
      // 准备测试数据
      const transactions = [
        {
          id: '1',
          amount: 1000,
          type: 'INCOME',
          date: new Date('2023-01-01'),
          // 其他必要字段...
        },
        {
          id: '2',
          amount: 500,
          type: 'EXPENSE',
          date: new Date('2023-01-15'),
          // 其他必要字段...
        }
      ];
      
      const categories = new Map();
      const budgets = [];
      
      // 执行测试
      const result = analyzer.calculateMetrics(transactions, categories, budgets, 1);
      
      // 验证结果
      expect(result.incomeExpenseRatio).toBe(2); // 1000 / 500 = 2
    });
    
    // 更多测试...
  });
});
```

### 2. 集成测试

集成测试关注组件之间的交互，但仍然使用模拟的LLM响应。

**测试对象**：
- LangGraph工作流
- 服务层与数据访问层的交互
- API端点

**示例**：测试财务健康评估工作流

```typescript
// server/src/__tests__/integration/ai/financial-health-advisor.test.ts
import { FinancialHealthAdvisor } from '../../../server/src/ai/langgraph/financial-health-advisor';
import { LLMProviderService } from '../../../server/src/services/llm-provider.service';

// 模拟LLMProviderService
jest.mock('../../../server/src/services/llm-provider.service');

describe('FinancialHealthAdvisor', () => {
  let advisor: FinancialHealthAdvisor;
  let mockLLMProviderService: jest.Mocked<LLMProviderService>;
  
  beforeEach(() => {
    // 设置模拟
    mockLLMProviderService = new LLMProviderService() as jest.Mocked<LLMProviderService>;
    advisor = new FinancialHealthAdvisor(mockLLMProviderService);
    
    // 模拟getLLM方法返回模拟的LLM
    mockLLMProviderService.getLLMSettings.mockResolvedValue({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 1000
    });
  });
  
  describe('evaluateFinancialHealth', () => {
    it('should process the workflow correctly', async () => {
      // 准备测试数据
      const transactions = [/* 测试记账数据 */];
      const categories = new Map();
      const budgets = [];
      
      // 模拟LLM响应
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify([
            {
              category: 'SAVINGS',
              title: '增加储蓄率',
              description: '测试描述',
              actionItems: ['行动1', '行动2'],
              priority: 'HIGH',
              impact: 'HIGH',
              timeframe: 'IMMEDIATE'
            }
          ])
        })
      };
      
      // 替换getLLM的实现
      (advisor as any).getLLM = jest.fn().mockResolvedValue(mockLLM);
      
      // 执行测试
      const result = await advisor.evaluateFinancialHealth(
        transactions,
        categories,
        budgets,
        6,
        'user-id'
      );
      
      // 验证结果
      expect(result.healthMetrics).toBeDefined();
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].title).toBe('增加储蓄率');
    });
  });
});
```

### 3. 模拟测试

模拟测试使用预定义的LLM响应，避免实际API调用。

**模拟方法**：

1. **响应模拟**：创建模拟的LLM响应数据
2. **行为模拟**：模拟LLM的行为模式
3. **错误模拟**：模拟各种错误情况

**示例**：模拟LLM响应

```typescript
// server/src/__tests__/mocks/llm-responses.ts
export const mockLLMResponses = {
  transactionClassification: {
    success: {
      content: JSON.stringify({
        categoryId: 'category-id',
        confidence: 0.92,
        reasoning: '这是餐厅消费，属于餐饮类别',
        alternativeCategories: [
          {
            categoryId: 'alternative-category-id',
            confidence: 0.05
          }
        ]
      })
    },
    malformed: {
      content: '这不是有效的JSON'
    },
    error: new Error('API调用失败')
  },
  // 其他响应...
};
```

**使用模拟响应**：

```typescript
// 在测试中使用模拟响应
const mockLLM = {
  invoke: jest.fn().mockResolvedValue(mockLLMResponses.transactionClassification.success)
};
```

### 4. 回归测试

回归测试确保新变更不破坏现有功能。

**测试方法**：

1. **测试套件**：创建覆盖所有AI功能的测试套件
2. **自动化**：在CI/CD流程中自动运行回归测试
3. **基准比较**：将结果与基准进行比较

**示例**：回归测试配置

```typescript
// jest.config.js
module.exports = {
  // ...其他配置
  testMatch: [
    '**/__tests__/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'server/src/ai/**/*.ts',
    'server/src/services/**/*.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 5. 端到端测试

端到端测试验证完整的用户流程，包括实际的LLM API调用。

**测试方法**：

1. **用户流程模拟**：模拟用户与应用的交互
2. **实际API调用**：使用实际的LLM API（但限制频率）
3. **结果验证**：验证整个流程的结果

**示例**：端到端测试

```typescript
// server/src/__tests__/e2e/ai-features.test.ts
import request from 'supertest';
import app from '../../server/src/app';
import { prisma } from '../../server/src/lib/prisma';

// 这些测试会实际调用LLM API，应谨慎运行
describe('AI Features E2E', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // 设置测试用户和认证
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });
  
  describe('Transaction Classification', () => {
    it('should classify a transaction correctly', async () => {
      const response = await request(app)
        .post('/api/ai/classify-transaction')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: '星巴克咖啡',
          amount: 30,
          date: new Date().toISOString()
        });
      
      expect(response.status).toBe(200);
      expect(response.body.category).toBeDefined();
      expect(response.body.confidence).toBeGreaterThan(0.5);
    });
  });
  
  // 其他端到端测试...
});
```

### 6. 人工评估

人工评估对LLM输出质量进行主观评估。

**评估方法**：

1. **质量评分**：对LLM输出进行1-5分评分
2. **A/B比较**：比较不同提示或模型的输出
3. **用户反馈**：收集真实用户的反馈

**示例**：评估表格

```
| 测试ID | 输入 | LLM输出 | 预期输出 | 相关性(1-5) | 有用性(1-5) | 准确性(1-5) | 评论 |
|--------|------|---------|----------|------------|------------|------------|------|
| TC001  | 星巴克咖啡 | 餐饮类别 | 餐饮类别 | 5 | 5 | 5 | 完美匹配 |
| TC002  | 电费支付 | 水电类别 | 水电类别 | 5 | 5 | 5 | 正确识别 |
```

## 模拟LLM响应

为了有效测试AI功能，我们需要模拟LLM响应。

### 模拟方法

1. **静态响应**：使用预定义的静态响应
2. **模板响应**：基于输入生成动态响应
3. **随机变异**：添加随机变异模拟LLM的不确定性

### 实现示例

```typescript
// server/src/__tests__/mocks/mock-llm.ts
export class MockLLM {
  private responses: Map<string, any>;
  private defaultResponse: any;
  
  constructor(defaultResponse = { content: '{}' }) {
    this.responses = new Map();
    this.defaultResponse = defaultResponse;
  }
  
  // 添加特定输入的响应
  addResponse(input: string, response: any) {
    this.responses.set(this.normalizeInput(input), response);
  }
  
  // 模拟invoke方法
  async invoke(messages: any[]) {
    // 获取用户消息
    const userMessage = messages.find(m => m.type === 'human')?.content || '';
    
    // 查找匹配的响应
    const response = this.responses.get(this.normalizeInput(userMessage)) || this.defaultResponse;
    
    // 如果响应是错误，则抛出
    if (response instanceof Error) {
      throw response;
    }
    
    // 添加随机延迟模拟API调用
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
    
    return response;
  }
  
  // 标准化输入以便匹配
  private normalizeInput(input: string): string {
    return input.toLowerCase().trim();
  }
}
```

### 使用示例

```typescript
// 在测试中使用MockLLM
const mockLLM = new MockLLM();

// 添加特定响应
mockLLM.addResponse('星巴克咖啡', {
  content: JSON.stringify({
    categoryId: 'food-category-id',
    confidence: 0.92,
    reasoning: '这是咖啡店消费，属于餐饮类别'
  })
});

// 模拟错误情况
mockLLM.addResponse('触发错误', new Error('API调用失败'));

// 在测试中替换真实LLM
(classifier as any).getLLM = jest.fn().mockResolvedValue(mockLLM);
```

## 测试数据管理

为了有效测试AI功能，我们需要管理测试数据。

### 测试数据集

1. **基准数据集**：用于回归测试的标准数据集
2. **边缘情况数据集**：测试边缘情况和异常情况
3. **真实用户数据子集**：匿名化的真实用户数据样本

### 数据管理方法

1. **版本控制**：对测试数据集进行版本控制
2. **自动生成**：使用脚本生成多样化的测试数据
3. **数据增强**：通过变异现有数据创建新测试用例

## 测试自动化

我们将自动化AI功能测试流程。

### 自动化策略

1. **CI/CD集成**：在CI/CD流程中运行自动化测试
2. **定期测试**：定期运行完整的测试套件
3. **变更触发**：代码变更时自动运行相关测试

### 实现示例

```yaml
# .github/workflows/ai-tests.yml
name: AI Features Tests

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'server/src/ai/**'
      - 'server/src/services/llm-provider.service.ts'
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'server/src/ai/**'
      - 'server/src/services/llm-provider.service.ts'
  schedule:
    - cron: '0 0 * * 1' # 每周一运行

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit and integration tests
        run: npm run test:ai
        
      - name: Run E2E tests (limited)
        if: github.event_name == 'schedule' || github.ref == 'refs/heads/main'
        run: npm run test:ai:e2e
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## 测试监控与报告

我们将监控测试结果并生成报告。

### 监控指标

1. **测试覆盖率**：代码覆盖率指标
2. **通过率**：测试通过率
3. **响应质量**：LLM响应质量评分
4. **响应时间**：LLM响应时间

### 报告生成

1. **测试报告**：生成详细的测试报告
2. **趋势分析**：分析测试结果的趋势
3. **质量仪表板**：创建质量监控仪表板

## 成本优化

为了控制测试成本，我们采用以下策略：

1. **模拟优先**：优先使用模拟测试，减少实际API调用
2. **批量测试**：将多个测试合并为一个API调用
3. **缓存响应**：缓存LLM响应以避免重复调用
4. **选择性E2E测试**：只在关键节点运行完整的E2E测试

## 最佳实践

1. **隔离依赖**：隔离LLM API依赖，便于测试
2. **测试可重现性**：确保测试可重现
3. **测试数据隐私**：保护测试数据隐私
4. **持续改进**：基于测试结果持续改进AI功能
