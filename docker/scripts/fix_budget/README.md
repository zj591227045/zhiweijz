# 预算修复脚本使用说明

## 概述

这些脚本用于修复缺失的用户和托管用户个人预算问题。脚本基于git版本30cc559到e26859613的预算结转逻辑修复，现已升级为通用工具，支持修复任意月份的预算。

## 脚本说明

### 1. fix_current_month_budget_creation.sql
**通用预算修复脚本** - 创建缺失的指定月份个人预算

**功能：**
- 为所有注册用户创建缺失的指定月份个人预算
- 为所有托管用户创建缺失的指定月份个人预算
- 为所有托管成员（family_members）创建缺失的指定月份个人预算
- 正确处理预算结转逻辑（包括余额结转和债务结转）
- 自动创建上个月的预算结转历史记录
- 支持通过变量指定目标年月，默认为当前月份

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

### 3. run_budget_fix.sh
**自动化执行脚本** - 简化修复操作

**功能：**
- 自动读取 `docker/.env` 配置文件
- 自动连接数据库并执行修复脚本
- 支持指定年月或使用当前月份
- 提供交互式确认和错误处理
- 支持执行结转历史修复

## 使用方法

### 方法一：使用自动化脚本（推荐）

#### 前提条件
1. 确保 `docker/.env` 文件存在且配置正确
2. 安装PostgreSQL客户端（psql命令）
3. 确保数据库可访问

#### 执行步骤
```bash
# 进入脚本目录
cd docker/scripts/fix_budget

# 修复当前月份
./run_budget_fix.sh

# 修复指定月份（例如2025年9月）
./run_budget_fix.sh 2025 9

# 修复指定月份（例如2025年10月）
./run_budget_fix.sh 2025 10
```

### 方法二：手动执行SQL脚本

#### 数据库连接信息
根据 `docker/.env` 配置，脚本支持两种变量命名方式：
```bash
# 方式1：使用POSTGRES_*变量（docker-compose.yml标准）
POSTGRES_DB=zhiweijz
POSTGRES_USER=zhiweijz
POSTGRES_PASSWORD=zhiweijz123

# 方式2：使用DB_*变量（项目自定义）
DB_NAME=zhiweijz
DB_USER=zhiweijz
DB_PASSWORD=zhiweijz123

# 连接配置
DB_HOST=localhost  # 或实际的数据库主机（默认localhost）
DB_PORT=5432       # 或实际的数据库端口（默认5432）
```

**注意**：脚本会自动兼容两种命名方式，优先使用`POSTGRES_*`变量，如果不存在则使用`DB_*`变量。

#### 执行步骤

**步骤1：执行主修复脚本**
```bash
# 修复当前月份（使用默认值）
psql -h $DB_HOST -p $DB_PORT -U $POSTGRES_USER -d $POSTGRES_DB < fix_current_month_budget_creation.sql

# 修复指定月份（例如2025年9月）
psql -h $DB_HOST -p $DB_PORT -U $POSTGRES_USER -d $POSTGRES_DB \
  -v target_year=2025 \
  -v target_month=9 \
  < fix_current_month_budget_creation.sql
```

**步骤2：执行结转历史修复脚本（可选）**
```bash
# 修复历史结转记录
psql -h $DB_HOST -p $DB_PORT -U $POSTGRES_USER -d $POSTGRES_DB < fix_budget_rollover_history.sql
```

### 验证结果

#### 1. 检查指定月份用户预算创建情况
```sql
-- 替换YYYY-MM为实际的年月，例如2025-09
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
WHERE b.start_date >= 'YYYY-MM-01'
  AND b.start_date <= 'YYYY-MM-01'
  AND b.budget_type = 'PERSONAL'
  AND b.period = 'MONTHLY'
ORDER BY u.is_custodial, u.name;
```

#### 2. 检查指定月份托管成员预算创建情况
```sql
-- 替换YYYY-MM为实际的年月，例如2025-09
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
WHERE b.start_date >= 'YYYY-MM-01'
  AND b.start_date <= 'YYYY-MM-01'
  AND b.budget_type = 'PERSONAL'
  AND b.period = 'MONTHLY'
  AND fm.is_custodial = true
ORDER BY fm.name;
```

#### 3. 检查结转历史记录
```sql
-- 替换YYYY-M为实际的年月，例如2025-8（注意月份不带前导零）
SELECT
  bh.period as 期间,
  bh.type as 类型,
  bh.amount as 结转金额,
  bh.description as 描述,
  bh.created_at as 创建时间
FROM budget_histories bh
WHERE bh.period = 'YYYY-M'
  AND bh.type IN ('SURPLUS', 'DEFICIT')
ORDER BY bh.created_at DESC;
```

#### 4. 快速统计查询
```sql
-- 统计指定月份预算总数
SELECT
  '总预算数' as 统计项,
  COUNT(*) as 数量
FROM budgets
WHERE start_date >= 'YYYY-MM-01'
  AND start_date <= 'YYYY-MM-01'
  AND budget_type = 'PERSONAL'
  AND period = 'MONTHLY'

UNION ALL

-- 统计用户预算数
SELECT
  '用户预算数' as 统计项,
  COUNT(*) as 数量
FROM budgets b
JOIN users u ON b.user_id = u.id
WHERE b.start_date >= 'YYYY-MM-01'
  AND b.start_date <= 'YYYY-MM-01'
  AND b.budget_type = 'PERSONAL'
  AND b.period = 'MONTHLY'

UNION ALL

-- 统计托管成员预算数
SELECT
  '托管成员预算数' as 统计项,
  COUNT(*) as 数量
FROM budgets b
JOIN family_members fm ON b.family_member_id = fm.id
WHERE b.start_date >= 'YYYY-MM-01'
  AND b.start_date <= 'YYYY-MM-01'
  AND b.budget_type = 'PERSONAL'
  AND b.period = 'MONTHLY'
  AND fm.is_custodial = true;
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
-- 删除指定月份创建的预算（谨慎操作）
-- 替换YYYY-MM-DD为实际的执行日期
DELETE FROM budgets
WHERE start_date >= 'YYYY-MM-01'
  AND start_date <= 'YYYY-MM-01'
  AND created_at >= 'YYYY-MM-DD';

-- 删除对应的结转历史记录（谨慎操作）
DELETE FROM budget_histories
WHERE period = 'YYYY-M'
  AND created_at >= 'YYYY-MM-DD';
```

## 使用示例

### 示例1：修复2025年9月预算
```bash
# 使用自动化脚本
./run_budget_fix.sh 2025 9

# 或手动执行
psql -h localhost -p 5432 -U zhiweijz -d zhiweijz \
  -v target_year=2025 \
  -v target_month=9 \
  < fix_current_month_budget_creation.sql
```

### 示例2：修复当前月份预算
```bash
# 使用自动化脚本（推荐）
./run_budget_fix.sh

# 或手动执行
psql -h localhost -p 5432 -U zhiweijz -d zhiweijz < fix_current_month_budget_creation.sql
```

### 示例3：只修复结转历史
```bash
psql -h localhost -p 5432 -U zhiweijz -d zhiweijz < fix_budget_rollover_history.sql
```

## 联系支持
如果在执行过程中遇到问题，请保存完整的错误日志以便分析。

## 更新日志

### v2.0 (当前版本)
- ✅ 升级为通用工具，支持任意月份修复
- ✅ 添加自动化执行脚本 `run_budget_fix.sh`
- ✅ 改进错误处理和用户交互
- ✅ 支持从 `docker/.env` 自动读取配置
- ✅ 添加详细的验证查询和使用示例

### v1.0
- ✅ 基础的9月份预算修复功能
- ✅ 支持用户、托管用户、托管成员预算创建
- ✅ 预算结转逻辑和历史记录修复
