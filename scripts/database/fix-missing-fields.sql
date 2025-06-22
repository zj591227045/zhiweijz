-- 修复数据库缺失字段脚本
-- 适用于现有数据库实例

-- 添加 users 表缺失的字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_llm_token_limit INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITHOUT TIME ZONE;

-- 添加 transactions 表缺失的字段
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_metadata_gin ON transactions USING gin (metadata);

-- 添加外键约束（如果不存在）
DO $$
BEGIN
    -- 检查并添加 transactions 表的外键约束
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_budget_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_budget_id_fkey 
        FOREIGN KEY (budget_id) REFERENCES budgets(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_account_book_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_account_book_id_fkey 
        FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_family_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_family_id_fkey 
        FOREIGN KEY (family_id) REFERENCES families(id) ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_family_member_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_family_member_id_fkey 
        FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON SCRIPT IS '修复数据库缺失字段和约束 - 适用于现有部署'; 