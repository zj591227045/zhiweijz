/*META
VERSION: 1.3.0
DESCRIPTION: LLM限额管理功能 - 添加全局LLM限额配置和用户个人LLM限额字段
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：从 1.2.2 升级到 1.3.0
-- 功能描述：实现完整的LLM Token限额管理系统
-- =======================================

-- 1. 为用户表添加个人LLM限额字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_llm_token_limit INTEGER DEFAULT NULL;

-- 2. 为用户表添加字段注释
COMMENT ON COLUMN users.daily_llm_token_limit IS '用户个人每日LLM Token限额，NULL表示使用全局限额';

-- 3. 插入LLM限额相关系统配置
INSERT INTO system_configs (key, value, description, category) VALUES
('llm_global_daily_token_limit', '50000', '全局每日LLM Token限额', 'llm_management'),
('llm_token_limit_enabled', 'true', 'LLM Token限额功能开关', 'llm_management'),
('llm_token_limit_enforcement', 'true', 'LLM Token限额强制执行', 'llm_management'),
('llm_user_limit_override_enabled', 'true', '允许用户个人限额覆盖全局限额', 'llm_management')
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. 为daily_llm_token_limit字段添加索引（用于快速查询有自定义限额的用户）
CREATE INDEX IF NOT EXISTS idx_users_daily_llm_token_limit ON users(daily_llm_token_limit) WHERE daily_llm_token_limit IS NOT NULL;

-- 5. 为LlmCallLog表添加复合索引以优化token使用量查询性能
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_user_created_success ON llm_call_logs(user_id, created_at, is_success) WHERE is_success = true;

-- 6. 为LlmCallLog表添加今日使用量快速查询索引
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_user_tokens ON llm_call_logs(user_id, created_at, total_tokens) WHERE is_success = true;

-- =======================================
-- 迁移完成：LLM限额管理功能已添加
-- 优先级：用户限额 -> 全局限额
-- 版本：1.3.0
-- ======================================= 