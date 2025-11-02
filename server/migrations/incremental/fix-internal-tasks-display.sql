-- =====================================================
-- 诊断和修复内部计划任务显示问题
-- =====================================================
-- 版本: 1.8.9
-- 功能：
-- 1. 诊断当前数据库状态
-- 2. 修复数据不一致问题
-- 3. 确保所有内部任务正确创建和启用
--
-- 创建时间: 2025-11-02
-- 问题：Docker环境中迁移显示成功但任务数据缺失
-- =====================================================

-- 开始事务
BEGIN;

-- 设置时区为北京时间
SET timezone = 'Asia/Shanghai';

-- 创建临时表存储诊断结果
CREATE TEMP TABLE IF NOT EXISTS task_diagnosis AS
SELECT
    'internal_tasks_count' as metric,
    COUNT(*)::TEXT as value,
    '内部任务总数' as description
FROM scheduled_tasks
WHERE script_type = 'internal'

UNION ALL

SELECT
    'enabled_tasks_count' as metric,
    COUNT(*)::TEXT as value,
    '已启用的内部任务数' as description
FROM scheduled_tasks
WHERE script_type = 'internal' AND is_enabled = true

UNION ALL

SELECT
    'disabled_tasks_count' as metric,
    COUNT(*)::TEXT as value,
    '已禁用的内部任务数' as description
FROM scheduled_tasks
WHERE script_type = 'internal' AND is_enabled = false

UNION ALL

SELECT
    'total_tasks_count' as metric,
    COUNT(*)::TEXT as value,
    '计划任务总数' as description
FROM scheduled_tasks;

-- 显示诊断结果
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '🔍 计划任务数据库诊断报告';
    RAISE NOTICE '================================================';

    FOR rec IN SELECT * FROM task_diagnosis ORDER BY metric LOOP
        RAISE NOTICE '%: % (%)', rec.description, rec.value, rec.metric;
    END LOOP;

    RAISE NOTICE '';
END $$;

-- 1. 首先删除可能存在的重复内部任务（防止数据不一致）
DELETE FROM scheduled_tasks
WHERE script_type = 'internal'
AND id NOT IN (
    SELECT DISTINCT ON (script_path) id
    FROM scheduled_tasks
    WHERE script_type = 'internal'
    ORDER BY script_path, created_at DESC
);

-- 2. 使用 UPSERT 逻辑确保所有8个内部任务都存在

-- 用户注销请求处理任务
INSERT INTO scheduled_tasks (
    id, name, description, script_type, script_path, cron_expression, is_enabled, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '用户注销请求处理',
    '检查并处理过期的用户注销请求，自动删除到期用户数据',
    'internal',
    'user-deletion-check',
    '0 0 * * *',
    true,
    NOW(),
    NOW()
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cron_expression = EXCLUDED.cron_expression,
    is_enabled = true,
    updated_at = NOW();

-- 会员到期检查任务
INSERT INTO scheduled_tasks (
    id, name, description, script_type, script_path, cron_expression, is_enabled, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '会员到期检查',
    '检查并处理到期会员，自动降级会员等级',
    'internal',
    'membership-expiry-check',
    '30 * * * *',
    true,
    NOW(),
    NOW()
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cron_expression = EXCLUDED.cron_expression,
    is_enabled = true,
    updated_at = NOW();

-- 微信媒体文件清理任务
INSERT INTO scheduled_tasks (
    id, name, description, script_type, script_path, cron_expression, is_enabled, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '微信媒体文件清理',
    '清理超过1小时的微信临时媒体文件',
    'internal',
    'wechat-media-cleanup',
    '0 * * * *',
    true,
    NOW(),
    NOW()
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cron_expression = EXCLUDED.cron_expression,
    is_enabled = true,
    updated_at = NOW();

-- 数据聚合任务（手动执行）
INSERT INTO scheduled_tasks (
    id, name, description, script_type, script_path, cron_expression, is_enabled, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '数据聚合（手动执行）',
    '手动执行数据聚合，包含每小时和每日聚合任务',
    'internal',
    'data-aggregation-manual',
    '0 * * * *',
    true,
    NOW(),
    NOW()
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cron_expression = EXCLUDED.cron_expression,
    is_enabled = true,
    updated_at = NOW();

-- 对象存储临时文件清理任务
INSERT INTO scheduled_tasks (
    id, name, description, script_type, script_path, cron_expression, is_enabled, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '对象存储临时文件清理',
    '清理对象存储中的过期临时文件',
    'internal',
    'storage-temp-files-cleanup',
    '0 2 * * *',
    true,
    NOW(),
    NOW()
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cron_expression = EXCLUDED.cron_expression,
    is_enabled = true,
    updated_at = NOW();

-- 预算结转和创建任务
INSERT INTO scheduled_tasks (
    id, name, description, script_type, script_path, cron_expression, is_enabled, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '预算结转和创建',
    '处理过期预算结转，创建新月份预算，清理过期历史记录',
    'internal',
    'budget-rollover-and-creation',
    '0 2 1 * *',
    true,
    NOW(),
    NOW()
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cron_expression = EXCLUDED.cron_expression,
    is_enabled = true,
    updated_at = NOW();

-- 数据库备份任务（保持禁用）
INSERT INTO scheduled_tasks (
    id, name, description, script_type, script_path, cron_expression, is_enabled, created_at, updated_at
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
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cron_expression = EXCLUDED.cron_expression,
    is_enabled = false,
    updated_at = NOW();

-- S3对象存储备份任务（保持禁用）
INSERT INTO scheduled_tasks (
    id, name, description, script_type, script_path, cron_expression, is_enabled, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'S3对象存储备份',
    '备份S3对象存储文件到WebDAV服务器（支持增量备份，每周自动全备）',
    'internal',
    's3-backup',
    '0 4 * * *',
    false,
    NOW(),
    NOW()
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cron_expression = EXCLUDED.cron_expression,
    is_enabled = false,
    updated_at = NOW();

-- 提交事务
COMMIT;

-- 显示修复后的最终状态
DO $$
DECLARE
    total_tasks INTEGER;
    enabled_tasks INTEGER;
    disabled_tasks INTEGER;
    rec RECORD;
BEGIN
    -- 获取最新的统计数据
    SELECT COUNT(*) INTO total_tasks
    FROM scheduled_tasks
    WHERE script_type = 'internal';

    SELECT COUNT(*) INTO enabled_tasks
    FROM scheduled_tasks
    WHERE script_type = 'internal' AND is_enabled = true;

    disabled_tasks := total_tasks - enabled_tasks;

    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ 修复完成 - 最终状态报告';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 修复后统计:';
    RAISE NOTICE '   内部任务总数: %', total_tasks;
    RAISE NOTICE '   已启用任务数: %', enabled_tasks;
    RAISE NOTICE '   已禁用任务数: %', disabled_tasks;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 已启用的6个任务:';

    FOR rec IN
        SELECT name, script_path, cron_expression
        FROM scheduled_tasks
        WHERE script_type = 'internal' AND is_enabled = true
        ORDER BY script_path
    LOOP
        RAISE NOTICE '   • % (%) - %', rec.name, rec.script_path, rec.cron_expression;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '⚠️  保持禁用的2个任务:';

    FOR rec IN
        SELECT name, script_path, cron_expression
        FROM scheduled_tasks
        WHERE script_type = 'internal' AND is_enabled = false
        ORDER BY script_path
    LOOP
        RAISE NOTICE '   • % (%) - %', rec.name, rec.script_path, rec.cron_expression;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '🎯 解决方案:';
    RAISE NOTICE '   1. 使用 UPSERT 逻辑确保任务存在';
    RAISE NOTICE '   2. 强制更新6个默认任务为启用状态';
    RAISE NOTICE '   3. 保持2个备份任务为禁用状态';
    RAISE NOTICE '';
    RAISE NOTICE '💡 下一步:';
    RAISE NOTICE '   请重启后端服务以重新加载计划任务';
    RAISE NOTICE '   重启后应该能看到8个内部任务，其中6个已启用';
    RAISE NOTICE '================================================';
END $$;

-- 删除临时表
DROP TABLE IF EXISTS task_diagnosis;