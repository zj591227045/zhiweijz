/*META
VERSION: 1.1.0
DESCRIPTION: Admin features - Management system tables and configurations
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 管理员功能迁移：管理员系统相关表
-- =======================================

-- 创建管理员相关枚举
CREATE TYPE IF NOT EXISTS admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN');
CREATE TYPE IF NOT EXISTS announcement_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE IF NOT EXISTS announcement_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role admin_role NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL
);

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    priority announcement_priority NOT NULL DEFAULT 'NORMAL',
    status announcement_status NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    target_user_type VARCHAR(50) DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL
);

-- 公告已读记录表
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 访问日志表
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100),
    path VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    query_params TEXT,
    user_agent TEXT,
    ip_address TEXT,
    referer TEXT,
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- API调用日志表
CREATE TABLE IF NOT EXISTS api_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100),
    status_code INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    request_size INTEGER,
    response_size INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- LLM调用日志表
CREATE TABLE IF NOT EXISTS llm_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    account_book_id TEXT REFERENCES account_books(id) ON DELETE SET NULL,
    account_book_name VARCHAR(200),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    user_message TEXT NOT NULL,
    assistant_message TEXT,
    system_prompt TEXT,
    is_success BOOLEAN NOT NULL,
    error_message TEXT,
    duration INTEGER NOT NULL,
    cost DECIMAL(10, 6),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 统计聚合表
CREATE TABLE IF NOT EXISTS statistics_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    value DECIMAL(20, 6) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);

CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);
CREATE INDEX IF NOT EXISTS idx_system_configs_category ON system_configs(category);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_target ON announcements(target_user_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_reads_unique ON announcement_reads(announcement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id, read_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_time ON access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_path_time ON access_logs(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip ON access_logs(ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_endpoint_time ON api_call_logs(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_time ON api_call_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_status ON api_call_logs(status_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_call_logs_user_time ON llm_call_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_account_book_time ON llm_call_logs(account_book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_provider_model ON llm_call_logs(provider, model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_success ON llm_call_logs(is_success, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_statistics_metric_date ON statistics_aggregations(metric_type, date);
CREATE INDEX IF NOT EXISTS idx_statistics_date ON statistics_aggregations(date DESC);

-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表添加更新时间触发器
DROP TRIGGER IF EXISTS trigger_update_updated_at ON admins;
CREATE TRIGGER trigger_update_updated_at 
    BEFORE UPDATE ON admins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_updated_at ON system_configs;
CREATE TRIGGER trigger_update_updated_at 
    BEFORE UPDATE ON system_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_updated_at ON announcements;
CREATE TRIGGER trigger_update_updated_at 
    BEFORE UPDATE ON announcements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_updated_at ON statistics_aggregations;
CREATE TRIGGER trigger_update_updated_at 
    BEFORE UPDATE ON statistics_aggregations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认管理员账号（仅在不存在时创建，避免重置现有密码）
INSERT INTO admins (username, password_hash, email, role, is_active) 
VALUES ('admin', '$2b$10$Jm.mqOlmzYFUoGfT3U/G4uvcRoEd/6wvGSOSbeCvgltZBjDMKMKq6', 'admin@zhiweijz.com', 'SUPER_ADMIN', true)
ON CONFLICT (username) 
DO UPDATE SET 
  -- 只更新非敏感字段，保留现有密码
  email = CASE WHEN admins.email IS NULL OR admins.email = '' THEN EXCLUDED.email ELSE admins.email END,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 插入默认系统配置
INSERT INTO system_configs (key, value, description, category) VALUES
('allow_registration', 'true', '是否允许新用户注册', 'user_management'),
('llm_global_enabled', 'false', '是否启用全局LLM配置', 'llm'),
('llm_global_provider', 'openai', '全局LLM服务提供商', 'llm'),
('llm_global_model', 'gpt-3.5-turbo', '全局LLM模型', 'llm'),
('llm_global_api_key', '', '全局LLM API密钥', 'llm'),
('llm_global_base_url', '', '全局LLM服务地址', 'llm'),
('max_users', '1000', '最大用户数限制', 'limits'),
('max_account_books_per_user', '10', '每用户最大账本数', 'limits'),
('data_retention_days', '365', '数据保留天数', 'data_management'),
('backup_enabled', 'true', '是否启用自动备份', 'data_management')
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW(); 