/*META
VERSION: 1.2.2
DESCRIPTION: 交易记录增强 - 添加元数据字段支持历史交易标记
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：为交易记录添加元数据字段
-- 用于支持历史交易标记和其他元数据存储
-- =======================================

-- 1. 添加metadata字段到transactions表
DO $$ BEGIN
    ALTER TABLE transactions ADD COLUMN metadata JSONB;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. 创建相关索引（针对JSONB字段的常用查询）
CREATE INDEX IF NOT EXISTS idx_transactions_metadata_gin ON transactions USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_transactions_metadata_historical ON transactions((metadata->>'isHistorical')) WHERE metadata->>'isHistorical' = 'true';

-- 3. 添加字段注释
COMMENT ON COLUMN transactions.metadata IS '交易记录元数据：存储历史交易标记、创建时间、消费日期等信息(JSON格式)'; 