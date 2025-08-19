# 数据库迁移修复指南

## 问题分析

### 根本原因
1. **缺少 primary_budget_id 字段**：Prisma schema 中定义了该字段，但迁移文件中没有添加
2. **类型转换错误**：数据完整性检查中直接比较 `BudgetType` 枚举和文本，PostgreSQL 需要显式类型转换
3. **迁移不完整**：`add-multi-budget-allocation.sql` 迁移文件缺少关键字段

### 错误症状
```
ERROR: operator does not exist: "BudgetType" = text
HINT: No operator matches the given name and argument types. You might need to add explicit type casts.

The column `transactions.primary_budget_id` does not exist in the current database.
```

## 修复方案

### 1. 已修复的文件

#### A. `server/migrations/incremental/add-multi-budget-allocation.sql`
- ✅ 添加了 `primary_budget_id` 字段
- ✅ 添加了相应的索引
- ✅ 添加了字段注释

#### B. `server/migrations/data-integrity-check.js`
- ✅ 修复了 `budget_type` 字段的类型转换问题
- ✅ 在查询中使用 `budget_type::text` 进行显式转换

#### C. `server/migrations/migration-status.js`
- ✅ 修复了相同的类型转换问题

### 2. 部署步骤

#### 步骤 1：更新代码
```bash
# 拉取最新的修复代码
git pull origin main
```

#### 步骤 2：重新构建容器
```bash
# 重新构建后端容器
sudo docker-compose build backend

# 或者如果使用单独的 Dockerfile
sudo docker build -t zhiweijz-backend .
```

#### 步骤 3：停止现有服务
```bash
sudo docker-compose down
```

#### 步骤 4：启动服务
```bash
sudo docker-compose up -d
```

#### 步骤 5：验证修复
```bash
# 查看后端日志
sudo docker logs -f zhiweijz-backend

# 应该看到类似输出：
# ✅ 数据库连接成功
# ✅ budgets表数据完整性检查完成
# ✅ categories表数据完整性检查完成
# ✅ 重复约束检查完成
# ✅ 数据完整性检查完成
# ✅ 迁移 add-multi-budget-allocation 执行完成
# ✅ 数据库成功升级到版本 1.8.3
```

### 3. 手动修复（如果自动迁移失败）

如果自动迁移仍然失败，可以手动执行以下 SQL：

```sql
-- 1. 添加缺失的字段
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS primary_budget_id VARCHAR(255);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_transactions_primary_budget_id ON transactions(primary_budget_id);

-- 3. 添加注释
COMMENT ON COLUMN transactions.primary_budget_id IS '主预算ID：用于标识交易的主要预算关联';
```

### 4. 验证修复

#### A. 检查字段是否存在
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions' 
AND column_name IN ('primary_budget_id', 'is_multi_budget', 'budget_allocation');
```

#### B. 检查索引是否存在
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'transactions'
AND indexname LIKE 'idx_transactions_%';
```

#### C. 测试应用查询
```bash
# 访问仪表盘页面，检查是否正常加载数据
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/statistics/budgets?accountBookId=YOUR_ACCOUNT_BOOK_ID&month=2025-08
```

## 预防措施

### 1. 迁移文件检查清单
- [ ] 所有 Prisma schema 中的字段都在迁移文件中定义
- [ ] 所有索引都正确创建
- [ ] 类型转换使用显式语法（如 `enum_field::text`）
- [ ] 错误处理使用 `DO $$ BEGIN ... EXCEPTION` 块

### 2. 部署前测试
```bash
# 在本地环境测试迁移
cd server
npm run migration:test

# 或使用测试脚本
node migrations/test-migration-fix.js
```

### 3. 监控指标
- 数据库连接状态
- 迁移执行时间
- 应用启动时间
- API 响应状态

## 故障排除

### 常见问题

#### 1. 字段仍然不存在
```bash
# 检查迁移是否真正执行
sudo docker exec -it zhiweijz-backend psql $DATABASE_URL -c "\d transactions"
```

#### 2. 类型转换错误持续
```bash
# 检查 PostgreSQL 版本和枚举类型定义
sudo docker exec -it zhiweijz-backend psql $DATABASE_URL -c "\dT+ BudgetType"
```

#### 3. 权限问题
```bash
# 检查数据库用户权限
sudo docker exec -it zhiweijz-backend psql $DATABASE_URL -c "\du"
```

## 联系支持

如果问题持续存在，请提供以下信息：
1. 完整的错误日志
2. 数据库结构输出 (`\d transactions`)
3. 迁移历史记录
4. 系统环境信息
