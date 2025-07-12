/*META
VERSION: 1.7.4
DESCRIPTION: 添加记账点系统 - 用户记账点余额、消费记录和签到功能
AUTHOR: system
DATE: 2025-07-12
*/

-- 创建用户记账点余额表
CREATE TABLE IF NOT EXISTS user_accounting_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gift_balance INTEGER NOT NULL DEFAULT 0, -- 赠送余额
    member_balance INTEGER NOT NULL DEFAULT 0, -- 会员余额
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 创建记账点消费记录表
CREATE TABLE IF NOT EXISTS accounting_points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'text', 'voice', 'image', 'gift', 'member', 'daily', 'checkin', 'admin'
    operation VARCHAR(10) NOT NULL, -- 'add', 'deduct'
    points INTEGER NOT NULL, -- 变动的点数
    balance_type VARCHAR(10) NOT NULL, -- 'gift', 'member'
    balance_after INTEGER NOT NULL, -- 操作后的余额
    description TEXT, -- 操作描述
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建用户签到记录表
CREATE TABLE IF NOT EXISTS user_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL, -- 签到日期
    points_awarded INTEGER NOT NULL DEFAULT 5, -- 签到获得的点数
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, checkin_date)
);

-- 为所有现有用户初始化记账点账户（初始赠送余额为10点）
INSERT INTO user_accounting_points (user_id, gift_balance, member_balance)
SELECT id, 10, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 为初始化的记账点创建记录
INSERT INTO accounting_points_transactions (user_id, type, operation, points, balance_type, balance_after, description)
SELECT 
    id, 
    'gift', 
    'add', 
    10, 
    'gift', 
    10, 
    '系统初始化赠送记账点'
FROM users
WHERE id NOT IN (SELECT user_id FROM accounting_points_transactions WHERE type = 'gift' AND description = '系统初始化赠送记账点');

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_accounting_points_transactions_user_id ON accounting_points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_points_transactions_created_at ON accounting_points_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_checkins_user_id ON user_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_checkins_date ON user_checkins(checkin_date);

-- 更新记录的函数：当用户记账点余额变化时，自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_accounting_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS accounting_points_updated_at_trigger ON user_accounting_points;
CREATE TRIGGER accounting_points_updated_at_trigger
    BEFORE UPDATE ON user_accounting_points
    FOR EACH ROW
    EXECUTE FUNCTION update_accounting_points_updated_at();