-- 版本 1.7.17: 为 budget_histories 表添加 user_id 字段
-- 修复预算结转历史查询问题

BEGIN;

-- 1. 为 budget_histories 表添加 user_id 字段
ALTER TABLE budget_histories 
ADD COLUMN user_id TEXT;

-- 2. 为现有的 budget_histories 记录填充 user_id
-- 通过关联 budgets 表获取对应的 user_id
UPDATE budget_histories 
SET user_id = (
    SELECT b.user_id 
    FROM budgets b 
    WHERE b.id = budget_histories.budget_id
)
WHERE user_id IS NULL;

-- 3. 为 user_id 字段添加外键约束
ALTER TABLE budget_histories 
ADD CONSTRAINT fk_budget_histories_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. 为 user_id 字段添加索引以提高查询性能
CREATE INDEX idx_budget_histories_user_id ON budget_histories(user_id);

-- 5. 创建复合索引以优化按用户和时间查询
CREATE INDEX idx_budget_histories_user_period ON budget_histories(user_id, period DESC);

-- 6. 验证数据完整性
-- 检查是否有 user_id 为 NULL 的记录
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count 
    FROM budget_histories 
    WHERE user_id IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION '发现 % 条 budget_histories 记录的 user_id 为 NULL，请检查数据完整性', null_count;
    END IF;
    
    RAISE NOTICE '数据完整性检查通过，所有 budget_histories 记录都已正确关联 user_id';
END $$;

COMMIT;

-- 记录迁移完成
INSERT INTO migration_logs (version, description, executed_at) 
VALUES ('1.7.17', '为 budget_histories 表添加 user_id 字段并填充现有数据', NOW())
ON CONFLICT (version) DO NOTHING;
