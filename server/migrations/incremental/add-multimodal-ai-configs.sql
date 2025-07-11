-- 多模态AI配置迁移脚本 v1.7.1
-- 添加图片识别和语音识别功能所需的配置项
-- 版本: 1.7.1
-- 创建时间: 2025-01-10

-- 语音识别配置
INSERT INTO system_configs (key, value, description, category) VALUES
('speech_enabled', 'false', '语音识别功能启用状态', 'ai_multimodal'),
('speech_provider', 'siliconflow', '语音识别服务提供商', 'ai_multimodal'),
('speech_model', 'FunAudioLLM/SenseVoiceSmall', '语音识别模型', 'ai_multimodal'),
('speech_api_key', '', '语音识别API密钥', 'ai_multimodal'),
('speech_base_url', 'https://api.siliconflow.cn/v1', '语音识别API基础URL', 'ai_multimodal'),
('speech_max_file_size', '10485760', '语音文件最大大小(字节)', 'ai_multimodal'),
('speech_allowed_formats', 'mp3,wav,m4a,flac,aac,webm', '支持的语音文件格式', 'ai_multimodal'),
('speech_timeout', '60', '语音识别超时时间(秒)', 'ai_multimodal')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 视觉识别配置
INSERT INTO system_configs (key, value, description, category) VALUES
('vision_enabled', 'false', '视觉识别功能启用状态', 'ai_multimodal'),
('vision_provider', 'siliconflow', '视觉识别服务提供商', 'ai_multimodal'),
('vision_model', 'Qwen/Qwen2.5-VL-72B-Instruct', '视觉识别模型', 'ai_multimodal'),
('vision_api_key', '', '视觉识别API密钥', 'ai_multimodal'),
('vision_base_url', 'https://api.siliconflow.cn/v1', '视觉识别API基础URL', 'ai_multimodal'),
('vision_max_file_size', '10485760', '图片文件最大大小(字节)', 'ai_multimodal'),
('vision_allowed_formats', 'jpg,jpeg,png,webp,bmp,gif', '支持的图片文件格式', 'ai_multimodal'),
('vision_detail_level', 'high', '图片识别细节级别(low/high/auto)', 'ai_multimodal'),
('vision_timeout', '60', '视觉识别超时时间(秒)', 'ai_multimodal')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 多模态AI通用配置
INSERT INTO system_configs (key, value, description, category) VALUES
('multimodal_ai_enabled', 'false', '多模态AI功能总开关', 'ai_multimodal'),
('multimodal_ai_daily_limit', '100', '每日多模态AI调用次数限制', 'ai_multimodal'),
('multimodal_ai_user_limit', '10', '每用户每日多模态AI调用次数限制', 'ai_multimodal'),
('multimodal_ai_retry_count', '3', '多模态AI调用失败重试次数', 'ai_multimodal'),
('multimodal_ai_cache_enabled', 'true', '多模态AI结果缓存开关', 'ai_multimodal'),
('multimodal_ai_cache_ttl', '3600', '多模态AI结果缓存时间(秒)', 'ai_multimodal')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- S3存储桶配置扩展（为多模态文件存储）
INSERT INTO system_configs (key, value, description, category) VALUES
('s3_bucket_audio', 'audio-files', '音频文件存储桶名称', 'storage'),
('s3_bucket_images', 'image-files', '图片文件存储桶名称', 'storage'),
('s3_bucket_multimodal_temp', 'multimodal-temp', '多模态临时文件存储桶名称', 'storage')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 智能记账集成配置
INSERT INTO system_configs (key, value, description, category) VALUES
('smart_accounting_vision_enabled', 'false', '智能记账图片识别功能开关', 'ai_multimodal'),
('smart_accounting_speech_enabled', 'false', '智能记账语音识别功能开关', 'ai_multimodal'),
('smart_accounting_multimodal_prompt', '请分析这个图片/语音内容，提取其中的记账信息，包括金额、类别、时间、备注等。', '智能记账多模态提示词', 'ai_multimodal')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_system_configs_ai_multimodal 
ON system_configs (category) 
WHERE category = 'ai_multimodal';

-- 添加注释
COMMENT ON TABLE system_configs IS '系统配置表，存储各种系统级配置参数';
COMMENT ON COLUMN system_configs.category IS '配置分类，ai_multimodal为多模态AI相关配置';
