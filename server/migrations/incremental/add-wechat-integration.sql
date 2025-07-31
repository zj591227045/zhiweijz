/*META
VERSION: 1.3.1
DESCRIPTION: 微信服务号集成 - 添加微信用户绑定和消息日志表
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：微信服务号集成
-- 添加微信用户绑定表和消息日志表，支持微信服务号与只为记账的集成
-- =======================================

-- 1. 创建微信用户绑定表
CREATE TABLE IF NOT EXISTS wechat_user_bindings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    openid VARCHAR(50) NOT NULL,
    user_id TEXT NOT NULL,
    default_account_book_id TEXT,
    zhiwei_token TEXT,
    zhiwei_refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 创建微信消息日志表
CREATE TABLE IF NOT EXISTS wechat_message_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    openid VARCHAR(50) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    content TEXT,
    response TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processing_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 添加唯一约束
DO $$ BEGIN
    ALTER TABLE wechat_user_bindings ADD CONSTRAINT wechat_user_bindings_openid_unique UNIQUE (openid);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- 4. 添加外键约束
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_wechat_user_bindings_user'
    ) THEN
        ALTER TABLE wechat_user_bindings 
        ADD CONSTRAINT fk_wechat_user_bindings_user 
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 暂时注释掉这个外键约束，因为需要类型转换
-- 在Prisma schema中default_account_book_id定义为String类型
-- 而account_books.id是UUID类型，需要在应用层面处理这个关联
-- DO $$ BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM information_schema.table_constraints 
--         WHERE constraint_name = 'fk_wechat_user_bindings_account_book'
--     ) THEN
--         ALTER TABLE wechat_user_bindings 
--         ADD CONSTRAINT fk_wechat_user_bindings_account_book 
--         FOREIGN KEY (default_account_book_id) REFERENCES account_books(id) 
--         ON DELETE SET NULL;
--     END IF;
-- END $$;

-- 注释掉有问题的外键约束
-- 微信消息日志不应该强制要求openid在绑定表中存在
-- 因为用户可能在未绑定的情况下发送消息
-- DO $$ BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM information_schema.table_constraints
--         WHERE constraint_name = 'fk_wechat_message_logs_binding'
--     ) THEN
--         ALTER TABLE wechat_message_logs
--         ADD CONSTRAINT fk_wechat_message_logs_binding
--         FOREIGN KEY (openid) REFERENCES wechat_user_bindings(openid)
--         ON DELETE CASCADE;
--     END IF;
-- END $$;

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_wechat_user_bindings_user_id ON wechat_user_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_wechat_user_bindings_openid ON wechat_user_bindings(openid);
CREATE INDEX IF NOT EXISTS idx_wechat_user_bindings_is_active ON wechat_user_bindings(is_active);
CREATE INDEX IF NOT EXISTS idx_wechat_message_logs_openid_time ON wechat_message_logs(openid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wechat_message_logs_status_time ON wechat_message_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wechat_message_logs_message_type ON wechat_message_logs(message_type);

-- 6. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_wechat_user_bindings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wechat_user_bindings_updated_at ON wechat_user_bindings;
CREATE TRIGGER trigger_update_wechat_user_bindings_updated_at 
    BEFORE UPDATE ON wechat_user_bindings 
    FOR EACH ROW EXECUTE FUNCTION update_wechat_user_bindings_updated_at();

-- 7. 插入系统配置
INSERT INTO system_configs (key, value, description, category) VALUES ('wechat_integration_enabled', 'true', '微信集成功能开关', 'wechat') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) VALUES ('wechat_message_log_retention_days', '30', '微信消息日志保留天数', 'wechat') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) VALUES ('wechat_smart_accounting_enabled', 'true', '微信智能记账功能开关', 'wechat') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

-- 注释：
-- - 微信用户绑定表存储微信openid与只为记账用户的关联关系
-- - 支持设置默认账本，便于快速记账
-- - 消息日志表记录所有微信交互，便于调试和统计
-- - 所有操作都是幂等的，可以安全重复执行
