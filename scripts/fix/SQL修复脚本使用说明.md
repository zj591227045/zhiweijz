# SQL修复脚本使用说明

## 概述

提供了两个纯SQL脚本来修复预算相关问题，无需依赖容器环境或Node.js包。

## 脚本说明

### 1. fix-custodial-budgets.sql
**功能**：为缺失当前月份预算的托管成员创建预算
**解决问题**：托管成员跨月时没有自动生成新月份预算

### 2. fix-budget-rollover-history.sql  
**功能**：修复预算结转历史记录和结转金额
**解决问题**：
- 启用结转的预算缺失结转历史记录
- 预算结转金额不正确

## 使用方法

### 方式一：直接连接数据库执行

```bash
# 1. 连接到数据库
psql -h 数据库地址 -U 用户名 -d 数据库名

# 2. 执行托管成员预算修复
\i fix-custodial-budgets.sql

# 3. 执行预算结转历史修复
\i fix-budget-rollover-history.sql

# 4. 退出
\q
```

### 方式二：通过文件重定向执行

```bash
# 1. 执行托管成员预算修复
psql -h 数据库地址 -U 用户名 -d 数据库名 < fix-custodial-budgets.sql

# 2. 执行预算结转历史修复
psql -h 数据库地址 -U 用户名 -d 数据库名 < fix-budget-rollover-history.sql
```

### 方式三：在远程服务器上执行

如果数据库在远程服务器上，可以先上传脚本文件：

```bash
# 1. 上传脚本到服务器
scp fix-custodial-budgets.sql user@server:/tmp/
scp fix-budget-rollover-history.sql user@server:/tmp/

# 2. 在服务器上执行
ssh user@server
psql -U postgres -d zhiweijz < /tmp/fix-custodial-budgets.sql
psql -U postgres -d zhiweijz < /tmp/fix-budget-rollover-history.sql
```

## 脚本特点

### 安全性
- 使用事务包装，出错会自动回滚
- 详细的日志输出，可以看到每一步操作
- 自动检查避免重复创建
- 执行后提供验证查询

### 智能处理
- 自动计算当前月份日期范围
- 正确处理预算结转逻辑
- 支持正数结转（余额）和负数结转（债务）
- 按用户和时间顺序处理预算链

### 兼容性
- 纯SQL实现，不依赖外部包
- 使用PostgreSQL标准函数
- 兼容现有数据库结构

## 执行输出示例

### 托管成员预算修复
```
=== 托管成员预算修复脚本 ===
当前月份: 2024-12-01 到 2024-12-31

检查托管成员: 小明 (账本: 张家账本)
  📋 基于预算: 小明零花钱 (结束日期: 2024-11-30)
    💰 结转计算: 预算100 + 上次结转0 - 已支出50 = 结转50
  ✅ 成功创建预算: 小明零花钱 (ID: abc123...)
      金额: 100, 结转: 50

=== 修复完成 ===
处理的托管成员-账本组合数: 2
成功创建的预算数: 1
跳过的数量: 1

=== 验证结果 ===
托管成员-账本组合总数: 2
有当前月份预算的组合数: 2
缺失当前月份预算的组合数: 0
🎉 所有托管成员都有当前月份的预算！
```

### 预算结转历史修复
```
=== 预算结转历史修复脚本 ===

处理预算: 张三 - 生活费 (结束日期: 2024-10-31)
  支出: 800, 计算结转: 200
  ✅ 创建结转历史: 2024-10 - 余额结转 200
  ✅ 下个预算结转金额正确

处理预算: 张三 - 生活费 (结束日期: 2024-11-30)
  支出: 950, 计算结转: 250
  ⏳ 预算未过期，跳过历史记录创建
  ⚠️  下个预算结转金额不正确: 期望250, 实际0
  ✅ 更新下个预算结转金额: 250

=== 修复完成 ===
处理的预算数: 15
成功创建的历史记录数: 8
成功更新的结转金额数: 2

=== 验证结果 ===
已过期的结转预算总数: 12
有结转历史记录的预算数: 12
缺失历史记录的预算数: 0
🎉 所有已过期的结转预算都有历史记录！
```

## 验证修复结果

脚本执行完成后会提供验证查询，可以手动执行来检查修复效果：

### 1. 检查托管成员预算
```sql
SELECT 
  fm.name as 托管成员,
  ab.name as 账本,
  b.name as 预算名称,
  b.start_date as 开始日期,
  b.end_date as 结束日期,
  b.amount as 预算金额,
  b.rollover_amount as 结转金额
FROM family_members fm
JOIN account_books ab ON fm.family_id = ab.family_id
JOIN budgets b ON fm.id = b.family_member_id AND ab.id = b.account_book_id
WHERE fm.is_custodial = true
  AND b.start_date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY fm.name, b.start_date;
```

### 2. 检查结转历史记录
```sql
SELECT 
  b.name as 预算名称,
  bh.period as 期间,
  bh.type as 类型,
  bh.amount as 结转金额,
  bh.description as 描述,
  bh.created_at as 创建时间
FROM budget_histories bh
JOIN budgets b ON bh.budget_id = b.id
WHERE bh.type IN ('SURPLUS', 'DEFICIT')
ORDER BY bh.period DESC, b.name;
```

## 注意事项

1. **备份数据**：执行前建议备份数据库
2. **权限检查**：确保有足够的数据库访问权限
3. **执行顺序**：建议先执行托管成员预算修复，再执行结转历史修复
4. **监控日志**：注意观察执行过程中的输出日志
5. **验证结果**：执行后运行验证查询确认修复效果

## 故障排除

如果执行过程中出现错误：
1. 检查数据库连接是否正常
2. 确认用户权限是否足够
3. 查看错误信息，通常会指出具体问题
4. 由于使用了事务，出错会自动回滚，可以安全重试
