-- 添加缺失的LLM配置项
-- 这个脚本用于补充全局AI服务管理所需的配置项

-- 插入LLM相关配置（仅在不存在时插入，避免覆盖用户配置）
INSERT INTO system_configs (key, value, description, category) VALUES
('llm_global_temperature', '0.7', '全局LLM温度参数', 'llm'),
('llm_global_max_tokens', '1000', '全局LLM最大Token数', 'llm'),
('llm_daily_token_limit', '50000', '每日免费Token额度', 'llm'),
('llm_service_version', '1.0.0', 'LLM服务版本', 'llm'),
('llm_service_status_check_interval', '300', 'LLM服务状态检查间隔(秒)', 'llm')
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category
  -- 注意：不更新 value 和 updated_at，保留用户的配置值

-- 确保所有必要的LLM配置都存在
INSERT INTO system_configs (key, value, description, category) VALUES
('allow_registration', 'true', '是否允许新用户注册', 'user_management'),
('llm_global_enabled', 'false', '是否启用全局LLM配置', 'llm'),
('llm_global_provider', 'openai', '全局LLM服务提供商', 'llm'),
('llm_global_model', 'gpt-3.5-turbo', '全局LLM模型', 'llm'),
('llm_global_api_key', '', '全局LLM API密钥', 'llm'),
('llm_global_base_url', '', '全局LLM服务地址', 'llm')
ON CONFLICT (key) DO NOTHING;
