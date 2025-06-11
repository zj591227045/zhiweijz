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
- **当前稳定版本**：1.1.0
- **下一个计划版本**：1.2.0（预留）

## 迁移文件命名规范

### 文件命名格式
```
{source_version}-to-{target_version}.sql
```

### 示例
```
1.0.0-to-1.1.0.sql    # 从1.0.0升级到1.1.0
1.1.0-to-1.2.0.sql    # 从1.1.0升级到1.2.0
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
VERSION: 1.2.0
DESCRIPTION: 功能描述 - 具体变更内容
AUTHOR: zhiweijz-team
*/
```

### SQL语句规范
1. **使用条件创建**：`CREATE TABLE IF NOT EXISTS`
2. **使用条件添加**：先检查字段是否存在再添加
3. **索引管理**：`CREATE INDEX IF NOT EXISTS`
4. **数据迁移**：使用 `ON CONFLICT` 处理冲突
5. **错误处理**：使用 `DO $$` 块处理可能的错误

### 示例模板
```sql
/*META
VERSION: 1.2.0
DESCRIPTION: 示例迁移 - 添加新功能表
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：从 1.1.0 升级到 1.2.0
-- 功能描述
-- =======================================

-- 1. 创建新的枚举类型（如需要）
DO $$ BEGIN
    CREATE TYPE new_enum_type AS ENUM ('VALUE1', 'VALUE2');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 创建新表
CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 添加新字段到现有表
DO $$ BEGIN
    ALTER TABLE existing_table ADD COLUMN new_field VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);

-- 5. 插入默认数据
INSERT INTO system_configs (key, value, description, category) VALUES
('new_feature_enabled', 'true', '新功能开关', 'features')
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
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
| 金额 | `DECIMAL(10,2)` | 交易金额、预算 |
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
  LATEST_VERSION: '1.2.0',
  
  // 更新升级路径
  UPGRADE_PATHS: {
    '1.0.0': ['1.0.0-to-1.1.0', '1.1.0-to-1.2.0'],
    '1.1.0': ['1.1.0-to-1.2.0'],
    '1.2.0': [], // 新的最新版本
    'fresh_install': ['base-schema', 'admin-features', 'v1.2.0-features']
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

### 回滚策略
- **原则**：增量迁移应设计为只增加，不删除
- **字段废弃**：使用标记废弃而非删除
- **表废弃**：重命名为 `_deprecated_{table_name}`

## 未来扩展计划

### 预计的功能模块和版本规划

#### 1.2.0 版本（性能优化）
- 数据库索引优化
- 查询性能提升
- 缓存机制改进

#### 1.3.0 版本（通知系统）
- 推送通知表
- 邮件通知配置
- 消息模板管理

#### 1.4.0 版本（数据分析）
- 统计报表增强
- 数据导入导出
- 自定义报表

#### 1.5.0 版本（多租户支持）
- 租户隔离
- 权限细分
- 资源配额

### 表结构扩展示例

#### 通知系统表（1.3.0预留）
```sql
-- 通知模板表
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(200),
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- email, push, sms
    variables JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 用户通知表
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## 最佳实践

### 开发流程
1. **需求分析**：确定新功能的数据结构需求
2. **版本规划**：确定目标版本号
3. **编写迁移**：按照规范编写迁移文件
4. **本地测试**：在开发环境验证迁移
5. **代码审查**：团队审查迁移文件
6. **生产部署**：通过Docker自动迁移

### 注意事项
- ⚠️ **避免删除操作**：生产环境中避免删除表、字段或数据
- ⚠️ **大表操作**：对大表的结构变更要特别小心，考虑分批处理
- ⚠️ **外键约束**：添加外键时要确保数据一致性
- ⚠️ **索引创建**：大表创建索引可能耗时较长，考虑在低峰期执行

### 应急处理
- **迁移失败**：检查错误日志，修复问题后重新执行
- **数据不一致**：使用数据修复脚本恢复一致性
- **性能问题**：监控迁移过程中的数据库性能

## 维护和监控

### 定期检查
- 每月检查迁移历史记录
- 定期清理过期的迁移文件
- 监控数据库性能指标

### 文档更新
- 每次版本发布后更新此规范文件
- 维护版本变更日志
- 更新API文档中的数据结构说明

---

**注意**：本规范文件应随着项目发展持续更新，确保与实际实施保持一致。 