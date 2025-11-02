-- =====================================================
-- 修复内部计划任务显示问题（修复版本）
-- =====================================================
-- 版本: 1.8.10
-- 功能：
-- 1. 诊断当前数据库状态
-- 2. 修复数据不一致问题
-- 3. 确保所有内部任务正确创建和启用
--
-- 创建时间: 2025-11-02
-- 修复时间: 2025-11-02 (修复ON CONFLICT问题)
-- 问题原因: Docker环境中迁移执行顺序问题导致任务状态不正确
-- =====================================================

-- 开始事务
BEGIN;

-- 设置时区为北京时间
SET timezone = 'Asia/Shanghai';

-- 创建临时函数来安全插入或更新任务
CREATE OR REPLACE FUNCTION ensure_internal_task(
    p_name TEXT,
    p_description TEXT,
    p_script_path TEXT,
    p_cron_expression TEXT,
    p_should_be_enabled BOOLEAN
) RETURNS VOID AS $$
DECLARE
    existing_task RECORD;
BEGIN
    -- 检查任务是否已存在
    SELECT * INTO existing_task
    FROM scheduled_tasks
    WHERE script_type = 'internal' AND script_path = p_script_path;

    IF existing_task IS NULL THEN
        -- 任务不存在，插入新任务
        INSERT INTO scheduled_tasks (
            name,
            description,
            script_type,
            script_path,
            cron_expression,
            is_enabled
        ) VALUES (
            p_name,
            p_description,
            'internal',
            p_script_path,
            p_cron_expression,
            p_should_be_enabled
        );
        RAISE NOTICE '✅ 创建新内部任务: % (%)', p_name, p_script_path;
    ELSE
        -- 任务存在，更新状态
        UPDATE scheduled_tasks
        SET
            name = p_name,
            description = p_description,
            cron_expression = p_cron_expression,
            is_enabled = p_should_be_enabled,
            updated_at = NOW()
        WHERE id = existing_task.id;

        IF p_should_be_enabled THEN
            RAISE NOTICE '✅ 更新并启用内部任务: % (%)', p_name, p_script_path;
        ELSE
            RAISE NOTICE '⚠️ 更新但禁用内部任务: % (%)', p_name, p_script_path;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 确保所有8个内部任务都存在并设置正确的启用状态

-- 1. 用户注销请求处理任务（启用）
SELECT ensure_internal_task(
    '用户注销请求处理',
    '检查并处理过期的用户注销请求，自动删除到期用户数据',
    'user-deletion-check',
    '0 0 * * *',
    true
);

-- 2. 会员到期检查任务（启用）
SELECT ensure_internal_task(
    '会员到期检查',
    '检查并处理到期会员，自动降级会员等级',
    'membership-expiry-check',
    '30 * * * *',
    true
);

-- 3. 微信媒体文件清理任务（启用）
SELECT ensure_internal_task(
    '微信媒体文件清理',
    '清理超过1小时的微信临时媒体文件',
    'wechat-media-cleanup',
    '0 * * * *',
    true
);

-- 4. 数据聚合任务（手动执行）（启用）
SELECT ensure_internal_task(
    '数据聚合（手动执行）',
    '手动执行数据聚合，包含每小时和每日聚合任务',
    'data-aggregation-manual',
    '0 * * * *',
    true
);

-- 5. 对象存储临时文件清理任务（启用）
SELECT ensure_internal_task(
    '对象存储临时文件清理',
    '清理对象存储中的过期临时文件',
    'storage-temp-files-cleanup',
    '0 2 * * *',
    true
);

-- 6. 预算结转和创建任务（启用）
SELECT ensure_internal_task(
    '预算结转和创建',
    '处理过期预算结转，创建新月份预算，清理过期历史记录',
    'budget-rollover-and-creation',
    '0 2 1 * *',
    true
);

-- 7. 数据库备份任务（禁用 - 需要WebDAV配置）
SELECT ensure_internal_task(
    '数据库备份',
    '备份PostgreSQL数据库到WebDAV服务器',
    'database-backup',
    '0 3 * * *',
    false
);

-- 8. S3对象存储备份任务（禁用 - 需要WebDAV配置）
SELECT ensure_internal_task(
    'S3对象存储备份',
    '备份S3对象存储文件到WebDAV服务器（支持增量备份，每周自动全备）',
    's3-backup',
    '0 4 * * *',
    false
);

-- 删除临时函数
DROP FUNCTION ensure_internal_task(TEXT, TEXT, TEXT, TEXT, BOOLEAN);

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
    RAISE NOTICE '   1. 使用存储过程确保任务存在';
    RAISE NOTICE '   2. 强制更新6个默认任务为启用状态';
    RAISE NOTICE '   3. 保持2个备份任务为禁用状态';
    RAISE NOTICE '';
    RAISE NOTICE '💡 问题已修复：Docker环境中的迁移执行顺序问题已解决';
    RAISE NOTICE '   请重启后端服务以重新加载计划任务';
    RAISE NOTICE '   重启后应该能看到8个内部任务，其中6个已启用';
    RAISE NOTICE '================================================';
END $$;