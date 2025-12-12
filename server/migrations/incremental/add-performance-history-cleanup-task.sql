-- =====================================================
-- 添加性能历史记录清理任务
-- =====================================================
-- 版本: 1.9.1
-- 功能：添加定时清理性能历史数据的内部任务
-- 创建时间: 2025-12-12
-- 背景：生产环境数据库中性能历史记录占据90%空间，需要定期清理
-- =====================================================

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

-- 添加性能历史记录清理任务（启用）
SELECT ensure_internal_task(
    '性能历史记录清理',
    '清理30天之前的性能历史数据，释放数据库空间',
    'performance-history-cleanup',
    '0 1 * * *',
    true
);

-- 删除临时函数
DROP FUNCTION ensure_internal_task(TEXT, TEXT, TEXT, TEXT, BOOLEAN);

COMMIT;

-- 显示添加结果
DO $$
DECLARE
    task_record RECORD;
    total_internal_tasks INTEGER;
    enabled_internal_tasks INTEGER;
BEGIN
    -- 获取刚创建/更新的任务信息
    SELECT * INTO task_record
    FROM scheduled_tasks
    WHERE script_type = 'internal' AND script_path = 'performance-history-cleanup';

    -- 获取内部任务统计
    SELECT COUNT(*) INTO total_internal_tasks
    FROM scheduled_tasks
    WHERE script_type = 'internal';

    SELECT COUNT(*) INTO enabled_internal_tasks
    FROM scheduled_tasks
    WHERE script_type = 'internal' AND is_enabled = true;

    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ 性能历史记录清理任务添加完成';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 任务信息:';
    RAISE NOTICE '   任务ID: %', task_record.id;
    RAISE NOTICE '   任务名称: %', task_record.name;
    RAISE NOTICE '   任务Key: %', task_record.script_path;
    RAISE NOTICE '   Cron表达式: % (每天凌晨1点执行)', task_record.cron_expression;
    RAISE NOTICE '   启用状态: %', CASE WHEN task_record.is_enabled THEN '已启用' ELSE '已禁用' END;
    RAISE NOTICE '';
    RAISE NOTICE '📊 内部任务统计:';
    RAISE NOTICE '   内部任务总数: %', total_internal_tasks;
    RAISE NOTICE '   已启用任务数: %', enabled_internal_tasks;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 功能说明:';
    RAISE NOTICE '   • 每天凌晨1点自动执行';
    RAISE NOTICE '   • 清理30天之前的性能历史数据';
    RAISE NOTICE '   • 释放数据库存储空间';
    RAISE NOTICE '   • 提升数据库查询和备份性能';
    RAISE NOTICE '';
    RAISE NOTICE '💡 使用提示:';
    RAISE NOTICE '   • 任务已自动启用，无需手动配置';
    RAISE NOTICE '   • 可在管理后台的"计划任务"中查看执行日志';
    RAISE NOTICE '   • 如需立即执行，可在管理后台手动触发';
    RAISE NOTICE '   • 数据保留期在系统配置中可调整（默认30天）';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  注意事项:';
    RAISE NOTICE '   • 请重启后端服务以加载新任务';
    RAISE NOTICE '   • 首次执行可能需要较长时间（取决于历史数据量）';
    RAISE NOTICE '   • 建议在业务低峰期观察首次执行情况';
    RAISE NOTICE '================================================';
END $$;
