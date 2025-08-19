/*META
VERSION: 1.8.3
DESCRIPTION: 添加多人预算分摊功能支持
AUTHOR: AI Assistant
*/

-- =======================================
-- 增量迁移：为记账记录添加多人预算分摊功能
-- 支持多人预算选择和金额分摊
-- =======================================

-- 1. 添加多人预算开关字段到transactions表
DO $$ BEGIN
    ALTER TABLE transactions ADD COLUMN is_multi_budget BOOLEAN DEFAULT false NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. 添加预算分摊详情字段到transactions表
DO $$ BEGIN
    ALTER TABLE transactions ADD COLUMN budget_allocation JSONB;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 3. 添加主预算ID字段到transactions表
DO $$ BEGIN
    ALTER TABLE transactions ADD COLUMN primary_budget_id VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. 创建相关索引
CREATE INDEX IF NOT EXISTS idx_transactions_is_multi_budget ON transactions(is_multi_budget);
CREATE INDEX IF NOT EXISTS idx_transactions_budget_allocation_gin ON transactions USING GIN(budget_allocation);
CREATE INDEX IF NOT EXISTS idx_transactions_primary_budget_id ON transactions(primary_budget_id);

-- 5. 添加字段注释
COMMENT ON COLUMN transactions.is_multi_budget IS '是否为多人预算分摊记账：true=多人预算分摊，false=单人预算';
COMMENT ON COLUMN transactions.budget_allocation IS '预算分摊详情：存储多人预算分摊信息(JSON格式)，包含每个人的预算ID、分摊金额等';
COMMENT ON COLUMN transactions.primary_budget_id IS '主预算ID：用于标识交易的主要预算关联';

-- 6. 创建检查约束确保数据一致性
-- 当is_multi_budget为true时，budget_allocation不能为空
-- 当is_multi_budget为false时，budget_allocation应该为空
DO $$ BEGIN
    ALTER TABLE transactions ADD CONSTRAINT chk_multi_budget_consistency 
    CHECK (
        (is_multi_budget = true AND budget_allocation IS NOT NULL) OR
        (is_multi_budget = false AND budget_allocation IS NULL)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. 为现有数据设置默认值
-- 所有现有记录都设置为单人预算模式
UPDATE transactions 
SET is_multi_budget = false, budget_allocation = NULL 
WHERE is_multi_budget IS NULL;

-- 8. 创建用于验证budget_allocation JSON结构的函数
CREATE OR REPLACE FUNCTION validate_budget_allocation(allocation JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- 检查是否为数组
    IF jsonb_typeof(allocation) != 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- 检查数组中每个元素的结构
    -- 每个元素应包含：budgetId, amount, memberName等字段
    IF NOT (
        SELECT bool_and(
            item ? 'budgetId' AND 
            item ? 'amount' AND 
            item ? 'memberName' AND
            jsonb_typeof(item->'amount') = 'number'
        )
        FROM jsonb_array_elements(allocation) AS item
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. 添加JSON结构验证约束
DO $$ BEGIN
    ALTER TABLE transactions ADD CONSTRAINT chk_budget_allocation_structure
    CHECK (
        budget_allocation IS NULL OR 
        validate_budget_allocation(budget_allocation)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 10. 创建用于查询多人预算分摊记录的视图
CREATE OR REPLACE VIEW v_multi_budget_transactions AS
SELECT 
    t.id,
    t.amount,
    t.type,
    t.description,
    t.date,
    t.user_id,
    t.account_book_id,
    t.is_multi_budget,
    t.budget_allocation,
    -- 解析分摊详情
    jsonb_array_length(COALESCE(t.budget_allocation, '[]'::jsonb)) as allocation_count,
    -- 计算分摊总金额
    (
        SELECT COALESCE(SUM((item->>'amount')::numeric), 0)
        FROM jsonb_array_elements(COALESCE(t.budget_allocation, '[]'::jsonb)) AS item
    ) as total_allocated_amount
FROM transactions t
WHERE t.is_multi_budget = true;

-- 11. 添加视图注释
COMMENT ON VIEW v_multi_budget_transactions IS '多人预算分摊记账记录视图：提供分摊详情的汇总信息';
