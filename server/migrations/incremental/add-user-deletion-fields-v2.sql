/*META
VERSION: 1.4.0
DESCRIPTION: 添加用户注销相关字段 - 正式版本
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：用户注销功能
-- 添加用户注销请求和预定时间字段，支持用户账户删除功能
-- =======================================

-- 1. 添加用户注销相关字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE;

-- 2. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_deletion_requested_at ON users(deletion_requested_at);
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_at ON users(deletion_scheduled_at);

-- 3. 添加字段注释
COMMENT ON COLUMN users.deletion_requested_at IS '用户请求注销的时间';
COMMENT ON COLUMN users.deletion_scheduled_at IS '预定注销时间（24小时后）';

-- 4. 创建用户注销日志表
CREATE TABLE IF NOT EXISTS user_deletion_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deletion_reason TEXT,
    admin_user_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT user_deletion_logs_status_check CHECK (status IN ('pending', 'cancelled', 'completed', 'failed'))
);

-- 5. 添加用户注销日志表索引
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_user_id ON user_deletion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_status ON user_deletion_logs(status);
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_scheduled_at ON user_deletion_logs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_created_at ON user_deletion_logs(created_at DESC);

-- 6. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_user_deletion_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_user_deletion_logs_updated_at ON user_deletion_logs;
CREATE TRIGGER trigger_update_user_deletion_logs_updated_at 
    BEFORE UPDATE ON user_deletion_logs 
    FOR EACH ROW EXECUTE FUNCTION update_user_deletion_logs_updated_at();

-- 7. 插入系统配置
INSERT INTO system_configs (key, value, description, category) VALUES ('user_deletion_enabled', 'true', '用户注销功能开关', 'user_management') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) VALUES ('user_deletion_delay_hours', '24', '用户注销延迟时间（小时）', 'user_management') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) VALUES ('user_deletion_cleanup_enabled', 'true', '用户数据清理功能开关', 'user_management') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

-- 注释：
-- - 用户注销字段存储用户请求注销的时间和预定执行时间
-- - 注销日志表记录所有注销操作，便于审计和恢复
-- - 支持24小时延迟注销，给用户后悔的机会
-- - 所有操作都是幂等的，可以安全重复执行 