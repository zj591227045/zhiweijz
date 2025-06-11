-- 管理员功能数据库扩展迁移
-- 版本: v1.0.0 -> v1.1.0
-- 时间: 2024-01-01
-- 说明: 添加管理员认证、系统配置、公告系统、日志记录等功能

-- =====================================
-- 1. 管理员认证系统
-- =====================================

-- 管理员角色枚举（如果不存在）
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- 管理员索引
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);

-- =====================================
-- 2. 系统配置管理
-- =====================================

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

-- 系统配置索引
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);
CREATE INDEX IF NOT EXISTS idx_system_configs_category ON system_configs(category);

-- =====================================
-- 3. 公告系统
-- =====================================

-- 公告优先级和状态枚举
DO $$ BEGIN
    CREATE TYPE announcement_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE announcement_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    priority announcement_priority NOT NULL DEFAULT 'NORMAL',
    status announcement_status NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    target_user_type VARCHAR(50) DEFAULT 'all', -- 'all', 'new', 'existing'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL
);

-- 公告索引
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_target ON announcements(target_user_type);

-- 公告已读记录表
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 公告已读记录索引（关键性能优化）
CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_reads_unique ON announcement_reads(announcement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id, read_at DESC);

-- =====================================
-- 4. 日志记录系统
-- =====================================

-- 前端访问日志表（按月分区）
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100), -- 冗余存储，用户删除后仍可查看
    path VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    query_params TEXT,
    user_agent TEXT,
    ip_address INET,
    referer TEXT,
    duration INTEGER, -- 页面停留时间（毫秒）
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- API调用日志表（按月分区）
CREATE TABLE IF NOT EXISTS api_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100), -- 冗余存储
    status_code INTEGER NOT NULL,
    duration INTEGER NOT NULL, -- 响应时间（毫秒）
    request_size INTEGER, -- 请求大小（字节）
    response_size INTEGER, -- 响应大小（字节）
    error_message TEXT, -- 错误信息
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- LLM调用日志表（按月分区）
CREATE TABLE IF NOT EXISTS llm_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL, -- 冗余存储
    account_book_id UUID REFERENCES account_books(id) ON DELETE SET NULL,
    account_book_name VARCHAR(200), -- 冗余存储
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
    duration INTEGER NOT NULL, -- 响应时间（毫秒）
    cost DECIMAL(10, 6), -- 调用成本
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 创建当前月份的分区表
DO $$
DECLARE
    current_month_start DATE;
    next_month_start DATE;
    table_suffix TEXT;
BEGIN
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    next_month_start := current_month_start + INTERVAL '1 month';
    table_suffix := TO_CHAR(current_month_start, 'YYYY_MM');
    
    -- 创建当前月份的分区表
    EXECUTE format('CREATE TABLE IF NOT EXISTS access_logs_%s PARTITION OF access_logs FOR VALUES FROM (%L) TO (%L)', 
                   table_suffix, current_month_start, next_month_start);
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS api_call_logs_%s PARTITION OF api_call_logs FOR VALUES FROM (%L) TO (%L)', 
                   table_suffix, current_month_start, next_month_start);
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS llm_call_logs_%s PARTITION OF llm_call_logs FOR VALUES FROM (%L) TO (%L)', 
                   table_suffix, current_month_start, next_month_start);
END $$;

-- 日志表索引
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

-- =====================================
-- 5. 统计聚合表
-- =====================================

-- 统计数据聚合表
CREATE TABLE IF NOT EXISTS statistics_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL, -- 指标类型
    date DATE NOT NULL, -- 统计日期
    value DECIMAL(20, 6) NOT NULL, -- 统计值
    metadata JSONB, -- 元数据
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 统计表索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_statistics_metric_date ON statistics_aggregations(metric_type, date);
CREATE INDEX IF NOT EXISTS idx_statistics_date ON statistics_aggregations(date DESC);

-- =====================================
-- 6. 插入默认数据
-- =====================================

-- 插入默认管理员账号（密码: zhiweijz2025）
-- 使用bcrypt哈希: $2b$10$Jm.mqOlmzYFUoGfT3U/G4uvcRoEd/6wvGSOSbeCvgltZBjDMKMKq6
INSERT INTO admins (username, password_hash, email, role, is_active) 
VALUES ('admin', '$2b$10$Jm.mqOlmzYFUoGfT3U/G4uvcRoEd/6wvGSOSbeCvgltZBjDMKMKq6', 'admin@zhiweijz.com', 'SUPER_ADMIN', true)
ON CONFLICT (username) DO NOTHING;

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
ON CONFLICT (key) DO NOTHING;

-- =====================================
-- 7. 创建更新时间触发器
-- =====================================

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表添加更新时间触发器
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM (VALUES ('admins'), ('system_configs'), ('announcements'), ('statistics_aggregations')) AS tables(table_name)
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_updated_at ON %I', t);
        EXECUTE format('CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END LOOP;
END $$;

-- =====================================
-- 8. 版本控制
-- =====================================

-- 创建版本控制表
CREATE TABLE IF NOT EXISTS schema_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    migration_file VARCHAR(255)
);

-- 记录当前迁移版本
INSERT INTO schema_versions (version, description, migration_file) 
VALUES ('1.1.0', '添加管理员功能、公告系统、日志记录等', 'admin_extension.sql')
ON CONFLICT DO NOTHING;

-- =====================================
-- 9. 性能优化
-- =====================================

-- 更新表统计信息
ANALYZE admins;
ANALYZE system_configs;
ANALYZE announcements;
ANALYZE announcement_reads;
ANALYZE access_logs;
ANALYZE api_call_logs;
ANALYZE llm_call_logs;
ANALYZE statistics_aggregations;

-- =====================================
-- 10. 权限和安全
-- =====================================

-- 确保敏感表的安全性
-- 为API密钥等敏感字段添加行级安全策略（可选）
-- 这里暂时跳过RLS配置，可在后续根据需要添加 