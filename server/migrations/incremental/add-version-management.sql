-- 版本管理系统数据库迁移

-- 创建枚举类型
CREATE TYPE "Platform" AS ENUM ('WEB', 'IOS', 'ANDROID');
CREATE TYPE "VersionAction" AS ENUM ('CHECK', 'UPDATE', 'SKIP');

-- 创建应用版本表
CREATE TABLE IF NOT EXISTS app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform "Platform" NOT NULL,
    version VARCHAR(50) NOT NULL,
    build_number INTEGER NOT NULL,
    version_code INTEGER NOT NULL, -- 用于版本比较
    release_notes TEXT,
    download_url TEXT,
    app_store_url TEXT, -- iOS App Store URL
    is_force_update BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(platform, version),
    UNIQUE(platform, version_code)
);

-- 创建版本配置表
CREATE TABLE IF NOT EXISTS version_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建版本检查日志表
CREATE TABLE IF NOT EXISTS version_check_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    platform "Platform" NOT NULL,
    current_version VARCHAR(50),
    current_build_number INTEGER,
    latest_version VARCHAR(50),
    latest_build_number INTEGER,
    action "VersionAction" NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_app_versions_platform ON app_versions(platform);
CREATE INDEX IF NOT EXISTS idx_app_versions_enabled ON app_versions(is_enabled);
CREATE INDEX IF NOT EXISTS idx_app_versions_published_at ON app_versions(published_at);
CREATE INDEX IF NOT EXISTS idx_version_check_logs_user_id ON version_check_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_version_check_logs_platform ON version_check_logs(platform);
CREATE INDEX IF NOT EXISTS idx_version_check_logs_created_at ON version_check_logs(created_at);

-- 插入默认配置
INSERT INTO version_configs (key, value, description) VALUES
('version_check_enabled', 'false', '启用版本检查功能'),
('version_check_interval', '86400', '版本检查间隔(秒)'),
('force_update_grace_period', '604800', '强制更新宽限期(秒)'),
('version_check_api_enabled', 'true', '启用版本检查API'),
('update_notification_enabled', 'true', '启用更新通知')
ON CONFLICT (key) DO NOTHING;

-- 插入初始版本数据
INSERT INTO app_versions (platform, version, build_number, version_code, release_notes, is_enabled, published_at) VALUES
('WEB', '1.0.0', 1, 1000, '初始版本', true, NOW()),
('IOS', '1.0.0', 1, 1000, '初始版本', true, NOW()),
('ANDROID', '1.0.0', 1, 1000, '初始版本', true, NOW())
ON CONFLICT (platform, version) DO NOTHING;