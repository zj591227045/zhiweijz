-- 用户版本更新状态表
CREATE TABLE user_version_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    app_version_id UUID NOT NULL,
    version VARCHAR(50) NOT NULL,
    version_code INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, postponed, ignored, updated
    postponed_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (app_version_id) REFERENCES app_versions(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_user_version_status_user_id ON user_version_status(user_id);
CREATE INDEX idx_user_version_status_platform ON user_version_status(platform);
CREATE INDEX idx_user_version_status_user_platform ON user_version_status(user_id, platform);
CREATE INDEX idx_user_version_status_version ON user_version_status(app_version_id);
CREATE INDEX idx_user_version_status_status ON user_version_status(status);
CREATE INDEX idx_user_version_status_postponed ON user_version_status(postponed_until);

-- 创建唯一索引确保每个用户的每个平台只有一个版本状态记录
CREATE UNIQUE INDEX idx_user_version_status_unique ON user_version_status(user_id, platform, app_version_id);