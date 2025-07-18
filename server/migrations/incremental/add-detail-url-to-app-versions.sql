-- 为app_versions表添加detail_url字段
-- 用于存储详细更新情况的链接

-- 添加detail_url字段
ALTER TABLE app_versions 
ADD COLUMN IF NOT EXISTS detail_url TEXT;

-- 添加注释
COMMENT ON COLUMN app_versions.detail_url IS '详细更新情况链接，用于跳转到详细的更新说明页面';

-- 更新现有记录的示例（可选）
-- UPDATE app_versions 
-- SET detail_url = 'https://github.com/your-repo/releases/tag/v' || version
-- WHERE detail_url IS NULL AND platform = 'WEB';
