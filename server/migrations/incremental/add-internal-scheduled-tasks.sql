-- =====================================================
-- 添加内部定时任务到计划任务表
-- =====================================================
-- 版本: 1.8.7
-- 功能：
-- 1. 添加8个内部定时任务（默认禁用）
-- 2. 添加WebDAV备份配置
-- 3. 支持统一定时任务调度器
--
-- 创建时间: 2025-11-01
-- =====================================================

-- 开始事务
BEGIN;

-- 设置时区为北京时间
SET timezone = 'Asia/Shanghai';

-- 1. 用户注销请求处理任务
INSERT INTO scheduled_tasks (
  id,
  name,
  description,
  script_type,
  script_path,
  cron_expression,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '用户注销请求处理',
  '检查并处理过期的用户注销请求，自动删除到期用户数据',
  'internal',
  'user-deletion-check',
  '0 0 * * *',
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 2. 会员到期检查任务
INSERT INTO scheduled_tasks (
  id,
  name,
  description,
  script_type,
  script_path,
  cron_expression,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '会员到期检查',
  '检查并处理到期会员，自动降级会员等级',
  'internal',
  'membership-expiry-check',
  '30 * * * *',
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 3. 微信媒体文件清理任务
INSERT INTO scheduled_tasks (
  id,
  name,
  description,
  script_type,
  script_path,
  cron_expression,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '微信媒体文件清理',
  '清理超过1小时的微信临时媒体文件',
  'internal',
  'wechat-media-cleanup',
  '0 * * * *',
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 4. 数据聚合任务
INSERT INTO scheduled_tasks (
  id,
  name,
  description,
  script_type,
  script_path,
  cron_expression,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '数据聚合（手动执行）',
  '手动执行数据聚合，包含每小时和每日聚合任务',
  'internal',
  'data-aggregation-manual',
  '0 * * * *',
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 5. 对象存储临时文件清理任务
INSERT INTO scheduled_tasks (
  id,
  name,
  description,
  script_type,
  script_path,
  cron_expression,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '对象存储临时文件清理',
  '清理对象存储中的过期临时文件',
  'internal',
  'storage-temp-files-cleanup',
  '0 2 * * *',
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 6. 预算结转和创建任务
INSERT INTO scheduled_tasks (
  id,
  name,
  description,
  script_type,
  script_path,
  cron_expression,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '预算结转和创建',
  '处理过期预算结转，创建新月份预算，清理过期历史记录',
  'internal',
  'budget-rollover-and-creation',
  '0 2 1 * *',
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 7. 数据库备份任务
INSERT INTO scheduled_tasks (
  id,
  name,
  description,
  script_type,
  script_path,
  cron_expression,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '数据库备份',
  '备份PostgreSQL数据库到WebDAV服务器',
  'internal',
  'database-backup',
  '0 3 * * *',
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 8. S3对象存储备份任务
INSERT INTO scheduled_tasks (
  id,
  name,
  description,
  script_type,
  script_path,
  cron_expression,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'S3对象存储备份',
  '备份S3对象存储文件到WebDAV服务器（支持增量备份）',
  'internal',
  's3-backup',
  '0 4 * * *',
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 添加WebDAV备份配置
INSERT INTO system_configs (
  id,
  config_key,
  config_value,
  description,
  is_public,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'webdav_backup',
  '{
    "enabled": false,
    "url": "",
    "username": "",
    "password": "",
    "basePath": "/zhiweijz-backups",
    "description": "WebDAV备份服务配置"
  }'::jsonb,
  'WebDAV备份服务配置，用于数据库和S3文件备份',
  false,
  NOW(),
  NOW()
) ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- 提交事务
COMMIT;

-- 显示创建结果
DO $$
DECLARE
    task_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO task_count FROM scheduled_tasks WHERE script_type = 'internal';

    RAISE NOTICE '';
    RAISE NOTICE '=== 内部定时任务迁移完成 ===';
    RAISE NOTICE '已添加内部任务数: %', task_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 数据库迁移成功完成';
    RAISE NOTICE '提示：所有任务默认禁用，请在管理界面启用需要的任务';
END $$;

