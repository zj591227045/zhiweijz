# 用户AI服务设置脚本

本目录包含用于管理用户AI服务设置的数据库脚本。

## 脚本列表

### enable-user-ai-services.js
为所有用户开启AI服务设置并设置为官方服务的脚本。

### reset-user-password.js
用户密码重置脚本，支持单个和批量重置操作。

**用途：**
- 重置单个用户密码（通过用户ID或邮箱）
- 批量重置所有用户密码（统一密码或随机密码）
- 生成安全的随机密码并导出密码列表
- 查询用户信息和密码修改历史
- 提供完善的密码强度验证和安全检查

**功能：**
1. 单个用户密码重置（支持自定义密码或随机生成）
2. 批量用户密码重置（支持统一密码或每用户随机密码）
3. 密码强度验证（大小写字母、数字、特殊字符要求）
4. 密码列表导出功能（JSON格式，含时间戳）
5. 用户信息查询功能
6. 完善的错误处理和批量处理优化
7. 安全的密码哈希存储（bcrypt）

**enable-user-ai-services.js 用途：**
- 在生产环境更新版本后，为所有用户启用AI服务
- 将所有用户的AI服务类型设置为官方服务
- 解决由于新增用户级AI服务控制字段导致的默认关闭问题

**enable-user-ai-services.js 功能：**
1. 查询当前AI设置状态分布
2. 为每个用户创建/更新 `ai_service_enabled` 设置为 `'true'`
3. 为每个用户创建/更新 `ai_service_type` 设置为 `'official'`
4. 提供详细的执行日志和错误报告
5. 验证设置结果的正确性

## 使用方法

### 1. 在服务器端运行脚本

```bash
# 切换到项目根目录
cd /path/to/your/project

# 运行脚本
node scripts/database/enable-user-ai-services.js
```

### 2. 从服务器目录运行

```bash
# 切换到服务器目录
cd server

# 运行脚本（需要相对路径）
node ../scripts/database/enable-user-ai-services.js
```

### 3. 使用 npm scripts（推荐）

```bash
# 启用用户AI服务
npm run db:enable-user-ai

# 重置用户密码
npm run db:reset-password help
```

## 密码重置脚本使用示例

### 重置单个用户密码
```bash
# 使用自定义密码
npm run db:reset-password single user@example.com MyNewPass123!

# 生成随机密码
npm run db:reset-password single-random user@example.com

# 查询用户信息
npm run db:reset-password query user@example.com
```

### 批量重置密码
```bash
# 所有用户使用统一密码
npm run db:reset-password batch-all TempPass123!

# 为每个用户生成随机密码并导出
npm run db:reset-password batch-random --export
```

## AI服务脚本输出示例

```
🎯 用户AI服务设置脚本启动
============================================================
🔍 查询当前AI设置状态...

📈 AI服务启用状态分布:
   true: 0 用户

📈 AI服务类型分布:
   (暂无数据)

⚠️  15 个用户没有AI服务设置

============================================================
🚀 开始为所有用户启用AI服务设置...
📊 找到 15 个用户

🔧 处理用户: 张三 (zhang@example.com) - ID: user-123
   ✅ 创建了AI服务启用设置: ai_service_enabled = true
   ✅ 创建了AI服务类型设置: ai_service_type = official

...

============================================================
📈 执行结果总结:
✅ 成功处理用户数: 15
⏭️  跳过用户数: 0
❌ 失败用户数: 0
📊 总用户数: 15

🎉 AI服务设置更新完成！

🔍 验证设置结果...
📊 验证结果:
   总用户数: 15
   已启用AI服务的用户: 15
   设置为官方服务的用户: 15
✅ 所有用户的AI服务设置已正确配置

🔌 数据库连接已断开
✅ 脚本执行完成
```

## 注意事项

### 安全提示
1. **备份数据库**：在生产环境运行前，务必备份数据库
2. **权限检查**：确保运行脚本的用户有数据库写入权限
3. **环境变量**：确保数据库连接环境变量正确配置

### 运行环境
- **Node.js版本**：确保Node.js版本兼容（建议 >= 16）
- **依赖包**：确保Prisma Client已安装并生成
- **数据库连接**：确保数据库连接字符串在环境变量中正确配置

### 错误处理
脚本具有完善的错误处理机制：
- 单个用户失败不会影响其他用户的处理
- 详细记录每个错误的原因和用户信息
- 提供完整的执行总结报告

### 幂等性
脚本具有幂等性，可以安全地多次运行：
- 已存在的设置会被更新而不是重复创建
- 不会产生重复数据或冲突

## 配置的数据库字段

脚本会在 `user_settings` 表中创建/更新以下记录：

| 用户ID | 键名 | 值 | 说明 |
|--------|------|----|----|
| user-xxx | ai_service_enabled | 'true' | AI服务启用状态 |
| user-xxx | ai_service_type | 'official' | AI服务类型（官方服务） |

## 故障排除

### 常见问题
1. **数据库连接失败**
   - 检查环境变量 `DATABASE_URL` 是否正确
   - 确认数据库服务是否正常运行

2. **权限不足**
   - 确认数据库用户有 `user_settings` 表的读写权限
   - 检查是否有创建记录的权限

3. **Prisma相关错误**
   - 运行 `npx prisma generate` 重新生成客户端
   - 确认Prisma schema与数据库结构同步

### 调试模式
可以修改脚本开头的日志级别来获取更详细的调试信息：

```javascript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

## 后续维护

- 定期检查用户AI服务设置的分布情况
- 监控脚本执行的成功率和错误类型
- 根据业务需求调整默认配置值

---

**重要提醒**：此脚本会修改生产数据库中的用户设置，请在运行前确保：
1. 已充分测试脚本功能
2. 已备份相关数据
3. 已获得相应的运维授权

# 数据库字段修复指南

## 问题描述

在全新部署时可能会遇到 `users.is_custodial` 字段不存在的错误：
```
Invalid `prisma.user.findUnique()` invocation: The column `users.is_custodial` does not exist in the current database.
```

## 解决方案

### 方案一：全新部署修复

如果是全新部署，数据库初始化文件已经修复，直接重新初始化数据库即可。

### 方案二：现有数据库修复

如果是现有的数据库实例，请执行以下修复脚本：

```bash
# 进入数据库容器
docker exec -it <数据库容器名> psql -U <用户名> -d <数据库名>

# 或者直接执行 SQL 文件
docker exec -i <数据库容器名> psql -U <用户名> -d <数据库名> < scripts/database/fix-missing-fields.sql
```

### 方案三：手动修复

如果需要手动修复，请按以下顺序执行 SQL 命令：

```sql
-- 添加缺失的字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_llm_token_limit INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_metadata_gin ON transactions USING gin (metadata);
```

## 修复的字段

### users 表
- `is_custodial`: 是否为托管账户（布尔值，默认 false）
- `is_active`: 账户是否激活（布尔值，默认 true）
- `daily_llm_token_limit`: 每日 LLM 令牌限制（整数，可空）
- `deletion_requested_at`: 删除请求时间（时间戳，可空）
- `deletion_scheduled_at`: 计划删除时间（时间戳，可空）

### transactions 表
- `metadata`: 交易元数据（JSONB，可空）

## 验证修复

修复完成后，可以通过以下 SQL 验证字段是否存在：

```sql
-- 检查 users 表字段
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('is_custodial', 'is_active', 'daily_llm_token_limit', 'deletion_requested_at', 'deletion_scheduled_at');

-- 检查 transactions 表字段
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name = 'metadata';
```

## 注意事项

1. 在执行修复前，建议备份数据库
2. 修复脚本使用 `IF NOT EXISTS` 语法，可以安全地重复执行
3. 如果是生产环境，建议在维护窗口期间执行修复
4. 修复完成后，重启应用服务以确保 Prisma 客户端重新连接数据库 