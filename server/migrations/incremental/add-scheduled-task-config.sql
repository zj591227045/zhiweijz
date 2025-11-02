-- =====================================================
-- 为计划任务添加配置字段
-- =====================================================
-- 版本: 1.8.8
-- 功能：
-- 1. 添加config字段用于存储任务专属配置（如WebDAV配置）
-- 2. 允许每个备份任务使用独立的WebDAV配置
--
-- 创建时间: 2025-11-01
-- =====================================================

-- 开始事务
BEGIN;

-- 添加config字段用于存储任务专属配置（如WebDAV配置）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scheduled_tasks' AND column_name = 'config'
  ) THEN
    ALTER TABLE scheduled_tasks ADD COLUMN config JSONB;
    COMMENT ON COLUMN scheduled_tasks.config IS '任务专属配置（JSON格式），如WebDAV备份配置';
  END IF;
END $$;

-- 提交事务
COMMIT;

