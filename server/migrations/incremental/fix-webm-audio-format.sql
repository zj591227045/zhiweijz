/*META
VERSION: 1.7.2
DESCRIPTION: 语音识别音频格式增强 - 添加WebM格式支持
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：WebM音频格式支持
-- 更新语音识别支持的音频格式，添加webm格式
-- 创建时间: 2025-01-11
-- =======================================

-- 更新语音识别支持的音频格式，添加webm格式
UPDATE system_configs 
SET value = 'mp3,wav,m4a,flac,aac,webm', 
    updated_at = NOW()
WHERE key = 'speech_allowed_formats' AND category = 'ai_multimodal';

-- 如果记录不存在，则插入新记录
INSERT INTO system_configs (key, value, description, category) 
VALUES ('speech_allowed_formats', 'mp3,wav,m4a,flac,aac,webm', '支持的语音文件格式', 'ai_multimodal')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 添加注释说明
COMMENT ON TABLE system_configs IS '系统配置表，存储各种系统级配置参数';