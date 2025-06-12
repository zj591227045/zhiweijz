/*META
VERSION: 1.2.1
DESCRIPTION: LLM调用日志增强 - 添加服务类型字段区分官方和自定义AI服务
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：为LLM调用日志添加服务类型字段
-- 用于区分官方AI服务和自定义AI服务的token使用量
-- =======================================

-- 1. 添加service_type字段到llm_call_logs表
DO $$ BEGIN
    ALTER TABLE llm_call_logs ADD COLUMN service_type VARCHAR(20) DEFAULT 'official';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. 更新现有记录的默认值
UPDATE llm_call_logs SET service_type = 'official' WHERE service_type IS NULL;

-- 3. 设置字段为非空
DO $$ BEGIN
    ALTER TABLE llm_call_logs ALTER COLUMN service_type SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

-- 4. 创建相关索引
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_service_type ON llm_call_logs(service_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_user_service_type ON llm_call_logs(user_id, service_type, created_at DESC);

-- 5. 添加字段注释
COMMENT ON COLUMN llm_call_logs.service_type IS '服务类型：official(官方AI服务) 或 custom(自定义AI服务)'; 