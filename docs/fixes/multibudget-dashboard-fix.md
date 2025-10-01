# 多人预算分摊在仪表盘和预算分析页面显示修复

## 问题描述

在添加和修改记账记录时，选择多人预算分摊后，保存的记账记录及金额没有统计到以下页面：

1. **仪表盘页面**（`/dashboard`）的预算执行情况组件 ✅ 已修复
2. **预算分析页面**（`/budgets/statistics`）
   - ❌ "已用"金额显示错误（显示30元，实际应该是10元）
   - ❌ "最近记账"组件不显示多人预算分摊记录

但是在**统计页面**（`/statistics`）中能够正确显示分摊的记账金额。

### 用户反馈截图分析

**第一次反馈：**
- 仪表盘显示：个人预算已用 ¥0.00 / ¥1,528.77（0.0%）
- 预算分析页面显示：已用 ¥0.00（0.0%）
- 统计页面显示：支出 ¥26.00（正确）

**第二次反馈（修复后）：**
- 仪表盘显示：个人预算已用 ¥10.00 / ¥2,000.00（0.5%）✅ 正确
- 预算分析页面显示：已用 ¥30.00（1.5%）❌ 错误（应该是¥10.00）
- 预算分析页面"最近记账"：暂无记账记录 ❌ 错误（应该显示20元的记账记录）

## 根本原因分析

### 数据存储方式

多人预算分摊记录的存储结构：

```typescript
{
  id: "xxx",
  amount: 52.00,              // 总金额
  budgetId: null,             // 多人预算分摊记录的budgetId为null
  isMultiBudget: true,        // 标记为多人预算分摊
  budgetAllocation: [         // 分摊详情存储在JSON字段中
    {
      budgetId: "budget-1",
      budgetName: "张三个人预算",
      memberName: "张三",
      amount: 26
    },
    {
      budgetId: "budget-2",
      budgetName: "朵朵个人预算",
      memberName: "朵朵",
      amount: 26
    }
  ]
}
```

### 问题代码

**文件：** `server/src/repositories/budget.repository.ts`

#### 1. `calculateSpentAmount` 方法（第365-413行）

```typescript
async calculateSpentAmount(budgetId: string): Promise<number> {
  // ... 省略预算查询代码 ...
  
  // 构建查询条件 - 只查询budgetId字段匹配的记录
  const where: Prisma.TransactionWhereInput = {
    type: 'EXPENSE',
    date: { gte: budget.startDate, lte: budget.endDate },
    budgetId: budgetId,  // ❌ 这里只能查到单人预算记录
  };
  
  const result = await prisma.transaction.aggregate({
    where,
    _sum: { amount: true },
  });
  
  return result._sum.amount ? Number(result._sum.amount) : 0;
}
```

**问题：** 只查询 `budgetId` 字段匹配的记录，无法查询到 `budgetId` 为 `null` 的多人预算分摊记录。

#### 2. `calculateMemberSpentAmount` 方法（第56-139行）

同样的问题，只查询了单人预算记录，没有处理多人预算分摊。

### 为什么统计页面正确？

统计页面使用的是 `TransactionRepository.findByDateRange` 方法，该方法已经正确实现了多人预算分摊的处理逻辑：

```typescript
// server/src/repositories/transaction.repository.ts (第227-296行)
if (budgetIds && budgetIds.length > 0) {
  filteredTransactions = transactions.filter(transaction => {
    // 单人预算记录直接通过
    if (transaction.budgetId && targetBudgetIds.includes(transaction.budgetId)) {
      return true;
    }
    
    // ✅ 多人预算分摊记录需要检查budgetAllocation
    if (transaction.isMultiBudget && transaction.budgetAllocation) {
      const budgetAllocation = JSON.parse(transaction.budgetAllocation);
      return budgetAllocation.some(allocation =>
        targetBudgetIds.includes(allocation.budgetId)
      );
    }
    
    return false;
  });
}
```

## 修复方案

### 修改 `calculateSpentAmount` 方法

**文件：** `server/src/repositories/budget.repository.ts`

```typescript
async calculateSpentAmount(budgetId: string): Promise<number> {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: { category: true },
  });

  if (!budget) {
    throw new Error('预算不存在');
  }

  // 1. 计算单人预算记录的支出
  const where: Prisma.TransactionWhereInput = {
    type: 'EXPENSE',
    date: {
      gte: budget.startDate,
      ...(budget.endDate && { lte: budget.endDate }),
    },
    budgetId: budgetId,
  };

  const result = await prisma.transaction.aggregate({
    where,
    _sum: { amount: true },
  });

  let totalSpent = result._sum.amount ? Number(result._sum.amount) : 0;

  // 2. 查询多人预算分摊记录
  const multibudgetWhere: Prisma.TransactionWhereInput = {
    type: 'EXPENSE',
    date: {
      gte: budget.startDate,
      ...(budget.endDate && { lte: budget.endDate }),
    },
    isMultiBudget: true,
    budgetAllocation: {
      not: Prisma.DbNull,
    },
  };

  if (budget.accountBookId) {
    multibudgetWhere.accountBookId = budget.accountBookId;
  }

  const multibudgetTransactions = await prisma.transaction.findMany({
    where: multibudgetWhere,
    select: {
      id: true,
      amount: true,
      budgetAllocation: true,
    },
  });

  // 3. 计算多人预算分摊金额
  for (const transaction of multibudgetTransactions) {
    try {
      let budgetAllocation;
      const allocationData = transaction.budgetAllocation;

      if (typeof allocationData === 'string') {
        budgetAllocation = JSON.parse(allocationData);
      } else if (typeof allocationData === 'object') {
        budgetAllocation = allocationData;
      }

      if (Array.isArray(budgetAllocation)) {
        const targetAllocation = budgetAllocation.find(
          (allocation: any) => allocation.budgetId === budgetId
        );

        if (targetAllocation) {
          const allocationAmount = Number(targetAllocation.amount);
          totalSpent += allocationAmount;
          console.log(
            `多人预算分摊记录 ${transaction.id}：总金额 ${transaction.amount}，分摊金额 ${allocationAmount}`
          );
        }
      }
    } catch (error) {
      console.error('解析预算分摊数据失败:', error);
    }
  }

  console.log(`预算 ${budgetId} 总支出: ${totalSpent}`);
  return totalSpent;
}
```

### 修改 `calculateMemberSpentAmount` 方法

同样的修复逻辑应用到 `calculateMemberSpentAmount` 方法，增加对多人预算分摊记录的查询和计算。

### 修改 `getTransactionsByBudget` 方法

**文件：** `server/src/services/transaction.service.ts`

**问题：** 该方法用于获取预算相关的记账记录，但只查询 `budgetId` 字段匹配的记录，导致多人预算分摊记录无法显示在"最近记账"组件中。

**修复方案：**

```typescript
async getTransactionsByBudget(
  budgetId: string,
  page: number = 1,
  limit: number = 10,
  familyMemberId?: string | null,
): Promise<any> {
  // 1. 查询单人预算记录
  const singleBudgetTransactions = await prisma.transaction.findMany({
    where: {
      budgetId: budgetId,
      date: { gte: budget.startDate, lte: budget.endDate },
      type: 'EXPENSE',
    },
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  // 2. 查询多人预算分摊记录
  const multiBudgetTransactions = await prisma.transaction.findMany({
    where: {
      date: { gte: budget.startDate, lte: budget.endDate },
      type: 'EXPENSE',
      isMultiBudget: true,
      budgetAllocation: { not: null },
    },
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  // 3. 过滤多人预算分摊记录，只保留包含当前预算的记录
  const filteredMultiBudgetTransactions = multiBudgetTransactions.filter((transaction) => {
    const budgetAllocation = JSON.parse(transaction.budgetAllocation);
    return budgetAllocation.some((allocation) => allocation.budgetId === budgetId);
  });

  // 4. 合并两种记录并排序
  const allTransactions = [...singleBudgetTransactions, ...filteredMultiBudgetTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 5. 分页
  const total = allTransactions.length;
  const paginatedTransactions = allTransactions.slice((page - 1) * limit, page * limit);

  return {
    data: paginatedTransactions,
    total,
    page,
    limit,
    hasMore: page * limit < total,
    nextPage: page * limit < total ? page + 1 : null,
  };
}
```

## 修复效果

修复后，以下页面将正确显示多人预算分摊的金额：

1. **仪表盘页面**（`/dashboard`）✅
   - 预算执行情况组件将正确显示分摊给该用户的金额
   - 例如：个人预算已用 ¥10.00 / ¥2,000.00（0.5%）

2. **预算分析页面**（`/budgets/statistics`）✅
   - 预算概览将正确显示分摊金额
   - "最近记账"组件将显示多人预算分摊记录
   - 预算趋势图将包含分摊记录
   - 分类预算统计将包含分摊记录

3. **统计页面**（`/statistics`）✅
   - 保持原有的正确显示

## 测试验证

创建了测试文件 `server/src/tests/budget-multibudget-fix.test.ts`，包含以下测试用例：

1. ✅ 应该正确计算单人预算记录的支出
2. ✅ 应该正确计算多人预算分摊记录的支出
3. ✅ 应该正确处理混合的单人和多人预算记录
4. ✅ 应该忽略不属于该预算的多人预算分摊记录

## 相关文件

### 修改的文件
- `server/src/repositories/budget.repository.ts`
  - `calculateSpentAmount` 方法（第451-558行）- 修复预算已用金额计算
  - `calculateMemberSpentAmount` 方法（第65-222行）- 修复成员预算已用金额计算
- `server/src/services/transaction.service.ts`
  - `getTransactionsByBudget` 方法（第785-964行）- 修复预算相关记账记录查询

### 测试文件
- `server/src/tests/budget-multibudget-fix.test.ts`

### 相关文档
- `server/migrations/incremental/add-multi-budget-allocation.sql` - 多人预算分摊数据库迁移
- `server/src/models/transaction.model.ts` - 多人预算分摊数据模型

## 注意事项

1. **向后兼容性**：修复完全向后兼容，不影响现有的单人预算记录
2. **性能考虑**：增加了一次额外的数据库查询来获取多人预算分摊记录，但查询有索引支持
3. **数据一致性**：确保所有使用预算支出计算的地方都能正确处理多人预算分摊

## 部署建议

1. 部署前建议先在测试环境验证
2. 运行测试用例确保修复正确
3. 部署后观察日志，确认多人预算分摊记录被正确识别和计算
4. 建议用户刷新仪表盘和预算分析页面，查看更新后的数据

