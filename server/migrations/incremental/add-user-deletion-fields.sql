/*META
VERSION: 1.3.2
DESCRIPTION: 添加用户注销相关字段
AUTHOR: system
*/

-- 添加用户注销相关字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_deletion_requested_at ON users(deletion_requested_at);
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_at ON users(deletion_scheduled_at);

-- 添加注释
COMMENT ON COLUMN users.deletion_requested_at IS '用户请求注销的时间';
COMMENT ON COLUMN users.deletion_scheduled_at IS '预定注销时间（24小时后）';
