/*META
VERSION: 1.7.6
DESCRIPTION: 修复每日首次访问赠送记账点的并发问题 - 创建专门的每日赠送记录表
AUTHOR: system
DATE: 2025-07-15
*/

-- 创建每日赠送记录表，使用唯一约束防止并发重复赠送
CREATE TABLE IF NOT EXISTS daily_gift_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gift_date DATE NOT NULL, -- 赠送日期（北京时间）
    points_given INTEGER NOT NULL DEFAULT 0, -- 实际赠送的点数
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- 唯一约束：每个用户每天只能有一条记录
    UNIQUE(user_id, gift_date)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_daily_gift_records_user_id ON daily_gift_records(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_gift_records_date ON daily_gift_records(gift_date);
CREATE INDEX IF NOT EXISTS idx_daily_gift_records_user_date ON daily_gift_records(user_id, gift_date);

-- 迁移现有数据：从user_accounting_points表的last_daily_gift_date字段迁移到新表
-- 只迁移有last_daily_gift_date的记录
INSERT INTO daily_gift_records (user_id, gift_date, points_given, created_at)
SELECT 
    user_id,
    last_daily_gift_date,
    5, -- 假设之前赠送的都是5点
    COALESCE(updated_at, created_at) -- 使用更新时间或创建时间
FROM user_accounting_points 
WHERE last_daily_gift_date IS NOT NULL
ON CONFLICT (user_id, gift_date) DO NOTHING; -- 如果已存在则忽略

-- 为了保持向后兼容，暂时保留last_daily_gift_date字段
-- 后续版本可以考虑删除该字段

-- 添加注释
COMMENT ON TABLE daily_gift_records IS '每日赠送记录表，用于防止并发重复赠送记账点';
COMMENT ON COLUMN daily_gift_records.user_id IS '用户ID';
COMMENT ON COLUMN daily_gift_records.gift_date IS '赠送日期（北京时间）';
COMMENT ON COLUMN daily_gift_records.points_given IS '实际赠送的点数';
COMMENT ON CONSTRAINT daily_gift_records_user_id_gift_date_key ON daily_gift_records IS '确保每个用户每天只能有一条赠送记录';
