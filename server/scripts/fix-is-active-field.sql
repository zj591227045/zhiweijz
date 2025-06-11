-- 修复用户表缺少 is_active 字段的问题
-- 这个脚本可以安全地重复执行

-- 1. 添加 is_active 字段（如果不存在）
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. 确保所有现有用户都是激活状态
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- 3. 为新字段添加索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 4. 为用户管理功能添加组合索引（邮箱+激活状态）
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active) WHERE email IS NOT NULL;

-- 验证字段是否存在
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_active';
