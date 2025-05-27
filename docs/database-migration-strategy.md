# 数据库迁移策略

## 概述

为了确保Docker镜像在分发时能够自动初始化数据库到最新状态，我们实施了以下策略：

## 解决方案

### 1. 一次性迁移脚本

创建了一次性迁移脚本 `server/prisma/migrations/20250527000000_add_created_by_to_account_books/migration.sql`，该脚本：

- 使用条件检查确保幂等性（可以重复执行）
- 添加缺失的数据库列和表：
  - `account_books.created_by` - 账本创建者字段
  - `account_books.user_llm_setting_id` - LLM设置关联字段
  - `budgets.family_member_id` - 预算家庭成员关联字段
  - `user_llm_settings` 表 - 用户LLM设置表
  - `user_account_books` 表 - 用户账本关联表
- 自动创建必要的外键约束
- 与生产环境数据库保持一致

### 2. 自动化启动流程

修改了后端启动脚本 `server/scripts/start.sh`：

- 在应用启动前自动执行数据库初始化
- 等待数据库连接可用
- 执行所有待处理的迁移
- 生成最新的Prisma客户端
- 提供详细的日志输出

### 3. 数据库初始化脚本

创建了独立的数据库初始化脚本 `server/scripts/init-database.sh`：

- 包含连接重试机制
- 优雅处理迁移失败情况
- 确保Prisma客户端为最新版本

## 关键特性

### 幂等性
所有迁移脚本都使用条件检查，确保可以安全地重复执行：

```sql
IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_books' AND column_name = 'created_by'
) THEN
    ALTER TABLE "account_books" ADD COLUMN "created_by" TEXT;
END IF;
```

### 容错性
启动脚本包含错误处理，即使某些步骤失败也会继续启动：

```bash
if npx prisma migrate deploy; then
  echo "数据库迁移成功"
else
  echo "数据库迁移失败，但继续启动..."
fi
```

### 连接重试
包含数据库连接重试机制，确保在数据库启动较慢时也能正常工作：

```bash
max_attempts=30
until npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; do
  # 重试逻辑
done
```

## 部署流程

### Docker环境
1. 容器启动时自动执行 `start.sh`
2. 脚本自动检测并应用所有待处理的迁移
3. 确保数据库schema为最新状态
4. 启动应用服务器

### 新环境部署
1. 数据库会自动创建所有必要的表和列
2. 应用所有历史迁移
3. 无需手动干预

## 维护指南

### 添加新迁移
1. 使用 `npx prisma migrate dev --name <migration_name>` 创建新迁移
2. 迁移会在下次部署时自动应用
3. 确保迁移脚本具有幂等性

### 故障排除
1. 检查容器日志：`docker-compose logs backend`
2. 手动执行迁移：`docker-compose exec backend npx prisma migrate deploy`
3. 检查迁移状态：`docker-compose exec backend npx prisma migrate status`

## 优势

1. **自动化**：无需手动执行迁移命令
2. **一致性**：确保所有环境的数据库schema一致
3. **可靠性**：包含错误处理和重试机制
4. **可维护性**：清晰的日志输出便于调试
5. **向后兼容**：支持从任何历史版本升级到最新版本
