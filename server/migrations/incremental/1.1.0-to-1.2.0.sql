/*META
VERSION: 1.2.0
DESCRIPTION: 用户管理功能增强 - 添加用户激活状态字段
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：从 1.1.0 升级到 1.2.0
-- 功能描述：为用户管理功能添加用户激活状态控制
-- =======================================

-- 1. 添加用户激活状态字段到users表（如果不存在）
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. 为新字段添加索引（用于快速筛选激活用户）
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 3. 为用户管理功能添加组合索引（邮箱+激活状态）
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active) WHERE email IS NOT NULL;

-- 4. 插入用户管理相关系统配置
INSERT INTO system_configs (key, value, description, category) VALUES
('user_registration_enabled', 'true', '用户注册开关', 'user_management'),
('user_default_active_status', 'true', '新用户默认激活状态', 'user_management'),
('user_password_reset_enabled', 'true', '密码重置功能开关', 'user_management')
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 5. 确保所有现有用户都是激活状态（数据一致性）
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- =======================================
-- 迁移完成
-- ======================================= 