/*META
VERSION: 1.5.0
DESCRIPTION: 标签系统 - 添加标签管理和记账标签关联功能
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：标签系统
-- 支持记账记录多标签管理、账本级别标签共享
-- =======================================

-- 1. 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    description TEXT,
    account_book_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 创建记账标签关联表
CREATE TABLE IF NOT EXISTS transaction_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 添加标签表约束
DO $$ BEGIN
    ALTER TABLE tags ADD CONSTRAINT tags_name_account_book_unique 
    UNIQUE (name, account_book_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE tags ADD CONSTRAINT check_color_format 
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE tags ADD CONSTRAINT check_name_length 
    CHECK (LENGTH(TRIM(name)) >= 1 AND LENGTH(TRIM(name)) <= 50);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE tags ADD CONSTRAINT check_usage_count_non_negative 
    CHECK (usage_count >= 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. 添加记账标签关联表约束
DO $$ BEGIN
    ALTER TABLE transaction_tags ADD CONSTRAINT transaction_tags_unique 
    UNIQUE (transaction_id, tag_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- 5. 添加外键约束
DO $$ BEGIN
    ALTER TABLE tags ADD CONSTRAINT fk_tags_account_book 
    FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE tags ADD CONSTRAINT fk_tags_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE transaction_tags ADD CONSTRAINT fk_transaction_tags_transaction 
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE transaction_tags ADD CONSTRAINT fk_transaction_tags_tag 
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_tags_account_book_id ON tags(account_book_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_created_by ON tags(created_by);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_account_book_active ON tags(account_book_id, is_active);

CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON transaction_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_created_at ON transaction_tags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_transaction ON transaction_tags(tag_id, transaction_id);

-- 7. 创建部分索引（仅为活跃标签）
CREATE INDEX IF NOT EXISTS idx_tags_active_name ON tags(name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tags_active_usage ON tags(usage_count DESC) WHERE is_active = true;

-- 8. 创建触发器函数：更新标签使用次数
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_tag_usage_count') THEN
        EXECUTE '
        CREATE FUNCTION update_tag_usage_count()
        RETURNS TRIGGER AS $func$
        BEGIN
            IF TG_OP = ''INSERT'' THEN
                -- 增加使用次数
                UPDATE tags SET
                    usage_count = usage_count + 1,
                    updated_at = NOW()
                WHERE id = NEW.tag_id;
                RETURN NEW;
            ELSIF TG_OP = ''DELETE'' THEN
                -- 减少使用次数
                UPDATE tags SET
                    usage_count = GREATEST(usage_count - 1, 0),
                    updated_at = NOW()
                WHERE id = OLD.tag_id;
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $func$ LANGUAGE plpgsql;
        ';
    END IF;
END $$;

-- 9. 创建触发器函数：自动更新updated_at字段
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_tags_updated_at') THEN
        EXECUTE '
        CREATE FUNCTION update_tags_updated_at()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        ';
    END IF;
END $$;

-- 10. 创建触发器
DROP TRIGGER IF EXISTS trigger_update_tag_usage_count ON transaction_tags;
CREATE TRIGGER trigger_update_tag_usage_count
    AFTER INSERT OR DELETE ON transaction_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

DROP TRIGGER IF EXISTS trigger_update_tags_updated_at ON tags;
CREATE TRIGGER trigger_update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_tags_updated_at();

-- 11. 插入系统配置（标签功能开关）
INSERT INTO system_configs (key, value, description, category) 
VALUES ('tags_enabled', 'true', '标签功能开关', 'features') 
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    description = EXCLUDED.description, 
    updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) 
VALUES ('tags_max_per_transaction', '10', '每个记账记录最大标签数量', 'limits') 
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    description = EXCLUDED.description, 
    updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) 
VALUES ('tags_max_per_account_book', '100', '每个账本最大标签数量', 'limits') 
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    description = EXCLUDED.description, 
    updated_at = NOW();

-- 12. 创建标签统计视图（可选，用于性能优化）
CREATE OR REPLACE VIEW tag_statistics AS
SELECT
    t.id,
    t.name,
    t.color,
    t.account_book_id,
    t.created_by,
    t.usage_count,
    COUNT(tt.id) as actual_usage_count,
    COALESCE(SUM(CASE WHEN tr.type = 'EXPENSE' THEN tr.amount ELSE 0 END), 0) as total_expense,
    COALESCE(SUM(CASE WHEN tr.type = 'INCOME' THEN tr.amount ELSE 0 END), 0) as total_income,
    COUNT(DISTINCT tt.transaction_id) as transaction_count,
    t.created_at,
    t.updated_at
FROM tags t
LEFT JOIN transaction_tags tt ON t.id = tt.tag_id
LEFT JOIN transactions tr ON tt.transaction_id = tr.id
WHERE t.is_active = true
GROUP BY t.id, t.name, t.color, t.account_book_id, t.created_by, t.usage_count, t.created_at, t.updated_at;
