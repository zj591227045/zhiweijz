# 数据库增量迁移规范

## 概述

本文档规定了 "只为记账" 项目数据库增量迁移的标准规范，确保数据库版本管理的一致性和可维护性。

## 版本管理策略

### 版本号规范
- 采用语义化版本控制：`MAJOR.MINOR.PATCH`
- **MAJOR**：重大架构变更或不兼容更新
- **MINOR**：新功能添加，向后兼容
- **PATCH**：错误修复和小优化

### 当前版本状态
- **当前稳定版本**：1.5.0
- **下一个计划版本**：1.6.0（预留）

## 迁移文件命名规范

### 文件命名格式
```
{source_version}-to-{target_version}.sql
```

### 示例
```
1.0.0-to-1.1.0.sql    # 从1.0.0升级到1.1.0
1.1.0-to-1.2.0.sql    # 从1.1.0升级到1.2.0
add-service-type-to-llm-call-logs.sql  # 功能性迁移
```

### 特殊文件
```
base-schema.sql       # 全新安装的基础架构
admin-features.sql    # 管理员功能模块（可重用）
```

## 迁移文件结构规范

### 文件头部元数据
每个迁移文件必须包含以下元数据：

```sql
/*META
VERSION: 1.2.1
DESCRIPTION: 功能描述 - 具体变更内容
AUTHOR: zhiweijz-team
*/
```

## ⚠️ 关键经验总结（基于实际迁移问题）

### 1. SQL语句分割问题
**问题**：PostgreSQL的prepared statement不支持多行INSERT语句和复杂的DO $$块。

**解决方案**：
- ✅ **单行INSERT**：每个INSERT语句必须独立成行
- ❌ **多行VALUES**：避免使用多行VALUES格式
- ✅ **DO $$块**：确保完整的块结构

```sql
-- ❌ 错误：多行VALUES格式
INSERT INTO table_name (col1, col2) VALUES
('value1', 'value2'),
('value3', 'value4');

-- ✅ 正确：单独的INSERT语句
INSERT INTO table_name (col1, col2) VALUES ('value1', 'value2') ON CONFLICT (col1) DO UPDATE SET col2 = EXCLUDED.col2;
INSERT INTO table_name (col1, col2) VALUES ('value3', 'value4') ON CONFLICT (col1) DO UPDATE SET col2 = EXCLUDED.col2;
```

### 2. 约束和索引问题
**问题**：表已存在但缺少必要的UNIQUE约束，导致ON CONFLICT失败。

**解决方案**：
- 在表创建后立即添加必要的约束
- 使用DO $$块处理约束添加的异常

```sql
-- 创建表
CREATE TABLE IF NOT EXISTS table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL
);

-- 确保约束存在（防止表已存在但缺少约束）
DO $$ BEGIN
    ALTER TABLE table_name ADD CONSTRAINT table_name_username_unique UNIQUE (username);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;
```

### 3. 迁移管理器兼容性
**问题**：SQL解析器无法正确处理复杂的PostgreSQL语法。

**解决方案**：
- 保持SQL语句简洁
- 避免复杂的嵌套结构
- 每个语句以分号结尾并换行

### 4. 字段添加最佳实践
**问题**：添加字段时需要考虑现有数据的兼容性。

**解决方案**：
```sql
-- 标准字段添加流程
DO $$ BEGIN
    ALTER TABLE table_name ADD COLUMN new_field VARCHAR(20) DEFAULT 'default_value';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 更新现有记录的默认值
UPDATE table_name SET new_field = 'default_value' WHERE new_field IS NULL;

-- 如果需要设置为非空
DO $$ BEGIN
    ALTER TABLE table_name ALTER COLUMN new_field SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;
```

## SQL语句规范

### 1. 基础规范
- ✅ 使用条件创建：`CREATE TABLE IF NOT EXISTS`
- ✅ 使用条件添加：先检查字段是否存在再添加
- ✅ 索引管理：`CREATE INDEX IF NOT EXISTS`
- ✅ 数据迁移：使用 `ON CONFLICT` 处理冲突
- ✅ 错误处理：使用 `DO $$` 块处理可能的错误

### 2. INSERT语句规范
```sql
-- ✅ 正确格式：单行INSERT with ON CONFLICT
INSERT INTO system_configs (key, value, description, category) 
VALUES ('config_key', 'config_value', '配置描述', 'category') 
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
```

### 3. DO $$块规范
```sql
-- ✅ 正确的DO $$块格式
DO $$ BEGIN
    ALTER TABLE table_name ADD COLUMN new_field VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
```

### 4. 函数定义规范
```sql
-- ✅ 正确的函数定义格式
CREATE OR REPLACE FUNCTION function_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## 迁移文件模板

### 标准迁移模板
```sql
/*META
VERSION: 1.X.0
DESCRIPTION: [功能描述] - [具体变更内容]
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：[功能描述]
-- [详细功能描述]
-- =======================================

-- 1. 创建新的枚举类型（如需要）
DO $$ BEGIN
    CREATE TYPE example_enum AS ENUM ('VALUE1', 'VALUE2', 'VALUE3');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 创建新表
CREATE TABLE IF NOT EXISTS example_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status example_enum NOT NULL DEFAULT 'VALUE1',
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    metadata JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 添加新字段到现有表
DO $$ BEGIN
    ALTER TABLE existing_table ADD COLUMN new_field VARCHAR(50) DEFAULT 'default_value';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. 更新现有记录的默认值
UPDATE existing_table SET new_field = 'default_value' WHERE new_field IS NULL;

-- 5. 设置字段为非空（如需要）
DO $$ BEGIN
    ALTER TABLE existing_table ALTER COLUMN new_field SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

-- 6. 添加约束（如需要）
DO $$ BEGIN
    ALTER TABLE existing_table ADD CONSTRAINT existing_table_new_field_unique UNIQUE (new_field);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- 7. 创建索引
CREATE INDEX IF NOT EXISTS idx_example_table_name ON example_table(name);
CREATE INDEX IF NOT EXISTS idx_example_table_user_status ON example_table(user_id, status);
CREATE INDEX IF NOT EXISTS idx_example_table_created_at ON example_table(created_at DESC);

-- 8. 创建触发器（如需要）
CREATE OR REPLACE FUNCTION update_example_table_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_example_table_updated_at ON example_table;
CREATE TRIGGER trigger_update_example_table_updated_at 
    BEFORE UPDATE ON example_table 
    FOR EACH ROW EXECUTE FUNCTION update_example_table_updated_at();

-- 9. 插入默认数据（每个INSERT独立一行）
INSERT INTO system_configs (key, value, description, category) VALUES ('new_feature_enabled', 'true', '新功能开关', 'features') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) VALUES ('new_feature_limit', '100', '新功能限制', 'limits') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

-- 10. 数据迁移（如需要）
INSERT INTO example_table (name, description, user_id, status)
SELECT 
    old_name as name,
    old_description as description,
    user_id,
    'VALUE1' as status
FROM old_table 
WHERE migration_needed = true
ON CONFLICT (id) DO NOTHING;
```

## 字段添加规范

### 新增字段的标准流程

#### 1. 基础字段添加
```sql
-- 添加新字段（可为空）
DO $$ BEGIN
    ALTER TABLE table_name ADD COLUMN new_field VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
```

#### 2. 带默认值的字段
```sql
-- 添加带默认值的字段
DO $$ BEGIN
    ALTER TABLE table_name ADD COLUMN new_field VARCHAR(100) DEFAULT 'default_value';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 更新现有记录
UPDATE table_name SET new_field = 'default_value' WHERE new_field IS NULL;
```

#### 3. 非空字段添加
```sql
-- 分步骤添加非空字段
-- 步骤1：添加可空字段
DO $$ BEGIN
    ALTER TABLE table_name ADD COLUMN new_field VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 步骤2：填充默认值
UPDATE table_name SET new_field = 'default_value' WHERE new_field IS NULL;

-- 步骤3：设置为非空
DO $$ BEGIN
    ALTER TABLE table_name ALTER COLUMN new_field SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;
```

### 索引添加规范
```sql
-- 单列索引
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column_name);

-- 多列索引
CREATE INDEX IF NOT EXISTS idx_table_multi ON table_name(column1, column2);

-- 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_unique ON table_name(unique_column);

-- 条件索引
CREATE INDEX IF NOT EXISTS idx_table_conditional 
ON table_name(column_name) WHERE condition = true;
```

### 外键约束添加
```sql
-- 检查约束是否存在，不存在则添加
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_table_reference'
    ) THEN
        ALTER TABLE table_name 
        ADD CONSTRAINT fk_table_reference 
        FOREIGN KEY (reference_id) REFERENCES referenced_table(id) 
        ON DELETE CASCADE;
    END IF;
END $$;
```

## 数据类型规范

### 推荐的数据类型映射

| 用途 | 推荐类型 | 示例 |
|------|----------|------|
| 主键ID | `UUID DEFAULT gen_random_uuid()` | 新表 |
| 外键ID（关联现有表） | `TEXT` | 关联users/account_books等 |
| 短文本 | `VARCHAR(n)` | 用户名、标题 |
| 长文本 | `TEXT` | 描述、内容 |
| 金额 | `DECIMAL(10,2)` | 记账金额、预算 |
| 时间戳 | `TIMESTAMP WITH TIME ZONE` | 创建时间、更新时间 |
| 布尔值 | `BOOLEAN NOT NULL DEFAULT false` | 开关状态 |
| 枚举 | `ENUM` 类型 | 状态、角色 |
| JSON数据 | `JSONB` | 元数据、配置 |

### 字段命名规范
- **时间字段**：`created_at`, `updated_at`, `deleted_at`
- **外键字段**：`{table}_id` (如：`user_id`, `category_id`)
- **布尔字段**：`is_{property}` (如：`is_active`, `is_deleted`)
- **状态字段**：`status`, `state`
- **计数字段**：`{item}_count` (如：`login_count`)

## 版本升级路径配置

### migration-manager.js 配置更新
每次添加新版本时，需要更新 `scripts/migration-manager.js` 中的配置：

```javascript
const MIGRATIONS_CONFIG = {
  // 更新最新版本
  LATEST_VERSION: '1.5.0',

  // 更新升级路径
  UPGRADE_PATHS: {
    '1.0.0': ['1.0.0-to-1.1.0', '1.1.0-to-1.2.0', '1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0'],
    '1.1.0': ['1.1.0-to-1.2.0', '1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0'],
    '1.2.0': ['1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0'],
    '1.3.0': ['add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0'],
    '1.4.0': ['1.4.0-to-1.5.0'],
    '1.5.0': [], // 新的最新版本
    'fresh_install': ['base-schema', 'admin-features', '1.1.0-to-1.2.0', '1.2.2-to-1.3.0', 'add-service-type-to-llm-call-logs', 'add-transaction-metadata', 'add-wechat-integration', 'add-user-deletion-fields-v2', '1.4.0-to-1.5.0']
  }
};
```

## 测试和验证规范

### 迁移前测试
```bash
# 检查迁移状态
npm run migrate:check

# 查看当前版本
npm run migrate:version
```

### 执行迁移
```bash
# 执行升级
npm run migrate:upgrade

# 验证升级结果
npm run migrate:check
```

### 迁移后验证
1. **数据库结构验证**：检查表、字段、索引是否正确创建
2. **数据完整性验证**：确认现有数据未受影响
3. **应用程序测试**：验证相关功能正常工作
4. **性能测试**：确认新索引和结构不影响性能

## 常见问题和解决方案

### 1. "cannot insert multiple commands into a prepared statement"
**原因**：多行INSERT语句或复杂的SQL结构
**解决**：将多行INSERT拆分为单独的INSERT语句

### 2. "there is no unique or exclusion constraint matching the ON CONFLICT specification"
**原因**：表缺少必要的UNIQUE约束
**解决**：在INSERT前添加必要的约束

### 3. "unterminated dollar-quoted string"
**原因**：DO $$块格式不正确
**解决**：确保DO $$块的完整性和正确格式

### 4. 迁移执行失败但部分语句已执行
**原因**：迁移不是原子性的
**解决**：使用幂等性设计，确保重复执行安全

## 回滚策略

### 原则
- **增量迁移应设计为只增加，不删除**
- **字段废弃**：使用标记废弃而非删除
- **表废弃**：重命名为 `_deprecated_{table_name}`

### 紧急回滚
如果必须回滚：
1. 停止应用服务
2. 恢复数据库备份
3. 重新部署旧版本应用
4. 分析问题并制定修复方案

## 最佳实践总结

### ✅ 推荐做法
1. **幂等性设计**：所有操作可安全重复执行
2. **渐进式迁移**：大表操作分批进行
3. **完整测试**：在测试环境充分验证
4. **备份策略**：迁移前创建数据库备份
5. **监控告警**：迁移过程中监控数据库性能

### ❌ 避免做法
1. **删除操作**：避免删除表、字段或数据
2. **复杂语句**：避免过于复杂的SQL结构
3. **无测试迁移**：不要在生产环境直接执行未测试的迁移
4. **忽略错误**：不要忽略迁移过程中的警告和错误

## 未来扩展计划

### 预计的功能模块和版本规划

#### 1.3.0 版本（通知系统）
- 推送通知表
- 邮件通知配置
- 消息模板管理

#### 1.4.0 版本（数据分析）
- 统计报表增强
- 数据导入导出
- 自定义报表

#### 1.5.0 版本（标签系统）✅ 已完成
- 记账记录多标签管理
- 账本级别标签共享
- 标签统计分析功能

#### 1.6.0 版本（标签系统增强）
- 标签模板和预设
- 智能标签推荐
- 标签使用统计报表

#### 1.7.0 版本（多租户支持）
- 租户隔离
- 权限细分
- 资源配额

---

**注意**：本规范文件应随着项目发展持续更新，确保与实际实施保持一致。每次遇到新问题时，都应该更新相应的规范和最佳实践。 