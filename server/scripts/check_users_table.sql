-- 检查 users 表结构
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 检查 users 表中的数据
SELECT id, email, name, created_at, updated_at
FROM users
LIMIT 10;
