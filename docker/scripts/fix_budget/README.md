# 预算修复脚本使用说明

## 概述

这些SQL脚本用于修复9月1日没有自动创建的用户和托管用户个人预算问题。脚本基于git版本30cc559到e26859613的预算结转逻辑修复。

## 脚本说明

### 1. fix_september_budget_creation.sql
**主要修复脚本** - 创建缺失的9月份个人预算

**功能：**
- 为所有注册用户创建缺失的2025年9月个人预算
- 为所有托管用户创建缺失的2025年9月个人预算  
- 为所有托管成员（family_members）创建缺失的2025年9月个人预算
- 正确处理预算结转逻辑（包括余额结转和债务结转）
- 自动创建8月份的预算结转历史记录

**处理对象：**
- `users` 表中 `is_custodial = false` 的注册用户
- `users` 表中 `is_custodial = true` 的托管用户
- `family_members` 表中 `is_custodial = true` 的托管成员

### 2. fix_budget_rollover_history.sql
**结转历史修复脚本** - 修复预算结转历史记录

**功能：**
- 为所有已过期且启用结转的预算创建缺失的结转历史记录
- 修正不正确的预算结转金额
- 确保预算结转链条的正确性

## 使用方法

### 前提条件
1. 确保有数据库访问权限
2. 根据 `docker/docker-compose.yml` 中的配置连接数据库

### 数据库连接信息
根据docker-compose.yml配置：
```bash
# 数据库连接参数（从环境变量获取）
POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}  
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_HOST=${DB_HOST}
POSTGRES_PORT=${DB_PORT}
```

### 执行步骤

#### 步骤1：执行主修复脚本
```bash
# 连接到数据库并执行主修复脚本
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < fix_september_budget_creation.sql
```

#### 步骤2：执行结转历史修复脚本（可选）
```bash
# 如果需要修复历史结转记录
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < fix_budget_rollover_history.sql
```

### 验证结果

#### 1. 检查9月份用户预算创建情况
```sql
SELECT 
  u.name as 用户名,
  u.is_custodial as 是否托管,
  ab.name as 账本名称,
  b.name as 预算名称,
  b.amount as 预算金额,
  b.rollover_amount as 结转金额,
  b.start_date as 开始日期,
  b.end_date as 结束日期
FROM budgets b
JOIN users u ON b.user_id = u.id
JOIN account_books ab ON b.account_book_id = ab.id
WHERE b.start_date >= '2025-09-01'
  AND b.start_date <= '2025-09-01'
  AND b.budget_type = 'PERSONAL'
  AND b.period = 'MONTHLY'
ORDER BY u.is_custodial, u.name;
```

#### 2. 检查9月份托管成员预算创建情况
```sql
SELECT 
  fm.name as 托管成员名,
  ab.name as 账本名称,
  b.name as 预算名称,
  b.amount as 预算金额,
  b.rollover_amount as 结转金额,
  b.start_date as 开始日期,
  b.end_date as 结束日期
FROM budgets b
JOIN family_members fm ON b.family_member_id = fm.id
JOIN account_books ab ON b.account_book_id = ab.id
WHERE b.start_date >= '2025-09-01'
  AND b.start_date <= '2025-09-01'
  AND b.budget_type = 'PERSONAL'
  AND b.period = 'MONTHLY'
  AND fm.is_custodial = true
ORDER BY fm.name;
```

#### 3. 检查结转历史记录
```sql
SELECT 
  bh.period as 期间,
  bh.type as 类型,
  bh.amount as 结转金额,
  bh.description as 描述,
  bh.created_at as 创建时间
FROM budget_histories bh
WHERE bh.period = '2025-8'
  AND bh.type IN ('SURPLUS', 'DEFICIT')
ORDER BY bh.created_at DESC;
```

## 脚本特性

### 安全特性
- **事务保护**：所有操作都在事务中执行，出错时自动回滚
- **重复执行安全**：脚本可以安全地重复执行，不会创建重复数据
- **详细日志**：提供详细的执行日志，便于跟踪和调试

### 智能处理
- **自动结转计算**：根据上个月的预算金额、结转金额和实际支出自动计算结转金额
- **历史记录创建**：自动为8月份预算创建结转历史记录
- **多用户类型支持**：同时处理注册用户、托管用户和托管成员

### 数据完整性
- **关联关系保持**：保持所有外键关联关系的正确性
- **字段完整性**：确保所有必需字段都有正确的值
- **时间一致性**：使用北京时间确保时间的一致性

## 注意事项

1. **备份数据**：执行脚本前建议备份数据库
2. **测试环境**：建议先在测试环境执行验证
3. **权限要求**：需要数据库的读写权限
4. **执行时间**：根据数据量大小，执行时间可能较长
5. **监控日志**：执行过程中注意观察日志输出

## 故障排除

### 常见问题
1. **权限不足**：确保数据库用户有足够的权限
2. **连接失败**：检查数据库连接参数是否正确
3. **数据冲突**：如果出现唯一约束冲突，可能是数据已存在

### 回滚操作
如果需要回滚，可以删除脚本创建的数据：
```sql
-- 删除9月份创建的预算（谨慎操作）
DELETE FROM budgets 
WHERE start_date >= '2025-09-01' 
  AND start_date <= '2025-09-01'
  AND created_at >= '当前日期';
```

## 联系支持
如果在执行过程中遇到问题，请保存完整的错误日志以便分析。
