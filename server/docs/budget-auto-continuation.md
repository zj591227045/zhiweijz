# 预算自动延续功能（支持自定义结转日期）

## 功能概述

预算自动延续功能解决了用户跨月后无法看到预算数据的问题。系统采用混合方案，结合自动延续和定时任务两种机制，确保用户始终能够看到相应的预算数据。

**🎉 新增特性：完整支持自定义结转日期（refreshDay）**
- 支持1、5、10、15、20、25日作为预算刷新日期
- 预算周期不再固定为月初到月末，而是从refreshDay到下月refreshDay前一天
- 支持跨月预算查询和管理

## 核心特性

### 1. 自动预算延续（主要机制）
- **触发时机**：用户访问预算相关页面时
- **工作原理**：如果没有找到当前月份的预算，自动查找最近的历史预算并创建缺失的月份预算
- **优势**：实时响应，用户体验好

### 2. 定时任务备份（备份机制）
- **触发时机**：每月1号凌晨自动执行
- **工作原理**：批量为所有用户创建新月份预算，处理预算结转
- **优势**：确保系统稳定性，避免遗漏

### 3. 预算结转处理
- **自动结转**：创建新月份预算时自动处理上个月的结转
- **历史追溯**：支持重新计算历史记账对结转的影响
- **数据完整性**：确保结转金额计算准确

## 技术实现

### 核心方法

#### `autoCreateMissingBudgets(userId, accountBookId)`
自动创建缺失的预算周期（支持自定义refreshDay）
```typescript
// 查找最近的预算
const latestBudget = await this.findLatestPersonalBudget(userId, accountBookId);
const refreshDay = latestBudget.refreshDay || 1;

// 计算需要创建的预算周期
const periodsToCreate = BudgetDateUtils.calculateMissingPeriods(
  latestEndDate,
  currentDate,
  refreshDay
);

// 逐个创建预算并处理结转
for (const period of periodsToCreate) {
  if (latestBudget.rollover) {
    await this.processBudgetRollover(previousBudgetId);
  }
  const newBudget = await this.createBudgetForPeriod(latestBudget, period);
}
```

#### `BudgetDateUtils` 工具类
专门处理自定义refreshDay的日期计算
```typescript
// 计算预算周期
const period = BudgetDateUtils.calculateBudgetPeriod(2024, 6, 15);
// 结果：2024年6月15日 - 2024年7月14日

// 获取当前预算周期
const currentPeriod = BudgetDateUtils.getCurrentBudgetPeriod(new Date(), 25);

// 计算缺失的预算周期
const missingPeriods = BudgetDateUtils.calculateMissingPeriods(
  lastEndDate,
  currentDate,
  refreshDay
);
```

#### `getActiveBudgets(userId, accountBookId)`
获取活跃预算（已集成自动延续）
```typescript
// 先查询当前月份预算
let budgets = await this.budgetRepository.findActiveBudgets(userId, new Date(), accountBookId);

// 如果没有找到，自动创建
if (budgets.length === 0 && accountBookId) {
  await this.autoCreateMissingBudgets(userId, accountBookId);
  budgets = await this.budgetRepository.findActiveBudgets(userId, new Date(), accountBookId);
}
```

### 定时任务

#### 月度预算创建任务
```bash
# 手动执行
npm run budget-scheduler

# 设置cron job（每月1号凌晨2点）
0 2 1 * * /path/to/node /path/to/project/server/scripts/budget-scheduler.ts
```

#### 任务内容
1. **处理过期预算结转**：处理上个月结束的预算结转
2. **创建新月份预算**：为需要的用户创建当前月份预算
3. **清理历史记录**：清理超过一年的预算历史记录

## 数据流程

### 用户访问预算页面
```
用户请求 → getActiveBudgets() → 查询当前月份预算
    ↓
没有找到预算 → autoCreateMissingBudgets() → 查找历史预算
    ↓
找到历史预算 → calculateMissingMonths() → 计算缺失月份
    ↓
逐月创建预算 → processBudgetRollover() → 处理结转
    ↓
createNextPeriodBudget() → 创建新预算 → 返回预算数据
```

### 定时任务执行
```
每月1号凌晨 → runAllScheduledTasks()
    ↓
processExpiredBudgetRollovers() → 处理上月结转
    ↓
createMonthlyBudgetsForAllUsers() → 批量创建预算
    ↓
cleanupOldBudgetHistory() → 清理历史记录
```

## 配置说明

### 环境变量
无需额外配置，使用现有的数据库连接配置。

### 数据库表
使用现有的表结构，并新增refreshDay字段：
- `budgets`：预算主表（新增 `refresh_day` 字段）
- `budget_history`：预算历史记录表
- `transactions`：记账记录表

#### 数据库变更
```sql
-- 添加refresh_day字段
ALTER TABLE "budgets" ADD COLUMN "refresh_day" INTEGER DEFAULT 1;

-- 添加约束确保有效值
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_refresh_day_check"
CHECK ("refresh_day" IN (1, 5, 10, 15, 20, 25));

-- 设置现有数据的默认值
UPDATE "budgets" SET "refresh_day" = 1 WHERE "refresh_day" IS NULL;
ALTER TABLE "budgets" ALTER COLUMN "refresh_day" SET NOT NULL;
```

### 日志输出
系统会输出详细的日志信息，便于监控和调试：
```
用户 xxx 在账本 xxx 中没有找到活跃预算，尝试自动创建
找到最近的预算: 个人预算, 结束日期: 2024-05-31
需要创建 1 个月份的预算
创建 2024-6 的预算
成功创建预算: 个人预算 (budget-id)
```

## 监控和维护

### 性能监控
- 监控自动创建预算的频率和耗时
- 关注定时任务的执行状态
- 检查预算结转计算的准确性

### 错误处理
- 自动创建失败不会影响正常的预算查询
- 定时任务失败会记录错误日志
- 支持手动重新执行定时任务

### 数据一致性
- 预算创建使用事务确保数据一致性
- 结转计算支持重新计算功能
- 历史记录完整保留审计轨迹

## 故障排除

### 常见问题

1. **用户仍然看不到预算数据**
   - 检查是否有历史预算记录
   - 确认账本ID是否正确
   - 查看服务器日志中的错误信息

2. **预算结转金额不正确**
   - 使用 `recalculateBudgetRollover` 方法重新计算
   - 检查历史记账记录是否完整
   - 确认预算的结转设置

3. **定时任务未执行**
   - 检查cron job配置
   - 手动执行 `npm run budget-scheduler` 测试
   - 查看系统日志

### 手动修复
```bash
# 为特定用户创建预算
npm run budget-scheduler

# 重新计算预算结转
# 通过API调用 POST /budgets/{id}/recalculate-rollover
```

## 版本兼容性

- **前端兼容性**：无需修改前端代码，API接口保持不变
- **数据库兼容性**：使用现有表结构，无需迁移
- **向后兼容**：现有预算数据完全兼容新功能
