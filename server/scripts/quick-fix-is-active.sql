-- 快速修复 is_active 字段缺失问题
-- 可以直接在 PostgreSQL 中执行

-- 检查字段是否存在
DO $$
BEGIN
    -- 检查 is_active 字段是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        -- 添加字段
        ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'is_active 字段已添加';
    ELSE
        RAISE NOTICE 'is_active 字段已存在';
    END IF;
END $$;

-- 确保所有现有用户都是激活状态
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- 添加索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active) WHERE email IS NOT NULL;

-- 验证结果
SELECT 
    'users' as table_name,
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_active';

-- 显示用户统计
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
FROM users;
