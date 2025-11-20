# 手动添加用户签到记录脚本

## 功能说明

该脚本用于为指定用户手动添加指定日期的签到记录。脚本会自动完成以下操作：

1. 验证用户是否存在
2. 检查该日期是否已有签到记录（防止重复）
3. 添加签到记录到 `user_checkins` 表
4. 添加记账点交易记录到 `accounting_points_transactions` 表
5. 更新用户记账点余额（+5点赠送积分）
6. 显示操作结果和用户最新状态

## 签到逻辑说明

根据代码分析，系统的签到逻辑如下：

### 数据库表结构

**user_checkins 表**（签到记录表）
- `id`: UUID，主键
- `user_id`: 用户ID
- `checkin_date`: 签到日期（DATE类型）
- `points_awarded`: 奖励点数（默认5点）
- `created_at`: 创建时间
- 唯一约束：`(user_id, checkin_date)` - 确保每个用户每天只能签到一次

**user_accounting_points 表**（用户记账点余额表）
- `user_id`: 用户ID
- `total_balance`: 总余额
- `gift_balance`: 赠送余额
- `member_balance`: 会员余额

**accounting_points_transactions 表**（记账点交易记录表）
- `user_id`: 用户ID
- `amount`: 交易金额
- `type`: 交易类型（签到为 'checkin'）
- `source`: 来源（签到为 'gift'）
- `description`: 描述（"每日签到奖励"）
- `balance_after`: 交易后余额

### 签到流程

1. 用户点击签到按钮
2. 系统检查今天是否已签到（查询 `user_checkins` 表）
3. 如果未签到：
   - 创建签到记录（`user_checkins`）
   - 创建交易记录（`accounting_points_transactions`）
   - 更新用户余额（`user_accounting_points`）
   - 返回签到成功，奖励5点
4. 如果已签到：返回"今天已经签到过了"

## 使用方法

### 基本用法

```bash
# 为用户添加今天的签到记录
./add_checkin_record.sh <用户ID>

# 为用户添加指定日期的签到记录
./add_checkin_record.sh <用户ID> <日期>
```

### 参数说明

- `用户ID`: 必填，可以是用户的UUID或邮箱地址
- `日期`: 可选，格式为 `YYYY-MM-DD`，默认为今天

### 使用示例

```bash
# 示例1：通过UUID为用户添加今天的签到
./add_checkin_record.sh abc123-def4-5678-90ab-cdef12345678

# 示例2：通过邮箱为用户添加今天的签到
./add_checkin_record.sh user@example.com

# 示例3：为用户添加2024年11月20日的签到
./add_checkin_record.sh abc123-def4-5678-90ab-cdef12345678 2024-11-20

# 示例4：通过邮箱添加指定日期的签到
./add_checkin_record.sh user@example.com 2024-11-20

# 示例5：查看帮助信息
./add_checkin_record.sh --help
```

## 前置条件

1. **PostgreSQL客户端**：需要安装 `psql` 命令
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

2. **数据库配置**：确保 `docker/.env` 文件包含正确的数据库配置：
   - `POSTGRES_DB`: 数据库名称
   - `POSTGRES_USER`: 数据库用户名
   - `POSTGRES_PASSWORD`: 数据库密码

3. **数据库连接**：数据库需要可以通过 `localhost:5432` 访问
   - 如果使用Docker，确保端口已正确映射
   - 脚本会自动尝试多种连接方式（localhost, 127.0.0.1, 容器名）

## 数据库连接说明

脚本会按以下顺序尝试连接数据库：

1. 环境变量 `DB_HOST` 指定的主机
2. `localhost`
3. `127.0.0.1`
4. Docker容器名 `zhiweijz-postgres`

如果所有方式都失败，脚本会提示检查：
- 数据库容器是否运行
- 端口映射是否正确
- 防火墙设置
- 数据库用户权限

## 注意事项

1. **防止重复签到**：脚本会检查该日期是否已有签到记录，如果存在会报错并回滚
2. **事务保护**：所有操作在一个事务中执行，如果任何步骤失败会自动回滚
3. **用户验证**：脚本会先验证用户是否存在，不存在会报错
4. **自动创建账户**：如果用户没有记账点账户，脚本会自动创建
5. **固定奖励**：每次签到固定奖励5点赠送积分

## 输出示例

```
[INFO] === 配置信息 ===
[INFO] 数据库主机: localhost
[INFO] 数据库端口: 5432
[INFO] 数据库名称: zhiweijz
[INFO] 数据库用户: zhiweijz
[INFO] 用户ID: abc123-def4-5678-90ab-cdef12345678
[INFO] 签到日期: 2024-11-20

[SUCCESS] 数据库连接测试成功 (使用主机: localhost)
[INFO] === 开始添加签到记录 ===

==========================================
手动添加用户签到记录
==========================================

1. 验证用户是否存在...
NOTICE:  ✓ 用户存在: 张三 (ID: abc123-def4-5678-90ab-cdef12345678)

2. 检查签到记录是否已存在...
NOTICE:  ✓ 该日期无签到记录，可以添加

3. 获取用户当前记账点余额...
NOTICE:  ✓ 当前余额: 100 (赠送: 50, 会员: 50)

4. 添加签到记录...
NOTICE:  ✓ 签到记录已创建:
NOTICE:    - 记录ID: xyz789-abc1-2345-6789-def012345678
NOTICE:    - 签到日期: 2024-11-20
NOTICE:    - 奖励点数: 5

5. 确保用户有记账点账户...

6. 添加记账点交易记录...
NOTICE:  ✓ 交易记录已创建:
NOTICE:    - 交易ID: qwe456-rty7-8901-2345-uio678901234
NOTICE:    - 金额: +5
NOTICE:    - 类型: 签到
NOTICE:    - 来源: 赠送

7. 更新用户记账点余额...
NOTICE:  ✓ 余额已更新:
NOTICE:    - 新总余额: 105
NOTICE:    - 新赠送余额: 55

8. 最终结果汇总...
NOTICE:  
NOTICE:  ========================================
NOTICE:  签到记录添加成功！
NOTICE:  ========================================
NOTICE:  用户信息:
NOTICE:    - 用户名: 张三
NOTICE:    - 用户ID: abc123-def4-5678-90ab-cdef12345678
NOTICE:  
NOTICE:  签到信息:
NOTICE:    - 签到日期: 2024-11-20
NOTICE:    - 奖励点数: 5
NOTICE:    - 累计签到: 15 次
NOTICE:  
NOTICE:  记账点余额:
NOTICE:    - 总余额: 105
NOTICE:    - 赠送余额: 55
NOTICE:    - 会员余额: 50
NOTICE:  ========================================

✓ 所有操作已成功完成！

[SUCCESS] 签到记录添加完成！
```

## 查询用户信息

脚本支持直接使用邮箱地址，无需查询UUID。如果需要查询用户信息，可以使用以下SQL：

```sql
-- 通过用户名查询
SELECT id, name, email FROM users WHERE name LIKE '%张三%';

-- 通过邮箱查询
SELECT id, name, email FROM users WHERE email = 'zhangsan@example.com';

-- 查看所有用户
SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10;
```

或者使用psql命令：

```bash
# 通过邮箱查询
PGPASSWORD=zhiweijz123 psql -h localhost -p 5432 -U zhiweijz -d zhiweijz \
  -c "SELECT id, name, email FROM users WHERE email = 'user@example.com';"

# 查看最近注册的用户
PGPASSWORD=zhiweijz123 psql -h localhost -p 5432 -U zhiweijz -d zhiweijz \
  -c "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10;"
```

## 故障排查

### 问题1：psql命令未找到

```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

### 问题2：无法连接数据库

```bash
# 检查数据库容器是否运行
docker ps | grep postgres

# 检查端口映射
docker port zhiweijz-postgres

# 手动测试连接
PGPASSWORD=zhiweijz123 psql -h localhost -p 5432 -U zhiweijz -d zhiweijz -c "SELECT 1;"
```

### 问题3：用户不存在

先查询用户ID：
```bash
PGPASSWORD=zhiweijz123 psql -h localhost -p 5432 -U zhiweijz -d zhiweijz \
  -c "SELECT id, name, email FROM users LIMIT 5;"
```

### 问题4：签到记录已存在

如果需要删除已有签到记录（谨慎操作）：
```sql
-- 查看签到记录
SELECT * FROM user_checkins WHERE user_id = '用户ID' AND checkin_date = '2024-11-20';

-- 删除签到记录（需要同时处理交易记录和余额）
-- 不建议手动删除，建议联系管理员
```

## 相关文件

- `add_checkin_record.sh`: Shell脚本，负责参数解析和数据库连接
- `add_checkin_record.sql`: SQL脚本，执行实际的数据库操作
- `README.md`: 本文档

## 参考

- 签到服务代码：`server/src/services/accounting-points.service.ts`
- 签到API路由：`server/src/routes/accounting-points.routes.ts`
- 数据库Schema：`server/prisma/schema.prisma`
