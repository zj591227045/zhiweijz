-- =====================================================
-- 添加LLM提供商健康检查计划任务
-- =====================================================
-- 版本: 1.9.0
-- 功能：
-- 1. 添加LLM提供商健康检查内部任务
-- 2. 支持统一调度器模式下的健康检查管理
--
-- 创建时间: 2024-12-12
-- 问题：统一调度器模式下LLM健康检查任务缺失
-- 相关文档：docs/20251212-LLM健康检查统一调度器迁移.md
-- =====================================================

-- 开始事务
BEGIN;

-- 设置时区为北京时间
SET timezone = 'Asia/Shanghai';

-- 显示迁移开始信息
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '🔧 开始迁移: 添加LLM健康检查任务';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
END $$;

-- 检查任务是否已存在
DO $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM scheduled_tasks 
        WHERE script_type = 'internal' 
        AND script_path = 'llm-provider-health-check'
    ) INTO task_exists;

    IF task_exists THEN
        RAISE NOTICE '⚠️  LLM健康检查任务已存在，将更新配置';
    ELSE
        RAISE NOTICE '✨ LLM健康检查任务不存在，将创建新任务';
    END IF;
END $$;

-- 使用 UPSERT 逻辑添加或更新LLM健康检查任务
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
    'LLM提供商健康检查',
    '检查所有LLM提供商的健康状态，更新可用性信息',
    'internal',
    'llm-provider-health-check',
    '*/5 * * * *',  -- 每5分钟执行一次
    true,
    NOW(),
    NOW()
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cron_expression = EXCLUDED.cron_expression,
    is_enabled = true,
    updated_at = NOW();

-- 提交事务
COMMIT;

-- 显示迁移完成信息
DO $$
DECLARE
    task_record RECORD;
    total_internal_tasks INTEGER;
    enabled_internal_tasks INTEGER;
BEGIN
    -- 获取刚创建/更新的任务信息
    SELECT * INTO task_record
    FROM scheduled_tasks
    WHERE script_type = 'internal' 
    AND script_path = 'llm-provider-health-check';

    -- 获取内部任务统计
    SELECT COUNT(*) INTO total_internal_tasks
    FROM scheduled_tasks
    WHERE script_type = 'internal';

    SELECT COUNT(*) INTO enabled_internal_tasks
    FROM scheduled_tasks
    WHERE script_type = 'internal' AND is_enabled = true;

    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ 迁移完成 - LLM健康检查任务';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 任务详情:';
    RAISE NOTICE '   任务名称: %', task_record.name;
    RAISE NOTICE '   脚本路径: %', task_record.script_path;
    RAISE NOTICE '   Cron表达式: % (每5分钟)', task_record.cron_expression;
    RAISE NOTICE '   启用状态: %', CASE WHEN task_record.is_enabled THEN '✓ 已启用' ELSE '✗ 已禁用' END;
    RAISE NOTICE '   创建时间: %', task_record.created_at;
    RAISE NOTICE '   更新时间: %', task_record.updated_at;
    RAISE NOTICE '';
    RAISE NOTICE '📊 内部任务统计:';
    RAISE NOTICE '   内部任务总数: %', total_internal_tasks;
    RAISE NOTICE '   已启用任务数: %', enabled_internal_tasks;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 功能说明:';
    RAISE NOTICE '   • 统一调度器模式下，LLM健康检查由计划任务管理';
    RAISE NOTICE '   • 每5分钟自动检查所有LLM提供商的健康状态';
    RAISE NOTICE '   • 自动更新提供商可用性信息到数据库';
    RAISE NOTICE '';
    RAISE NOTICE '💡 下一步:';
    RAISE NOTICE '   1. 确保环境变量 USE_UNIFIED_SCHEDULER=true';
    RAISE NOTICE '   2. 重启后端服务以加载新任务';
    RAISE NOTICE '   3. 查看日志确认任务正常执行';
    RAISE NOTICE '';
    RAISE NOTICE '📚 相关文档:';
    RAISE NOTICE '   docs/20251212-LLM健康检查统一调度器迁移.md';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
END $$;
