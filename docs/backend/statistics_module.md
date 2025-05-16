# 统计分析模块技术文档

## 概述

统计分析模块提供了对用户财务数据的分析和可视化功能，包括支出统计、收入统计、预算执行情况和财务概览等。该模块支持个人账本和家庭账本的数据分析，并提供多种时间维度的数据聚合。

## 服务层 (Service)

### StatisticsService

统计服务实现了与财务数据分析相关的业务逻辑。

主要方法：
- `getExpenseStatistics(userId: string, startDate: Date, endDate: Date, groupBy?: string, familyId?: string): Promise<ExpenseStatisticsResponseDto>`
- `getIncomeStatistics(userId: string, startDate: Date, endDate: Date, groupBy?: string, familyId?: string): Promise<IncomeStatisticsResponseDto>`
- `getBudgetStatistics(userId: string, month: string, familyId?: string): Promise<BudgetStatisticsResponseDto>`
- `getFinancialOverview(userId: string, startDate: Date, endDate: Date, familyId?: string): Promise<FinancialOverviewResponseDto>`

私有辅助方法：
- `groupTransactionsByDate(transactions: any[], groupBy: string): Array<{ date: string; amount: number }>`
- `groupTransactionsByCategory(transactions: any[], categories: Map<string, any>, total: number): Array<{ category: { id: string; name: string; icon?: string }; amount: number; percentage: number }>`
- `calculateBudgetByCategory(budgets: any[], transactions: any[], categories: Map<string, any>): Array<{ category: { id: string; name: string; icon?: string }; budget: number; spent: number; remaining: number; percentage: number }>`
- `getCategoriesMap(userId: string, familyId?: string): Promise<Map<string, any>>`
- `isUserFamilyMember(userId: string, familyId: string): Promise<boolean>`

## 控制器层 (Controller)

### StatisticsController

统计控制器处理与财务数据分析相关的HTTP请求。

主要方法：
- `getExpenseStatistics(req: Request, res: Response): Promise<void>`
- `getIncomeStatistics(req: Request, res: Response): Promise<void>`
- `getBudgetStatistics(req: Request, res: Response): Promise<void>`
- `getFinancialOverview(req: Request, res: Response): Promise<void>`

## API端点

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /api/statistics/expenses | 获取支出统计 | 已认证用户 |
| GET | /api/statistics/income | 获取收入统计 | 已认证用户 |
| GET | /api/statistics/budgets | 获取预算执行情况 | 已认证用户 |
| GET | /api/statistics/overview | 获取财务概览 | 已认证用户 |

## 查询参数

### 支出和收入统计

| 参数 | 类型 | 描述 | 默认值 |
|------|------|------|------|
| startDate | string (YYYY-MM-DD) | 开始日期 | 当前日期前30天 |
| endDate | string (YYYY-MM-DD) | 结束日期 | 当前日期 |
| groupBy | string | 分组方式 (day/week/month/category) | day |
| familyId | string (UUID) | 家庭ID (可选) | - |

### 预算执行情况

| 参数 | 类型 | 描述 | 默认值 |
|------|------|------|------|
| month | string (YYYY-MM) | 月份 | 当前月份 |
| familyId | string (UUID) | 家庭ID (可选) | - |

### 财务概览

| 参数 | 类型 | 描述 | 默认值 |
|------|------|------|------|
| startDate | string (YYYY-MM-DD) | 开始日期 | 当前日期前30天 |
| endDate | string (YYYY-MM-DD) | 结束日期 | 当前日期 |
| familyId | string (UUID) | 家庭ID (可选) | - |

## 响应数据结构

### 支出统计 (ExpenseStatisticsResponseDto)

```typescript
{
  total: number;                                // 总支出
  data: Array<{                                 // 按日期分组的数据
    date: string;                               // 日期 (格式取决于groupBy)
    amount: number;                             // 金额
  }>;
  byCategory: Array<{                           // 按分类分组的数据
    category: {
      id: string;                               // 分类ID
      name: string;                             // 分类名称
      icon?: string;                            // 分类图标
    };
    amount: number;                             // 金额
    percentage: number;                         // 占总支出的百分比
  }>;
}
```

### 收入统计 (IncomeStatisticsResponseDto)

```typescript
{
  total: number;                                // 总收入
  data: Array<{                                 // 按日期分组的数据
    date: string;                               // 日期 (格式取决于groupBy)
    amount: number;                             // 金额
  }>;
  byCategory: Array<{                           // 按分类分组的数据
    category: {
      id: string;                               // 分类ID
      name: string;                             // 分类名称
      icon?: string;                            // 分类图标
    };
    amount: number;                             // 金额
    percentage: number;                         // 占总收入的百分比
  }>;
}
```

### 预算执行情况 (BudgetStatisticsResponseDto)

```typescript
{
  totalBudget: number;                          // 总预算
  totalSpent: number;                           // 总支出
  remaining: number;                            // 剩余预算
  percentage: number;                           // 预算使用百分比
  categories: Array<{                           // 按分类的预算执行情况
    category: {
      id: string;                               // 分类ID
      name: string;                             // 分类名称
      icon?: string;                            // 分类图标
    };
    budget: number;                             // 预算金额
    spent: number;                              // 已支出金额
    remaining: number;                          // 剩余金额
    percentage: number;                         // 预算使用百分比
  }>;
}
```

### 财务概览 (FinancialOverviewResponseDto)

```typescript
{
  income: number;                               // 总收入
  expense: number;                              // 总支出
  netIncome: number;                            // 净收入 (收入-支出)
  topIncomeCategories: Array<{                  // 收入最高的分类
    category: {
      id: string;                               // 分类ID
      name: string;                             // 分类名称
      icon?: string;                            // 分类图标
    };
    amount: number;                             // 金额
    percentage: number;                         // 占总收入的百分比
  }>;
  topExpenseCategories: Array<{                 // 支出最高的分类
    category: {
      id: string;                               // 分类ID
      name: string;                             // 分类名称
      icon?: string;                            // 分类图标
    };
    amount: number;                             // 金额
    percentage: number;                         // 占总支出的百分比
  }>;
}
```

## 数据聚合

统计分析模块支持多种数据聚合方式：

1. **按日期聚合**
   - 按天：返回每天的总金额 (YYYY-MM-DD)
   - 按周：返回每周的总金额 (以周一为起始日)
   - 按月：返回每月的总金额 (YYYY-MM)

2. **按分类聚合**
   - 返回每个分类的总金额和占比

## 家庭数据访问控制

当请求包含familyId参数时，系统会验证用户是否为该家庭的成员：

1. 如果用户是家庭成员，则返回该家庭的统计数据
2. 如果用户不是家庭成员，则返回403错误

## 测试

统计分析模块包含以下测试：

1. **单元测试**
   - 测试数据聚合逻辑
   - 测试权限控制机制
   - 测试各种边界情况

2. **集成测试**
   - 测试API端点
   - 测试数据库交互
   - 测试完整的数据流

## 注意事项

1. 日期范围过大可能会影响性能
2. 预算执行情况仅支持按月查询
3. 财务概览返回的是指定日期范围内的数据
4. 家庭数据只对家庭成员可见
