/*META
VERSION: 1.X.0
DESCRIPTION: [功能描述] - [具体变更内容]
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：从 1.X.0 升级到 1.Y.0
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
    ALTER TABLE existing_table ADD COLUMN new_field VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. 添加带默认值的字段
DO $$ BEGIN
    ALTER TABLE existing_table ADD COLUMN new_field_with_default INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 更新现有记录的默认值
UPDATE existing_table SET new_field_with_default = 0 WHERE new_field_with_default IS NULL;

-- 5. 添加非空字段（分步骤）
-- 步骤1：添加可空字段
DO $$ BEGIN
    ALTER TABLE existing_table ADD COLUMN required_field VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 步骤2：填充默认值
UPDATE existing_table SET required_field = 'default_value' WHERE required_field IS NULL;

-- 步骤3：设置为非空
DO $$ BEGIN
    ALTER TABLE existing_table ALTER COLUMN required_field SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_example_table_name ON example_table(name);
CREATE INDEX IF NOT EXISTS idx_example_table_user_status ON example_table(user_id, status);
CREATE INDEX IF NOT EXISTS idx_example_table_created_at ON example_table(created_at DESC);

-- 7. 添加外键约束
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_example_table_user'
    ) THEN
        ALTER TABLE example_table 
        ADD CONSTRAINT fk_example_table_user 
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

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

-- 9. 插入默认数据
INSERT INTO system_configs (key, value, description, category) VALUES
('new_feature_enabled', 'true', '新功能开关', 'features'),
('new_feature_limit', '100', '新功能限制', 'limits')
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 10. 数据迁移（如需要）
-- 示例：将现有数据迁移到新表
INSERT INTO example_table (name, description, user_id, status)
SELECT 
    old_name as name,
    old_description as description,
    user_id,
    'VALUE1' as status
FROM old_table 
WHERE migration_needed = true
ON CONFLICT (id) DO NOTHING;

-- 注释：
-- - 所有操作都是幂等的，可以安全重复执行
-- - 使用 IF NOT EXISTS 和 DO $$ 块处理错误
-- - 避免删除操作，使用标记废弃代替
-- - 大表操作考虑分批处理以避免锁表时间过长 