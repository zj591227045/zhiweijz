-- 添加图片压缩相关配置项
-- 执行时间: 2024-12-XX

-- 全局图片压缩开关
INSERT INTO system_configs (key, value, description, category) VALUES
('image_compression_enabled', 'true', '是否启用图片压缩功能', 'storage'),
('image_compression_global_quality', '80', '全局默认压缩质量 (1-100)', 'storage')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 头像压缩配置
INSERT INTO system_configs (key, value, description, category) VALUES
('image_compression_avatar_enabled', 'true', '头像图片压缩开关', 'storage'),
('image_compression_avatar_quality', '85', '头像压缩质量 (1-100)', 'storage'),
('image_compression_avatar_max_width', '512', '头像最大宽度 (像素)', 'storage'),
('image_compression_avatar_max_height', '512', '头像最大高度 (像素)', 'storage'),
('image_compression_avatar_format', 'webp', '头像输出格式 (jpeg/png/webp/auto)', 'storage')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 记账附件压缩配置
INSERT INTO system_configs (key, value, description, category) VALUES
('image_compression_attachment_enabled', 'true', '记账附件图片压缩开关', 'storage'),
('image_compression_attachment_quality', '80', '记账附件压缩质量 (1-100)', 'storage'),
('image_compression_attachment_max_width', '1920', '记账附件最大宽度 (像素)', 'storage'),
('image_compression_attachment_max_height', '1920', '记账附件最大高度 (像素)', 'storage'),
('image_compression_attachment_format', 'auto', '记账附件输出格式 (jpeg/png/webp/auto)', 'storage')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 多模态AI图片压缩配置
INSERT INTO system_configs (key, value, description, category) VALUES
('image_compression_multimodal_enabled', 'true', '多模态AI图片压缩开关', 'storage'),
('image_compression_multimodal_quality', '90', '多模态AI图片压缩质量 (1-100)', 'storage'),
('image_compression_multimodal_max_width', '2048', '多模态AI图片最大宽度 (像素)', 'storage'),
('image_compression_multimodal_max_height', '2048', '多模态AI图片最大高度 (像素)', 'storage'),
('image_compression_multimodal_format', 'auto', '多模态AI图片输出格式 (jpeg/png/webp/auto)', 'storage')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 通用文件压缩配置
INSERT INTO system_configs (key, value, description, category) VALUES
('image_compression_general_enabled', 'true', '通用图片压缩开关', 'storage'),
('image_compression_general_quality', '80', '通用图片压缩质量 (1-100)', 'storage'),
('image_compression_general_max_width', '1920', '通用图片最大宽度 (像素)', 'storage'),
('image_compression_general_max_height', '1920', '通用图片最大高度 (像素)', 'storage'),
('image_compression_general_format', 'auto', '通用图片输出格式 (jpeg/png/webp/auto)', 'storage')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 压缩统计配置
INSERT INTO system_configs (key, value, description, category) VALUES
('image_compression_stats_enabled', 'true', '是否启用压缩统计功能', 'storage'),
('image_compression_stats_retention_days', '30', '压缩统计数据保留天数', 'storage')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 移动设备优化配置
INSERT INTO system_configs (key, value, description, category) VALUES
('image_compression_mobile_optimization', 'true', '是否启用移动设备优化', 'storage'),
('image_compression_progressive_jpeg', 'true', '是否使用渐进式JPEG', 'storage'),
('image_compression_preserve_metadata', 'false', '是否保留图片元数据（EXIF等）', 'storage')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 性能配置
INSERT INTO system_configs (key, value, description, category) VALUES
('image_compression_max_concurrent', '3', '最大并发压缩任务数', 'storage'),
('image_compression_timeout', '30000', '单个压缩任务超时时间 (毫秒)', 'storage'),
('image_compression_fallback_enabled', 'true', '压缩失败时是否使用原始文件', 'storage')
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();
