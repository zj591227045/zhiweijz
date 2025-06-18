# 数据库升级指南 - 1.4.0版本

## 版本说明
从1.3.2升级到1.4.0版本，正式纳入用户注销功能。此版本包含：
- 用户注销字段（deletion_requested_at, deletion_scheduled_at）
- 用户注销日志表（user_deletion_logs）
- 相关系统配置
- 完整的索引和触发器

## 自动升级（推荐）

### 使用新的升级脚本
```bash
# 运行1.4.0版本升级脚本
./scripts/fix-user-deletion-fields-v2.sh
```

这是最安全、最便捷的升级方式，脚本包含：
- 自动版本检测
- 完整的迁移执行
- 结果验证
- Prisma客户端重新生成
- TypeScript编译

## 手动升级方法

如果自动升级失败，可以选择以下手动方法：

### 方法1: 使用迁移管理器

```bash
# 进入服务器目录
cd server

# 执行迁移管理器
node scripts/migration-manager.js
```

### 方法2: 进入Docker容器直接执行SQL

#### 步骤1: 进入容器
```bash
# 进入运行中的数据库容器
sudo docker exec -it zhiweijz-db bash
```

#### 步骤2: 连接数据库执行SQL
```bash
# 在容器内连接PostgreSQL数据库
psql -U zhiweijz -d zhiweijz
```

#### 步骤3: 执行完整的1.4.0迁移SQL
```sql
-- =======================================
-- 1.4.0版本迁移：用户注销功能
-- =======================================

-- 1. 添加用户注销相关字段（如果不存在）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE;

-- 2. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_deletion_requested_at ON users(deletion_requested_at);
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_at ON users(deletion_scheduled_at);

-- 3. 添加字段注释
COMMENT ON COLUMN users.deletion_requested_at IS '用户请求注销的时间';
COMMENT ON COLUMN users.deletion_scheduled_at IS '预定注销时间（24小时后）';

-- 4. 创建用户注销日志表
CREATE TABLE IF NOT EXISTS user_deletion_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deletion_reason TEXT,
    admin_user_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT user_deletion_logs_status_check CHECK (status IN ('pending', 'cancelled', 'completed', 'failed'))
);

-- 5. 添加用户注销日志表索引
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_user_id ON user_deletion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_status ON user_deletion_logs(status);
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_scheduled_at ON user_deletion_logs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_created_at ON user_deletion_logs(created_at DESC);

-- 6. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_user_deletion_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_user_deletion_logs_updated_at ON user_deletion_logs;
CREATE TRIGGER trigger_update_user_deletion_logs_updated_at 
    BEFORE UPDATE ON user_deletion_logs 
    FOR EACH ROW EXECUTE FUNCTION update_user_deletion_logs_updated_at();

-- 7. 插入系统配置
INSERT INTO system_configs (key, value, description, category) VALUES ('user_deletion_enabled', 'true', '用户注销功能开关', 'user_management') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) VALUES ('user_deletion_delay_hours', '24', '用户注销延迟时间（小时）', 'user_management') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) VALUES ('user_deletion_cleanup_enabled', 'true', '用户数据清理功能开关', 'user_management') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

-- 8. 更新版本记录
INSERT INTO schema_versions (version, description, migration_file) 
VALUES ('1.4.0', '添加用户注销功能 - 正式版本', 'add-user-deletion-fields-v2.sql');

-- 退出数据库
\q
```

#### 步骤4: 退出容器
```bash
exit
```

### 方法3: 使用Docker命令直接执行

```bash
# 复制迁移文件到容器
sudo docker cp server/migrations/incremental/add-user-deletion-fields-v2.sql zhiweijz-db:/tmp/

# 执行迁移
sudo docker exec -i zhiweijz-db psql -U zhiweijz -d zhiweijz -f /tmp/add-user-deletion-fields-v2.sql
```

### 方法4: 通过Node.js脚本执行

```bash
# 进入后端容器
sudo docker exec -it zhiweijz-backend bash

# 在容器内执行迁移脚本
cd /app
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('开始执行1.4.0版本迁移...');
    
    // 执行所有迁移SQL
    const migrationSQL = \`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE;
      
      CREATE INDEX IF NOT EXISTS idx_users_deletion_requested_at ON users(deletion_requested_at);
      CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_at ON users(deletion_scheduled_at);
      
      COMMENT ON COLUMN users.deletion_requested_at IS '用户请求注销的时间';
      COMMENT ON COLUMN users.deletion_scheduled_at IS '预定注销时间（24小时后）';
    \`;
    
    await prisma.\$executeRawUnsafe(migrationSQL);
    
    console.log('✅ 1.4.0版本迁移执行成功');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
  } finally {
    await prisma.\$disconnect();
  }
}

runMigration();
"
```

## 升级后验证

### 1. 检查数据库版本
```bash
sudo docker exec -i zhiweijz-db psql -U zhiweijz -d zhiweijz -c "
SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1;
"
```
应该显示：`1.4.0`

### 2. 检查用户表字段
```bash
sudo docker exec -i zhiweijz-db psql -U zhiweijz -d zhiweijz -c "
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('deletion_requested_at', 'deletion_scheduled_at');
"
```

### 3. 检查用户注销日志表
```bash
sudo docker exec -i zhiweijz-db psql -U zhiweijz -d zhiweijz -c "
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_deletion_logs';
"
```
应该返回：`1`

### 4. 检查系统配置
```bash
sudo docker exec -i zhiweijz-db psql -U zhiweijz -d zhiweijz -c "
SELECT key, value FROM system_configs WHERE key LIKE 'user_deletion%';
"
```

### 5. 重启容器应用更改
```bash
cd docker
docker-compose restart zhiweijz-server
```

## 升级完成后操作

1. **重新生成Prisma客户端**：
   ```bash
   cd server
   npx prisma generate
   ```

2. **编译TypeScript**：
   ```bash
   npm run build
   ```

3. **验证功能**：
   - 检查用户设置页面是否有注销选项
   - 测试注销流程（使用测试账户）

## 回滚方案

如果需要回滚到1.3.2版本：

```sql
-- 删除用户注销日志表
DROP TABLE IF EXISTS user_deletion_logs CASCADE;

-- 删除用户注销字段
ALTER TABLE users DROP COLUMN IF EXISTS deletion_requested_at;
ALTER TABLE users DROP COLUMN IF EXISTS deletion_scheduled_at;

-- 删除系统配置
DELETE FROM system_configs WHERE key LIKE 'user_deletion%';

-- 更新版本记录
UPDATE schema_versions SET version = '1.3.2' WHERE version = '1.4.0';
```

## 注意事项

1. **升级前备份**：执行前请确保数据库已备份
2. **幂等操作**：所有操作都是幂等的，可以安全重复执行
3. **容器重启**：升级完成后重启容器以确保应用获取最新的数据库结构
4. **测试验证**：在生产环境使用前请在测试环境验证所有功能
5. **监控日志**：升级后监控应用日志确保无异常

## 推荐升级流程

1. 使用自动升级脚本：`./scripts/fix-user-deletion-fields-v2.sh`
2. 如果失败，选择手动方法中的迁移管理器
3. 最后选择是直接SQL执行
4. 升级后进行完整验证
5. 重启相关容器 